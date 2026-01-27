import { IBatchTaskRepository } from '../../domain/repositories/IBatchTaskRepository.js';
import { RunCompareUseCase } from './RunCompareUseCase.js';
import wsServer from '../../infrastructure/ws/WSServer.js';
import pLimit from 'p-limit';
import { BatchTask } from '../../domain/models/BatchTask.js';

export class ManageBatchTasksUseCase {
    private limit = pLimit(3);

    constructor(
        private batchRepo: IBatchTaskRepository,
        private runCompareUseCase: RunCompareUseCase
    ) { }

    async createTask(data: Partial<BatchTask>): Promise<number> {
        return this.batchRepo.create(data);
    }

    async startBatch(taskId: number): Promise<void> {
        console.log(`[批量任务] startBatch 被调用: taskId=${taskId}`);
        const task = this.batchRepo.findById(taskId);
        if (!task) throw new Error('任务不存在');

        // 记录开始时间，解决耗时统计不正确问题
        const startTime = Math.floor(Date.now() / 1000);
        this.batchRepo.update(taskId, {
            status: 'running',
            startedAt: startTime,
            currentPhase: 'screenshot',
            stepText: '🔄 正在准备子任务队列...'
        } as any);

        wsServer.broadcastTaskUpdate(taskId, 'task:started', {
            taskId,
            phase: 'screenshot',
            stepText: '🔄 正在准备子任务队列...'
        });

        // 执行队列
        const jobs = task.urls.map((url, index) => {
            return this.limit(async () => {
                // [关键修复] 子项开始即推送初始进度，参考重构前的逻辑
                const initialProgress = Math.round((index / task.total) * 100);
                wsServer.broadcastTaskUpdate(taskId, 'task:progress', {
                    current: index,
                    total: task.total,
                    currentUrl: url,
                    phase: 'screenshot',
                    progress: initialProgress,
                    stepText: `📸 正在解析页面 (${index + 1}/${task.total}): ${url}`
                });

                const config = {
                    url,
                    designSource: task.compareConfig?.designSource || (task as any).designSource,
                    aiModel: task.aiModel
                };

                try {
                    const result = await this.runCompareUseCase.execute(
                        `batch-${taskId}-${index}`,
                        config,
                        // 进度回调：将单个任务的内部进度广播给前端
                        (subProgress: number, subStepText: string) => {
                            // 计算整体进度：基础进度 + 当前子任务的内部进度贡献
                            const baseProgress = Math.round((index / task.total) * 100);
                            const subProgressContribution = Math.round((subProgress / 100) * (100 / task.total));
                            const totalProgress = Math.min(baseProgress + subProgressContribution, 99);

                            wsServer.broadcastTaskUpdate(taskId, 'task:progress', {
                                current: index,
                                total: task.total,
                                currentUrl: url,
                                phase: 'screenshot',
                                progress: totalProgress,
                                stepText: subStepText
                            });
                        }
                    );

                    // 1. 持久化子项结果：核心包含指标回写
                    this.batchRepo.updateItem(taskId, url, {
                        status: 'completed',
                        reportId: result.id,
                        screenshotPath: result.images?.actual,
                        similarity: result.similarity,
                        diffCount: result.diffRegions?.length || 0
                    });

                    // 2. 聚合统计
                    const currentTask = this.batchRepo.findById(taskId)!;
                    const items = this.batchRepo.findItemsByTaskId(taskId);
                    const completedItems = items.filter(i => i.status === 'completed' || (i.similarity !== undefined && i.similarity !== null));

                    const newSuccess = completedItems.length;
                    const stepText = `📸 已完成 ${newSuccess}/${task.total} 个页面的视觉审计`;

                    const totalSim = completedItems.reduce((sum, i) => sum + (Number(i.similarity) || 0), 0);
                    const avgSimilarity = completedItems.length > 0 ? Number((totalSim / completedItems.length).toFixed(2)) : 0;
                    const totalDiffCount = completedItems.reduce((sum, i) => sum + (Number(i.diffCount) || Number(i.diff_count) || 0), 0);

                    console.log(`[批量任务] ${taskId} 聚合快照: success=${newSuccess}, avgSim=${avgSimilarity}, totalDiff=${totalDiffCount}, totalItems=${items.length}`);

                    this.batchRepo.update(taskId, {
                        success: newSuccess,
                        progress: Math.round((newSuccess / task.total) * 100),
                        stepText,
                        avgSimilarity,
                        totalDiffCount
                    } as any);

                    // 3. 多端推送
                    const currentDuration = Math.floor(Date.now() / 1000) - (currentTask.startedAt || startTime);
                    const currentProgress = Math.round((newSuccess / task.total) * 100);

                    wsServer.broadcastTaskUpdate(taskId, 'task:progress', {
                        current: newSuccess,
                        total: task.total,
                        currentUrl: url,
                        phase: newSuccess === task.total ? 'finish' : 'compare',
                        progress: currentProgress,
                        stepText,
                        avgSimilarity,
                        totalDiffCount,
                        duration: currentDuration,
                        lastResult: {
                            url,
                            status: 'completed',
                            reportId: result.id,
                            similarity: result.similarity,
                            diffCount: result.diffRegions?.length || 0,
                            screenshotPath: result.images?.actual,
                            success: true
                        }
                    });
                } catch (error: any) {
                    console.error(`[批量原子任务失败] ${url}:`, error.message);

                    // 持久化失败状态
                    this.batchRepo.updateItem(taskId, url, {
                        status: 'failed',
                        error: error.message
                    });

                    const currentTask = this.batchRepo.findById(taskId)!;
                    this.batchRepo.update(taskId, { failed: currentTask.failed + 1 });

                    // 推送失败反馈
                    wsServer.broadcastTaskUpdate(taskId, 'task:progress', {
                        current: index + 1,
                        total: task.total,
                        currentUrl: url,
                        lastResult: { url, status: 'failed', error: error.message, success: false }
                    });
                }
            });
        });

        Promise.all(jobs).then(() => {
            const finalTask = this.batchRepo.findById(taskId);
            if (!finalTask) return;

            const items = this.batchRepo.findItemsByTaskId(taskId);
            const duration = Math.floor(Date.now() / 1000) - (finalTask.startedAt || startTime);

            // 更新最终状态
            this.batchRepo.update(taskId, {
                status: 'completed',
                completedAt: Math.floor(Date.now() / 1000),
                progress: 100,
                duration
            } as any);

            // 广播完整的完成数据，防止前端崩溃
            wsServer.broadcastTaskUpdate(taskId, 'task:completed', {
                taskId,
                duration,
                avgSimilarity: finalTask.avgSimilarity,
                totalDiffCount: finalTask.totalDiffCount,
                screenshot: {
                    success: finalTask.success,
                    failed: finalTask.failed,
                    results: items
                }
            });
        });
    }

