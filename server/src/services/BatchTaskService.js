import { getDatabase } from '../database.js';
import BatchScreenshotService from './BatchScreenshotService.js';
import BatchCompareService from './BatchCompareService.js';
import PlaywrightAuthService from './PlaywrightAuthService.js';
import wsServer from './WSServer.js';
import ScriptService from './ScriptService.js';
import path from 'path'; // Added path import
import { fileURLToPath } from 'url'; // Added fileURLToPath import

const __filename = fileURLToPath(import.meta.url); // Added __filename definition
const __dirname = path.dirname(__filename); // Added __dirname definition

/**
 * 批量任务管理服务
 * 负责创建、执行和管理批量截图任务
 */
class BatchTaskService {
    constructor() {
        this.db = getDatabase();
        this.authService = new PlaywrightAuthService();
        this.batchScreenshotService = new BatchScreenshotService(this.authService);
        this.batchCompareService = new BatchCompareService();
        this.scriptService = new ScriptService();
        this.runningTasks = new Map(); // 存储正在运行的任务

        // 初始化批量任务表
        this.initializeTable();
    }

    /**
     * 初始化批量任务相关表结构
     */
    initializeTable() {
        // 1. 创建或更新主任务表
        const createTasksSQL = `
      CREATE TABLE IF NOT EXISTS batch_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        urls TEXT NOT NULL,
        domain TEXT,
        script_id INTEGER,
        status TEXT NOT NULL DEFAULT 'pending',
        total INTEGER NOT NULL,
        success INTEGER DEFAULT 0,
        failed INTEGER DEFAULT 0,
        duration REAL,
        design_mode TEXT DEFAULT 'single',
        design_source TEXT,
        compare_config TEXT,
        avg_similarity REAL,
        total_diff_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        started_at DATETIME,
        completed_at DATETIME,
        results TEXT,
        error_message TEXT
      )
    `;
        this.db.exec(createTasksSQL);

        // 补全旧表缺失字段 (Migration)
        const columns = [
            { name: 'script_id', type: 'INTEGER' },
            { name: 'design_mode', type: "TEXT DEFAULT 'single'" },
            { name: 'design_source', type: 'TEXT' },
            { name: 'compare_config', type: 'TEXT' },
            { name: 'avg_similarity', type: 'REAL' },
            { name: 'total_diff_count', type: 'INTEGER DEFAULT 0' },
            { name: 'ai_model', type: 'TEXT' }
        ];

        for (const col of columns) {
            try {
                this.db.exec(`ALTER TABLE batch_tasks ADD COLUMN ${col.name} ${col.type}`);
            } catch (e) {
                // 列可能已存在
            }
        }

        // 2. 创建任务明细表
        const createItemsSQL = `
            CREATE TABLE IF NOT EXISTS batch_task_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id INTEGER NOT NULL,
                url TEXT NOT NULL,
                design_source TEXT,
                screenshot_path TEXT,
                report_id TEXT,
                status TEXT DEFAULT 'pending',
                similarity REAL,
                diff_count INTEGER,
                error_message TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                completed_at DATETIME,
                FOREIGN KEY (task_id) REFERENCES batch_tasks(id) ON DELETE CASCADE
            )
        `;
        this.db.exec(createItemsSQL);

        // 创建索引
        this.db.exec('CREATE INDEX IF NOT EXISTS idx_batch_tasks_status ON batch_tasks(status)');
        this.db.exec('CREATE INDEX IF NOT EXISTS idx_batch_tasks_created_at ON batch_tasks(created_at DESC)');
        this.db.exec('CREATE INDEX IF NOT EXISTS idx_batch_task_items_task_id ON batch_task_items(task_id)');

        console.log('✅ 批量任务数据库架构初始化完成');
    }

    /**
     * 创建批量任务
     * @param {string} name - 任务名称
     * @param {Array<string>} urls - URL 列表
     * @param {string|null} domain - 登录域名（可选）
     * @param {Object} options - 截图和对比选项
     * @returns {number} 任务 ID
     */
    createTask(name, urls, domain = null, options = {}) {
        const stmt = this.db.prepare(`
      INSERT INTO batch_tasks (
        name, urls, domain, script_id, total, status,
        design_mode, design_source, compare_config, ai_model
      )
      VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)
    `);

        const result = stmt.run(
            name,
            JSON.stringify(urls),
            domain,
            options.script_id || null,
            urls.length,
            options.designMode || 'single',
            options.designSource || null,
            options.compareConfig ? JSON.stringify(options.compareConfig) : null,
            options.compareConfig?.aiModel || null
        );

        const taskId = result.lastInsertRowid;

        // 创建任务明细记录
        if (urls && urls.length > 0) {
            const itemStmt = this.db.prepare(`
                INSERT INTO batch_task_items (task_id, url, design_source)
                VALUES (?, ?, ?)
            `);

            // 获取每个 URL 对应的设计稿（多图模式支持）
            const urlDesignMap = options.urlDesignMap || {};

            for (const url of urls) {
                const itemDesignSource = urlDesignMap[url] || null;
                itemStmt.run(taskId, url, itemDesignSource);
            }
        }

        console.log(`📋 创建批量任务: ${name} (ID: ${taskId})`);
        return taskId;
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

        // 通过 WebSocket 广播任务启动
        wsServer.broadcastTaskUpdate(taskId, 'task:started', { taskId, status: 'running' });

        // 标记为运行中
        this.runningTasks.set(taskId, true);

        // 异步执行任务
        this.executeTask(taskId, onProgress).catch(error => {
            console.error(`任务 ${taskId} 执行失败: `, error);
            this.updateTaskStatus(taskId, 'failed', error.message);
        }).finally(() => {
            this.runningTasks.delete(taskId);
        });

        console.log(`🚀 启动批量任务: ${taskId} `);
    }

