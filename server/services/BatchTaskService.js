import { getDatabase } from '../database.js';
import BatchScreenshotService from './BatchScreenshotService.js';
import PlaywrightAuthService from './PlaywrightAuthService.js';

/**
 * 批量任务管理服务
 * 负责创建、执行和管理批量截图任务
 */
class BatchTaskService {
    constructor() {
        this.db = getDatabase();
        this.authService = new PlaywrightAuthService();
        this.batchScreenshotService = new BatchScreenshotService(this.authService);
        this.runningTasks = new Map(); // 存储正在运行的任务

        // 初始化批量任务表
        this.initializeTable();
    }

    /**
     * 初始化批量任务表
     */
    initializeTable() {
        const createTableSQL = `
      CREATE TABLE IF NOT EXISTS batch_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        urls TEXT NOT NULL,
        domain TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        total INTEGER NOT NULL,
        success INTEGER DEFAULT 0,
        failed INTEGER DEFAULT 0,
        duration REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        started_at DATETIME,
        completed_at DATETIME,
        results TEXT,
        error_message TEXT
      )
    `;

        this.db.exec(createTableSQL);
        this.db.exec('CREATE INDEX IF NOT EXISTS idx_batch_tasks_status ON batch_tasks(status)');
        this.db.exec('CREATE INDEX IF NOT EXISTS idx_batch_tasks_created_at ON batch_tasks(created_at DESC)');

        console.log('✅ 批量任务表初始化完成');
    }

    /**
     * 创建批量任务
     * @param {string} name - 任务名称
     * @param {Array<string>} urls - URL 列表
     * @param {string|null} domain - 登录域名（可选）
     * @param {Object} options - 截图选项
     * @returns {number} 任务 ID
     */
    createTask(name, urls, domain = null, options = {}) {
        const stmt = this.db.prepare(`
      INSERT INTO batch_tasks (name, urls, domain, total, status)
      VALUES (?, ?, ?, ?, 'pending')
    `);

        const result = stmt.run(
            name,
            JSON.stringify(urls),
            domain,
            urls.length
        );

        console.log(`📋 创建批量任务: ${name} (ID: ${result.lastInsertRowid})`);
        return result.lastInsertRowid;
    }

    /**
     * 启动批量任务
     * @param {number} taskId - 任务 ID
     * @param {Function} onProgress - 进度回调函数
     */
    async startTask(taskId, onProgress = null) {
        // 检查任务是否已在运行
        if (this.runningTasks.has(taskId)) {
            throw new Error(`任务 ${taskId} 已在运行中`);
        }

        // 获取任务信息
        const task = this.getTask(taskId);
        if (!task) {
            throw new Error(`任务 ${taskId} 不存在`);
        }

        if (task.status !== 'pending') {
            throw new Error(`任务 ${taskId} 状态不是 pending，无法启动`);
        }

        // 更新状态为 running
        this.updateTaskStatus(taskId, 'running');

        // 标记为运行中
        this.runningTasks.set(taskId, true);

        // 异步执行任务
        this.executeTask(taskId, onProgress).catch(error => {
            console.error(`任务 ${taskId} 执行失败:`, error);
            this.updateTaskStatus(taskId, 'failed', error.message);
        }).finally(() => {
            this.runningTasks.delete(taskId);
        });

        console.log(`🚀 启动批量任务: ${taskId}`);
    }

