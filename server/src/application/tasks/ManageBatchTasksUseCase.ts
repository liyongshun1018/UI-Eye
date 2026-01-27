import { IBatchTaskRepository } from '../../domain/repositories/IBatchTaskRepository.js';
import { IScriptRepository } from '../../domain/repositories/IScriptRepository.js';
import { RunCompareUseCase } from './RunCompareUseCase.js';
import wsServer from '../../infrastructure/ws/WSServer.js';
import pLimit from 'p-limit';
import { BatchTask } from '../../domain/models/BatchTask.js';

/**
 * ManageBatchTasksUseCase - 批量任务管理用例
 * 职责：管控大规模走查任务的全生命周期，包括创建、排队执行、实时进度推送及结果聚合统计
 */
export class ManageBatchTasksUseCase {
    private limit = pLimit(3); // 限制并行任务数为 3，防止浏览器进程过多导致 OOM

    constructor(
        private batchRepo: IBatchTaskRepository,
        private scriptRepo: IScriptRepository,
        private runCompareUseCase: RunCompareUseCase
    ) { }

    /**
     * 创建批量任务记录
     */
    async createTask(data: Partial<BatchTask>): Promise<number> {
        return this.batchRepo.create(data);
    }

    /**
     * 启动批量任务扫描序列
     * 流程：状态初始化 -> 子任务队列排队 -> 并行执行原子比对 -> 实时聚合统计 -> 多端通知
     */
    async startBatch(taskId: number): Promise<void> {
        console.log(`[批量任务] startBatch 被调用: taskId=${taskId}`);
        const task = this.batchRepo.findById(taskId);
        if (!task) throw new Error('任务不存在');

        // 1. 状态初始化：记录开始时间，解决耗时统计不正确问题
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

        // 2. 获取关联的交互脚本逻辑 (如果有)
        let scriptCode = '';
        if (task.scriptId) {
            const script = this.scriptRepo.findById(task.scriptId);
            if (script) {
                scriptCode = script.code;
                console.log(`[批量任务] 任务 ${taskId} 关联脚本: ${script.name}`);
            }
        }

        // 3. 构造子任务执行队列
        const jobs = task.urls.map((url, index) => {
            return this.limit(async () => {
                // [关键修复] 子项开始即推送初始进度，确保前端 UI 即时响应
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
                    // 执行原子比对用例
                    const result = await this.runCompareUseCase.execute(
                        `batch-${taskId}-${index}`,
                        config,
                        // 进度回调：将单个子任务的内部流水线进度广播给前端
                        (subProgress: number, subStepText: string) => {
                            // 计算全局宏观进度：已完成比例 + 当前子任务的微观贡献
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
                        },
                        undefined,
                        scriptCode
                    );

                    // A. 持久化子项结果：核心包含还原度指标回写
                    this.batchRepo.updateItem(taskId, url, {
                        status: 'completed',
                        reportId: result.id,
                        screenshotPath: result.images?.actual,
                        similarity: result.similarity,
                        diffCount: result.diffRegions?.length || 0
                    });

                    // B. 聚合全量统计：计算平均还原度、总差异数等
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

                    // C. 实时推送阶段性汇总结果
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

                    // 异常持久化：标记该子项失败
                    this.batchRepo.updateItem(taskId, url, {
                        status: 'failed',
                        error: error.message
                    });

                    const currentTask = this.batchRepo.findById(taskId)!;
                    this.batchRepo.update(taskId, { failed: (currentTask.failed || 0) + 1 });

                    // 推送失败反馈，通知前端展示错误态
                    wsServer.broadcastTaskUpdate(taskId, 'task:progress', {
                        current: index + 1,
                        total: task.total,
                        currentUrl: url,
                        lastResult: { url, status: 'failed', error: error.message, success: false }
                    });
                }
            });
        });

        // 3. 所有任务执行完毕后的收尾工作
        Promise.all(jobs).then(() => {
            const finalTask = this.batchRepo.findById(taskId);
            if (!finalTask) return;

            const items = this.batchRepo.findItemsByTaskId(taskId);
            const duration = Math.floor(Date.now() / 1000) - (finalTask.startedAt || startTime);

            // 更新最终生命周期状态
            this.batchRepo.update(taskId, {
                status: 'completed',
                completedAt: Math.floor(Date.now() / 1000),
                progress: 100,
                duration
            } as any);

            // 广播完整的结算数据，确保前端统计组件能够渲染最终态
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
     * 删除批量任务及其关联的所有子记录
     */
    deleteTask(id: number) {
        // 注：如有必要，此处可扩展删除子报告产生的物理图片文件
        return this.batchRepo.deleteById(id);
    }

    /**
     * 获取单一任务详情 (含子项明细与动态耗时计算)
     */
    getTask(id: number) {
        const task = this.batchRepo.findById(id);
        if (!task) return null;

        // 在获取详情时，实时同步拉取并挂载子项明细，确保前端刷新后队列状态不丢失
        const items = this.batchRepo.findItemsByTaskId(id);

        // 动态计算耗时：如果任务仍在运行中，基于开始时间实时计算秒数展现给用户
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

    /**
     * 获取历史任务列表 (支持分页与状态汇总)
     */
    getTaskList(limit: number, offset: number, status?: string) {
        const tasks = this.batchRepo.findAll(limit, offset, status);
        const total = this.batchRepo.getCount(status);
        return { tasks, total };
    }

    /**
     * 获取明细分项结果
     */
    getTaskResults(taskId: number) {
        return this.batchRepo.findItemsByTaskId(taskId);
    }

    /**
     * 获取大盘任务量化统计
     */
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

