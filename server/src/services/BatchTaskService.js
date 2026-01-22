import { getDatabase } from '../database.js';
import AuthService from './AuthService.js';
import wsServer from './WSServer.js';
import ScriptService from './ScriptService.js';
import CompareTaskService from './CompareTaskService.js';
import pLimit from 'p-limit';
import { resolveDesignPath } from '../utils/PathUtils.js';
import sharp from 'sharp';
import fs from 'fs';
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
        this.authService = new AuthService();
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
            { name: 'ai_model', type: 'TEXT' },
            { name: 'current_phase', type: 'TEXT' },
            { name: 'progress', type: 'INTEGER DEFAULT 0' },
            { name: 'step_text', type: 'TEXT' }
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
        const limit = pLimit(3); // 限制并发数为 3

        try {
            console.log(`[BatchService] 🚀 启动标准化流水线: 任务 ${taskId}, 模式=${task.designMode}`);

            // 构造原子任务集
            const jobs = urls.map((url, index) => {
                return limit(async () => {
                    const currentUrl = url;

                    // 广播当前处理中的 URL
                    wsServer.broadcastTaskUpdate(taskId, 'task:progress', {
                        phase: 'processing',
                        current: index + 1,
                        total: urls.length,
                        currentUrl
                    });

                    // 准备单个子任务的配置
                    const subConfig = {
                        url,
                        designSource: task.designMode === 'multiple' ? (task.urlDesignMap?.[url] || task.designSource) : task.designSource,
                        options: task.compareConfig || {},
                        aiModel: task.aiModel,
                        taskId,
                        index
                    };

                    // 调用统一的原子执行器
                    const result = await CompareTaskService.execute(subConfig, {
                        onProgress: (p) => {
                            // 实时同步子任务阶段进度给批量 UI，并实时落库持久化
                            const phase = p.currentPhase || 'processing';
                            const progress = p.progress || 0;
                            const stepText = p.stepText || '';

                            this.db.prepare(`
                                UPDATE batch_tasks 
                                SET current_phase = ?, progress = ?, step_text = ?
                                WHERE id = ?
                            `).run(phase, progress, stepText, taskId);

                            wsServer.broadcastTaskUpdate(taskId, 'task:progress', {
                                phase,
                                progress,
                                stepText,
                                currentUrl: url,
                                current: index + 1,
                                total: urls.length
                            });
                        }
                    });

                    // 持久化子条目结果并透传给前端
                    if (result.success) {
                        const finalItemResult = {
                            url,
                            success: true,
                            reportId: result.reportId,
                            similarity: result.similarity,
                            diffCount: result.diffRegions?.length || 0,
                            screenshot_path: result.images.actual,
                            status: 'completed'
                        };

                        this.db.prepare(`
                            UPDATE batch_task_items 
                            SET screenshot_path = ?, status = 'completed', report_id = ?, 
                                similarity = ?, diff_count = ?, completed_at = CURRENT_TIMESTAMP
                            WHERE task_id = ? AND url = ?
                        `).run(
                            result.images.actual,
                            result.reportId,
                            result.similarity,
                            result.diffRegions ? result.diffRegions.length : 0,
                            taskId,
                            url
                        );

                        // 核心加固：实时同步统计到主表，解决刷新归零
                        const items = this.db.prepare('SELECT similarity, diff_count FROM batch_task_items WHERE task_id = ? AND status = ?').all(taskId, 'completed');
                        if (items.length > 0) {
                            this.db.prepare(`
                                UPDATE batch_tasks 
                                SET total_diff_count = (SELECT SUM(diff_count) FROM batch_task_items WHERE task_id = ? AND status = 'completed'),
                                    avg_similarity = (SELECT AVG(similarity) FROM batch_task_items WHERE task_id = ? AND status = 'completed')
                                WHERE id = ?
                            `).run(taskId, taskId, taskId);
                        }

                        // 核心：子项完成后发送“含金量”消息，触发表格刷新
                        wsServer.broadcastTaskUpdate(taskId, 'task:progress', {
                            phase: 'finish',
                            progress: 100,
                            currentUrl: url,
                            current: index + 1,
                            total: urls.length,
                            lastResult: {
                                ...finalItemResult,
                                diffCount: finalItemResult.diffCount // 明确字段名
                            }
                        });

                    } else {
                        const failedResult = { url, success: false, error: result.error, status: 'failed' };
                        this.db.prepare(`
                            UPDATE batch_task_items 
                            SET error_message = ?, status = 'failed', completed_at = CURRENT_TIMESTAMP
                            WHERE task_id = ? AND url = ?
                        `).run(result.error, taskId, url);

                        wsServer.broadcastTaskUpdate(taskId, 'task:progress', {
                            phase: 'finish',
                            progress: 0,
                            currentUrl: url,
                            current: index + 1,
                            total: urls.length,
                            lastResult: failedResult
                        });
                    }

                    // 更新任务总体进度（成功数）
                    const currentStats = this.db.prepare('SELECT COUNT(*) as count FROM batch_task_items WHERE task_id = ? AND status = ?').get(taskId, 'completed');
                    this.updateTaskProgress(taskId, currentStats.count, urls.length);

                    return result;
                });
            });

            // 等待所有原子任务完成
            const results = await Promise.all(jobs);

            // 统计分析并归档主任务
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            const stats = this.db.prepare(`
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as success,
                    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
                    AVG(similarity) as avg_similarity,
                    SUM(diff_count) as total_diff_count
                FROM batch_task_items
                WHERE task_id = ?
            `).get(taskId);

            this.db.prepare(`
                UPDATE batch_tasks 
                SET status = 'completed', 
                    completed_at = CURRENT_TIMESTAMP,
                    success = ?,
                    failed = ?,
                    duration = ?,
                    avg_similarity = ?,
                    total_diff_count = ?,
                    results = ?
                WHERE id = ?
            `).run(
                stats.success || 0,
                stats.failed || 0,
                duration,
                stats.avg_similarity || 0,
                stats.total_diff_count || 0,
                JSON.stringify(results),
                taskId
            );

            console.log(`✅ 标准化任务 ${taskId} 完成: 成功 ${stats.success}/${urls.length}`);

            wsServer.broadcastTaskUpdate(taskId, 'task:completed', {
                taskId,
                status: 'completed',
                duration,
                compare: {
                    successCount: stats.success || 0,
                    failedCount: stats.failed || 0,
                    totalCount: stats.total || 0,
                    avgSimilarity: stats.avg_similarity || 0,
                    totalDiffCount: stats.total_diff_count || 0,
                    results: results
                }
            });

        } catch (error) {
            console.error(`❌ 任务 ${taskId} 严重故障:`, error);
            this.updateTaskStatus(taskId, 'failed', error.message);
            wsServer.broadcastTaskUpdate(taskId, 'task:failed', { taskId, error: error.message });
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

        const task = this.parseTaskRow(row);

        // 核心增强：无论 results 是否存在，始终从明细表实时拉取最新明细
        // 这样可以确保即便是从缓存加载的主任务，也能获得包含完整 URL 和实时进度的 details
        const itemsStmt = this.db.prepare('SELECT * FROM batch_task_items WHERE task_id = ? ORDER BY id ASC');
        const items = itemsStmt.all(taskId);

        if (items && items.length > 0) {
            task.results = items.map(item => ({
                url: item.url,
                success: item.status === 'completed',
                status: item.status,
                reportId: item.report_id,
                similarity: item.similarity,
                diffCount: item.diff_count,
                screenshot_path: item.screenshot_path,
                error: item.error_message,
                completed_at: item.completed_at
            }));

            // 无论任务是否完成，都基于明细表重新校准统计量，防止主表字段更新延迟
            task.success = items.filter(i => i.status === 'completed').length;
            task.failed = items.filter(i => i.status === 'failed').length;

            const completedItems = items.filter(i => i.status === 'completed' && i.similarity !== null);
            if (completedItems.length > 0) {
                // 如果主表的 total_diff_count 为 0 但明细有数据，优先使用累加值
                const calculatedDiffs = completedItems.reduce((sum, i) => sum + (i.diff_count || 0), 0);
                task.totalDiffCount = task.totalDiffCount || calculatedDiffs;

                const totalSim = completedItems.reduce((sum, i) => sum + i.similarity, 0);
                task.avgSimilarity = task.avgSimilarity || (totalSim / completedItems.length);
            }
        }

        return task;
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
            totalDiffCount: row.total_diff_count,
            currentPhase: row.current_phase || (row.status === 'completed' ? 'finish' : 'init'),
            progress: row.status === 'completed' ? 100 : (row.progress || 0),
            stepText: row.step_text
        };
    }
}

export default BatchTaskService;