    /**
     * 删除批量任务及其关联的所有子报告
     */
    deleteTask(id: number) {
        // TODO: Add logic to delete associated sub-reports if necessary
        return this.batchRepo.deleteById(id);
    }

    getTask(id: number) {
        const task = this.batchRepo.findById(id);
        if (!task) return null;

        // 核心：在获取详情时，同步拉取并挂载子项明细，确前前端刷新后数据不丢失
        const items = this.batchRepo.findItemsByTaskId(id);

        // 动态计算耗时：如果任务还在运行，实时计算当前已执行秒数
        let currentDuration = task.duration;
        if (task.status === 'running' && task.startedAt) {
            const now = Math.floor(Date.now() / 1000);
            currentDuration = now - task.startedAt;
        }

        return {
            ...task,
            duration: currentDuration,
            results: items
        };
    }

    getTaskList(limit: number, offset: number, status?: string) {
        const tasks = this.batchRepo.findAll(limit, offset, status);
        const total = this.batchRepo.getCount(status);
        return { tasks, total };
    }

    getTaskResults(taskId: number) {
        return this.batchRepo.findItemsByTaskId(taskId);
    }

    getStats() {
        return {
            total: this.batchRepo.getCount(),
            pending: this.batchRepo.getCount('pending'),
            running: this.batchRepo.getCount('running'),
            completed: this.batchRepo.getCount('completed'),
            failed: this.batchRepo.getCount('failed')
        };
    }
}
