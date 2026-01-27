import { IBatchTaskRepository } from '../../domain/repositories/IBatchTaskRepository.js';
import { BatchTask } from '../../domain/models/BatchTask.js';
import { getDatabase } from '../../db/connection.js';

/**
 * SqliteBatchTaskRepository - 批量工程任务 SQLite 仓储实现
 * 职责：管理“兰湖走查”或“全站巡检”等大规模异步任务的持久化状态
 */
export class SqliteBatchTaskRepository implements IBatchTaskRepository {
    /**
     * 创建批量主任务及其关联的 URL 子条目
     * 事务性设计：插入主表后，自动初始化子条目表以供后续队列消费
     */
    create(task: Partial<BatchTask>): number {
        const db = getDatabase();
        const stmt = db.prepare(`
            INSERT INTO batch_tasks (name, urls, domain, status, total, design_mode, design_source, compare_config, ai_model)
            VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            task.name,
            JSON.stringify(task.urls || []), // 将目标 URL 集合序列化存储
            task.domain || null,
            task.urls?.length || 0,
            (task as any).designMode || 'single',
            (task as any).designSource || null,
            task.compareConfig ? JSON.stringify(task.compareConfig) : null,
            task.aiModel || null
        );

        const taskId = result.lastInsertRowid as number;

        // 步骤：初始化子条目，为后端的 ManageBatchTasksUseCase 准备扫描队列表
        if (task.urls) {
            const itemStmt = db.prepare(`
                INSERT INTO batch_task_items (task_id, url, design_source)
                VALUES (?, ?, ?)
            `);
            for (const url of task.urls) {
                // 如果是 matching 模式，可能包含特定的设计稿映射
                itemStmt.run(taskId, url, (task as any).urlDesignMap?.[url] || null);
            }
        }

        return taskId;
    }

    /**
     * 更新批量任务进度与统计快照
     * @param id 批量任务 ID
     * @param data 包含 success, failed, progress 等字段的增量包
     */
    update(id: number, data: Partial<BatchTask>): void {
        const db = getDatabase();
        const updates: string[] = [];
        const values: any[] = [];

        const mapping: Record<string, string> = {
            status: 'status',
            success: 'success',
            failed: 'failed',
            progress: 'progress',
            stepText: 'step_text',
            avgSimilarity: 'avg_similarity',
            totalDiffCount: 'total_diff_count',
            duration: 'duration',
            startedAt: 'started_at',
            completedAt: 'completed_at'
        };

        for (const [key, col] of Object.entries(mapping)) {
            if ((data as any)[key] !== undefined) {
                updates.push(`${col} = ?`);
                values.push((data as any)[key]);
            }
        }

        if (updates.length === 0) return;
        values.push(id);

        db.prepare(`UPDATE batch_tasks SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }

    /**
     * 精确查询特定的批量任务记录
     */
    findById(id: number): BatchTask | null {
        const db = getDatabase();
        const row = db.prepare('SELECT * FROM batch_tasks WHERE id = ?').get(id);
        if (!row) return null;
        return this.parseRow(row);
    }

    /**
     * 获取批量任务归档列表
     */
    findAll(limit = 20, offset = 0, status?: string): BatchTask[] {
        const db = getDatabase();
        let sql = 'SELECT * FROM batch_tasks';
        const params: any[] = [];

        if (status) {
            sql += ' WHERE status = ?';
            params.push(status);
        }

        sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        return db.prepare(sql).all(...params).map((row: any) => this.parseRow(row));
    }

    /**
     * 强力删除批量任务
     * 设置了级联删除：删除 batch_tasks 时会自动清除相关的 batch_task_items
     */
    deleteById(id: number): void {
        const db = getDatabase();
        db.prepare('DELETE FROM batch_tasks WHERE id = ?').run(id);
    }

    /**
     * 统计量辅助：获取当前符合条件的记录总数
     */
    getCount(status?: string | null): number {
        const db = getDatabase();
        let sql = 'SELECT COUNT(*) as count FROM batch_tasks';
        const params: any[] = [];
        if (status) {
            sql += ' WHERE status = ?';
            params.push(status);
        }
        return (db.prepare(sql).get(...params) as any).count;
    }

    /**
     * 解析器：反序列化 JSON 字段并重构 BatchTask 领域模型
     */
    private parseRow(row: any): BatchTask {
        return {
            id: row.id,
            name: row.name,
            urls: JSON.parse(row.urls || '[]'),
            domain: row.domain,
            status: row.status,
            total: row.total,
            success: row.success || 0,
            failed: row.failed || 0,
            duration: row.duration,
            createdAt: row.created_at,
            startedAt: row.started_at, // 直接存储为秒级时间戳，解决 1.7 亿秒报错
            completedAt: row.completed_at,
            avgSimilarity: row.avg_similarity || 0,
            totalDiffCount: row.total_diff_count || 0,
            progress: row.progress || 0,
            stepText: row.step_text,
            designMode: row.design_mode,
            designSource: row.design_source,
            compareConfig: row.compare_config ? JSON.parse(row.compare_config) : null,
            aiModel: row.ai_model
        };
    }

    /**
     * 获取指定批量任务下的所有子条目及其比对摘要
     * 策略：通过 JOIN reports 表，将持久化的比对结果（相似度、差异数）聚合返回
     */
    findItemsByTaskId(taskId: number): any[] {
        const db = getDatabase();
        const stmt = db.prepare(`
            SELECT 
                i.*, 
                i.similarity as similarity, 
                i.diff_count as diffCount,
                r.id as reportId
            FROM batch_task_items i
            LEFT JOIN reports r ON i.report_id = r.id
            WHERE i.task_id = ?
        `);
        return stmt.all(taskId);
    }

    /**
     * 更新子条目的状态快照 (如：关联 reportId 或记录报错)
     */
    updateItem(taskId: number, url: string, data: any): void {
        try {
            const db = getDatabase();
            const updates: string[] = [];
            const values: any[] = [];

            if (data.reportId !== undefined) {
                updates.push('report_id = ?');
                values.push(data.reportId);
            }
            if (data.status !== undefined) {
                updates.push('status = ?');
                values.push(data.status);
            }
            if (data.screenshotPath !== undefined) {
                updates.push('screenshot_path = ?');
                values.push(data.screenshotPath);
            }
            if (data.similarity !== undefined) {
                updates.push('similarity = ?');
                values.push(data.similarity);
            }
            if (data.diffCount !== undefined) {
                updates.push('diff_count = ?');
                values.push(data.diffCount);
            }
            // 兼容性映射：支持 error 或 error_message 字段
            if (data.error !== undefined) {
                // 同时尝试更新两个可能存在的列名，防止 Schema 迁移滞后导致的崩溃
                updates.push('error = ?');
                values.push(data.error);
                updates.push('error_message = ?');
                values.push(data.error);
            }

            if (updates.length === 0) return;
            values.push(taskId, url);

            db.prepare(`
                UPDATE batch_task_items 
                SET ${updates.join(', ')} 
                WHERE task_id = ? AND url = ?
            `).run(...values);
        } catch (error) {
            console.error('[仓储层] 无法更新子项状态:', error);
        }
    }
}
