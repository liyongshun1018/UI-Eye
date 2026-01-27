import { BatchTask } from '../models/BatchTask.js';

/**
 * IBatchTaskRepository - 批量任务仓储接口
 * 职责：定义与批量任务相关的持久化操作协议
 */
export interface IBatchTaskRepository {
    /** 创建任务 */
    create(task: Partial<BatchTask>): number;

    /** 更新任务元数据或状态 */
    update(id: number, data: Partial<BatchTask>): void;

    /** 获取任务详情 */
    findById(id: number): BatchTask | null;

    /** 获取分页列表 */
    findAll(limit?: number, offset?: number, status?: string): BatchTask[];

    /** 删除任务及其元数据 */
    deleteById(id: number): void;

    /** 获取符合条件的任务总数 */
    getCount(status?: string | null): number;

    // --- 批量子项 (BatchTaskItem) 辅助操作 ---

    /** 获取指定任务下的所有子 URL 审计状态 */
    findItemsByTaskId(taskId: number): any[];

    /** 更新特定子项的状态与结果摘要 */
    updateItem(taskId: number, url: string, data: any): void;
}