    /**
     * 执行批量任务
     * @param {number} taskId - 任务 ID
     * @param {Function} onProgress - 进度回调函数
     */
    async executeTask(taskId, onProgress = null) {
        const task = this.getTask(taskId);
        const urls = JSON.parse(task.urls);
        const startTime = Date.now();

        try {
            // 执行批量截图
            const result = await this.batchScreenshotService.batchScreenshot(
                urls,
                task.domain,
                {
                    headless: true,
                    fullPage: true,
                    onProgress: (current, total, currentUrl) => {
                        // 更新进度
                        this.updateTaskProgress(taskId, current, total);

                        // 调用外部进度回调
                        if (onProgress) {
                            onProgress(taskId, {
                                current,
                                total,
                                progress: Math.round((current / total) * 100),
                                currentUrl
                            });
                        }
                    }
                }
            );

            const duration = (Date.now() - startTime) / 1000;

            // 更新任务结果
            const stmt = this.db.prepare(`
        UPDATE batch_tasks 
        SET status = 'completed',
            success = ?,
            failed = ?,
            duration = ?,
            results = ?,
            completed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

            stmt.run(
                result.success,
                result.failed,
                duration,
                JSON.stringify(result.results),
                taskId
            );

            console.log(`✅ 任务 ${taskId} 完成: 成功 ${result.success}/${result.total}`);

            // 调用完成回调
            if (onProgress) {
                onProgress(taskId, {
                    status: 'completed',
                    ...result
                });
            }
        } catch (error) {
            console.error(`❌ 任务 ${taskId} 失败:`, error);
            this.updateTaskStatus(taskId, 'failed', error.message);
            throw error;
        }
    }

    /**
     * 更新任务状态
     * @param {number} taskId - 任务 ID
     * @param {string} status - 状态
     * @param {string} errorMessage - 错误信息（可选）
     */
    updateTaskStatus(taskId, status, errorMessage = null) {
        const updates = ['status = ?'];
        const values = [status];

        if (status === 'running') {
            updates.push('started_at = CURRENT_TIMESTAMP');
        } else if (status === 'completed' || status === 'failed') {
            updates.push('completed_at = CURRENT_TIMESTAMP');
        }

        if (errorMessage) {
            updates.push('error_message = ?');
            values.push(errorMessage);
        }

        values.push(taskId);

        const stmt = this.db.prepare(`
      UPDATE batch_tasks 
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

        stmt.run(...values);
    }

    /**
     * 更新任务进度
     * @param {number} taskId - 任务 ID
     * @param {number} success - 成功数
     * @param {number} total - 总数
     */
    updateTaskProgress(taskId, success, total) {
        const stmt = this.db.prepare(`
      UPDATE batch_tasks 
      SET success = ?
      WHERE id = ?
    `);

        stmt.run(success, taskId);
    }

    /**
     * 获取任务详情
     * @param {number} taskId - 任务 ID
     * @returns {Object|null} 任务信息
     */
    getTask(taskId) {
        const stmt = this.db.prepare('SELECT * FROM batch_tasks WHERE id = ?');
        const row = stmt.get(taskId);

        if (!row) {
            return null;
        }

        return this.parseTaskRow(row);
    }

    /**
     * 获取任务列表
     * @param {Object} options - 查询选项
     * @returns {Array} 任务列表
     */
    getTaskList(options = {}) {
        const {
            status = null,
            limit = 20,
            offset = 0
        } = options;

        let sql = 'SELECT * FROM batch_tasks';
        const params = [];

        if (status) {
            sql += ' WHERE status = ?';
            params.push(status);
        }

        sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const stmt = this.db.prepare(sql);
        const rows = stmt.all(...params);

        return rows.map(row => this.parseTaskRow(row));
    }

    /**
     * 获取任务总数
     * @param {string|null} status - 状态过滤
     * @returns {number} 总数
     */
    getTaskCount(status = null) {
        let sql = 'SELECT COUNT(*) as count FROM batch_tasks';
        const params = [];

        if (status) {
            sql += ' WHERE status = ?';
            params.push(status);
        }

        const stmt = this.db.prepare(sql);
        const result = stmt.get(...params);

        return result.count;
    }

    /**
     * 删除任务
     * @param {number} taskId - 任务 ID
     */
    deleteTask(taskId) {
        // 检查任务是否正在运行
        if (this.runningTasks.has(taskId)) {
            throw new Error(`任务 ${taskId} 正在运行中，无法删除`);
        }

        const stmt = this.db.prepare('DELETE FROM batch_tasks WHERE id = ?');
        const result = stmt.run(taskId);

        if (result.changes === 0) {
            throw new Error(`任务 ${taskId} 不存在`);
        }

        console.log(`🗑️  删除任务: ${taskId}`);
    }

    /**
     * 解析数据库行为任务对象
     * @param {Object} row - 数据库行
     * @returns {Object} 任务对象
     */
    parseTaskRow(row) {
        return {
            id: row.id,
            name: row.name,
            urls: JSON.parse(row.urls),
            domain: row.domain,
            status: row.status,
            total: row.total,
            success: row.success,
            failed: row.failed,
            duration: row.duration,
            progress: row.total > 0 ? Math.round((row.success / row.total) * 100) : 0,
            createdAt: row.created_at,
            startedAt: row.started_at,
            completedAt: row.completed_at,
            results: row.results ? JSON.parse(row.results) : null,
            errorMessage: row.error_message
        };
    }
}

export default BatchTaskService;
