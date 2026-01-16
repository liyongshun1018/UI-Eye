import { getDatabase } from '../database.js';

/**
 * 操作脚本服务
 * 负责自动化交互脚本的 CRUD
 */
class ScriptService {
    constructor() {
        this.db = getDatabase();
    }

    /**
     * 创建脚本
     */
    createScript(name, code, description = '') {
        const stmt = this.db.prepare(`
            INSERT INTO scripts (name, code, description)
            VALUES (?, ?, ?)
        `);
        const result = stmt.run(name, code, description);
        return result.lastInsertRowid;
    }

    /**
     * 获取单个脚本
     */
    getScript(id) {
        const script = this.db.prepare('SELECT * FROM scripts WHERE id = ?').get(id);
        return script || null;
    }

    /**
     * 获取所有脚本列表
     */
    getScripts() {
        return this.db.prepare('SELECT id, name, description, created_at FROM scripts ORDER BY id DESC').all();
    }

    /**
     * 更新脚本
     */
    updateScript(id, data) {
        const { name, code, description } = data;
        const stmt = this.db.prepare(`
            UPDATE scripts 
            SET name = ?, code = ?, description = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);
        const result = stmt.run(name, code, description, id);
        return result.changes > 0;
    }

    /**
     * 删除脚本
     */
    deleteScript(id) {
        const result = this.db.prepare('DELETE FROM scripts WHERE id = ?').run(id);
        return result.changes > 0;
    }
}

export default ScriptService;
