import { Request, Response } from 'express';
import { Container } from '../infrastructure/di/Container.js';
import ResponseUtils from '../utils/ResponseUtils.js';

/**
 * BatchController - 批量任务管理控制器
 * 职责：管控大规模走查任务 (Batch Tasks) 的全生命周期，包括创建、排队启动及结果聚合
 */
export class BatchController {
    // 依赖注入：获取批量任务调度用例单例
    private batchUseCase = Container.getManageBatchTasksUseCase();

    /**
     * 创建批量任务记录
     * 场景：通常由用户通过 UI 界面粘贴多个待测 URL 后触发
     */
    async createTask(req: Request, res: Response) {
        try {
            // 解析请求体中的任务参数 (如名称、URL 列表、设计稿映射)
            const data = {
                ...req.body,
                scriptId: req.body.script_id || req.body.scriptId
            };
            const taskId = await this.batchUseCase.createTask(data);
            return ResponseUtils.success(res, { taskId }, '批量任务已成功录入');
        } catch (error: any) {
            return ResponseUtils.error(res, `创建失败: ${error.message}`);
        }
    }

    /**
     * 获取单一批量任务的状态详情 (含进度、成功/失败统计)
     */
    async getTask(req: Request, res: Response) {
        const taskId = parseInt(req.params.id as string);
        const task = this.batchUseCase.getTask(taskId);
        if (!task) return ResponseUtils.error(res, '指定的批量任务不存在', 404);
        return ResponseUtils.success(res, task);
    }

    /**
     * 获取批量任务的历史列表
     * 支持根据状态进行过滤汇总
     */
    async getTaskList(req: Request, res: Response) {
        const limit = parseInt(req.query.limit as string) || 20;
        const offset = parseInt(req.query.offset as string) || 0;
        const status = req.query.status as string;

        const result = this.batchUseCase.getTaskList(limit, offset, status);
        return ResponseUtils.success(res, result);
    }

    /**
     * 启动批量任务扫描序列
     * 特性：该方法会触发一系列并行/串行的 Playwright 截图与比对用例
     */
    async startTask(req: Request, res: Response) {
        const taskId = parseInt(req.params.id as string);

        // 异步执行批处理器，不阻塞当前 HTTP 响应
        this.batchUseCase.startBatch(taskId).catch(err => {
            console.error('[BatchController] 批量扫描启动异常:', err);
        });

        return ResponseUtils.success(res, null, '批量引擎已启动，正在后台执行...');
    }

    /**
     * 删除批量任务及其关联的所有子报告
     */
    async deleteTask(req: Request, res: Response) {
        const taskId = parseInt(req.params.id as string);
        this.batchUseCase.deleteTask(taskId);
        return ResponseUtils.success(res, null, '批量任务及其关联记录已物理删除');
    }

    /**
     * 获取批量任务的分项比对结果详情 (明细队列)
     */
    async getTaskResults(req: Request, res: Response) {
        const taskId = parseInt(req.params.id as string);
        const task = this.batchUseCase.getTask(taskId);
        if (!task) return ResponseUtils.error(res, '批量任务不存在', 404);

        const items = this.batchUseCase.getTaskResults(taskId);
        return ResponseUtils.success(res, { task, items });
    }

    /**
     * (保留位) 导出批量任务的汇总报告
     */
    async exportTaskResults(req: Request, res: Response) {
        return ResponseUtils.success(res, null, '批量导出功能正在实现中');
    }

    /**
     * (保留位) 获取高频走查站点的问题统计报表
     */
    async getStats(req: Request, res: Response) {
        const stats = this.batchUseCase.getStats();
        return ResponseUtils.success(res, stats);
    }
}
