import { IScriptRepository } from '../../domain/repositories/IScriptRepository.js';
import { Script } from '../../domain/models/Script.js';
import { getDatabase } from '../../db/connection.js';

/**
 * SqliteScriptRepository - 自动化脚本仓库实现
 * 职责：负责用户自定义 JS 脚本 (用于注入页面执行自动登录等操作) 的持久化管理
 */
export class SqliteScriptRepository implements IScriptRepository {
    /**
     * 固化一份新脚本
     */
    create(script: Partial<Script>): string {
        const db = getDatabase();
        const id = script.id || Date.now().toString(); // 自动生成唯一 ID
        const stmt = db.prepare(`
            INSERT INTO scripts (id, name, code, description)
            VALUES (?, ?, ?, ?)
        `);
        stmt.run(id, script.name, script.code, script.description || null);
        return id;
    }

    /**
     * 更新脚本逻辑或元数据
     * 特性：支持字段级增量更新，自动同步物理更新时间
     */
    update(id: string, data: Partial<Script>): boolean {
        const db = getDatabase();
        const updates: string[] = [];
        const values: any[] = [];

        if (data.name !== undefined) {
            updates.push('name = ?');
            values.push(data.name);
        }
        if (data.code !== undefined) {
            updates.push('code = ?');
            values.push(data.code);
        }
        if (data.description !== undefined) {
            updates.push('description = ?');
            values.push(data.description);
        }

        if (updates.length === 0) return true;

        // 维护更新时间戳
        updates.push('updated_at = ?');
        values.push(Math.floor(Date.now() / 1000));
        values.push(id);

        const result = db.prepare(`UPDATE scripts SET ${updates.join(', ')} WHERE id = ?`).run(...values);
        return result.changes > 0;
    }

    /**
     * 精确获取脚本代码详情
     */
    findById(id: string): Script | null {
        const db = getDatabase();
        const row = db.prepare('SELECT * FROM scripts WHERE id = ?').get(id) as any;
        return row ? this.parseRow(row) : null;
    }

    /**
     * 获取全量脚本库
     */
    findAll(): Script[] {
        const db = getDatabase();
        const rows = db.prepare('SELECT * FROM scripts ORDER BY created_at DESC').all() as any[];
        return rows.map(row => this.parseRow(row));
    }

    /**
     * 删除指定的自动化脚本
     */
    deleteById(id: string): boolean {
        const db = getDatabase();
        const result = db.prepare('DELETE FROM scripts WHERE id = ?').run(id);
        return result.changes > 0;
    }

    /**
     * 映射器：将数据库行还原为强类型的领域模型
     */
    private parseRow(row: any): Script {
        return {
            id: row.id,
            name: row.name,
            code: row.code,
            description: row.description,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
}