    /**
     * 执行批量任务
     * @param {number} taskId - 任务 ID
     * @param {Function} onProgress - 进度回调函数
     */
    async executeTask(taskId, onProgress = null) {
        const task = this.getTask(taskId);
        const urls = task.urls;
        const startTime = Date.now();

        try {
            // 获取脚本代码（如果存在）
            let scriptCode = null;
            if (task.script_id) {
                const script = this.scriptService.getScript(task.script_id);
                if (script) {
                    scriptCode = script.code;
                }
            }

            // 步骤 1: 执行批量截图
            console.log(`📸 开始批量截图: 任务 ${taskId}`);
            const screenshotResult = await this.batchScreenshotService.batchScreenshot(
                urls,
                task.domain,
                {
                    headless: true,
                    fullPage: true,
                    scriptCode,
                    onProgress: (current, total, currentUrl, lastResult) => {
                        // 更新截图进度
                        this.updateTaskProgress(taskId, current, total);

                        // 更新任务明细的截图路径
                        if (lastResult && lastResult.success) {
                            this.db.prepare(`
                                UPDATE batch_task_items 
                                SET screenshot_path = ?
                                WHERE task_id = ? AND url = ?
                            `).run(lastResult.path, taskId, currentUrl);
                        }

                        const progressData = {
                            phase: 'screenshot',
                            current,
                            total,
                            progress: Math.round((current / total) * 50), // 截图占50%
                            currentUrl,
                            lastResult
                        };

                        wsServer.broadcastTaskUpdate(taskId, 'task:progress', progressData);

                        if (onProgress) {
                            onProgress(taskId, progressData);
                        }
                    }
                }
            );

            console.log(`✅ 批量截图完成: 成功 ${screenshotResult.success}/${screenshotResult.total}`);

            // 步骤 2: 执行批量对比（如果提供了设计稿）
            let compareResult = null;
            if (task.designSource) {
                console.log(`🔍 开始批量对比: 任务 ${taskId}`);

                compareResult = await this.batchCompareService.batchCompare(
                    taskId,
                    (progress) => {
                        const progressData = {
                            phase: 'compare',
                            current: progress.current,
                            total: progress.total,
                            progress: 50 + Math.round((progress.current / progress.total) * 50), // 对比占50%
                            currentUrl: progress.url,
                            status: progress.status,
                            lastResult: progress.lastResult
                        };

                        wsServer.broadcastTaskUpdate(taskId, 'task:progress', progressData);

                        if (onProgress) {
                            onProgress(taskId, progressData);
                        }
                    }
                );

                console.log(`✅ 批量对比完成: 成功 ${compareResult.successCount}/${compareResult.total}`);
            }

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
                screenshotResult.success,
                screenshotResult.failed,
                duration,
                JSON.stringify({
                    screenshot: screenshotResult,
                    compare: compareResult
                }),
                taskId
            );

            console.log(`✅ 任务 ${taskId} 完成: 成功 ${screenshotResult.success}/${screenshotResult.total}`);

            // 通过 WebSocket 广播完成状态
            wsServer.broadcastTaskUpdate(taskId, 'task:completed', {
                taskId,
                status: 'completed',
                screenshot: screenshotResult,
                compare: compareResult
            });

            if (onProgress) {
                onProgress(taskId, {
                    status: 'completed',
                    screenshot: screenshotResult,
                    compare: compareResult
                });
            }
        } catch (error) {
            console.error(`❌ 任务 ${taskId} 失败:`, error);
            this.updateTaskStatus(taskId, 'failed', error.message);

            wsServer.broadcastTaskUpdate(taskId, 'task:failed', {
                taskId,
                status: 'failed',
                error: error.message
            });

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
            errorMessage: row.error_message,
            script_id: row.script_id,
            designMode: row.design_mode,
            designSource: row.design_source,
            compareConfig: row.compare_config ? JSON.parse(row.compare_config) : null,
            aiModel: row.ai_model,
            avgSimilarity: row.avg_similarity,
            totalDiffCount: row.total_diff_count
        };
    }
}

export default BatchTaskService;
