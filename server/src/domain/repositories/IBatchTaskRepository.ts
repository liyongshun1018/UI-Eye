import { BatchTask } from '../models/BatchTask.js';

export interface IBatchTaskRepository {
    create(task: Partial<BatchTask>): number;
    update(id: number, data: Partial<BatchTask>): void;
    findById(id: number): BatchTask | null;
    findAll(limit?: number, offset?: number, status?: string): BatchTask[];
    deleteById(id: number): void;
    getCount(status?: string | null): number;

    // 子项管理
    findItemsByTaskId(taskId: number): any[];
    updateItem(taskId: number, url: string, data: any): void;
}
