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
 * BatchTaskService - 批量走查任务调度服务
 * 
 * 职责：
 * 1. 任务建模：定义并维护批量任务（batch_tasks）与其明细条目（batch_task_items）的 1:N 关系。
 * 2. 持久化层：管理 SQLite 数据库表结构的初始化与增量 Migration（版本补全）。
 * 3. 异步流水线：利用 pLimit 限制并发压力，调度 CompareTaskService 执行原子级别的 UI 比对。
 * 4. 实时通信：通过 WebSocket 广播任务阶段进度，并保持主从表数据的强一致性映射。
 */
class BatchTaskService {
    constructor() {
        this.db = getDatabase();
        this.authService = new AuthService();
        this.scriptService = new ScriptService();
        this.runningTasks = new Map(); // 内存索引：跟踪当前活跃的任务 ID

        // 系统启动时自动对齐数据库 Schema
        this.initializeTable();
    }

    /**
     * 基础设施层：数据库 Schema 初始化与平滑演进
     * 逻辑：
     * 1. 确保核心表 batch_tasks 与明细表 batch_task_items 存在。
     * 2. 执行原子级 Migration，动态补充由于版本迭代增加的 AI、进度条、配置镜像等字段。
     */
    initializeTable() {
        // 主任务索引表：记录任务元数据、统计总量与平均相似度
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

        /**
         * 动态 Schema 演进记录清单
         * 随着系统从 1.0 演进至 2.0，逐步增加了 AI 诊断、视觉进度、子任务吸附等字段。
         */
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
                // 静默忽略“列已存在”的异常，实现幂等的 Schema 更新
            }
        }

        // 任务条目明细表：具体到每一个 URL 的执行结果与报告挂载
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

        // 初始化空间索引，加速高频查询
        this.db.exec('CREATE INDEX IF NOT EXISTS idx_batch_tasks_status ON batch_tasks(status)');
        this.db.exec('CREATE INDEX IF NOT EXISTS idx_batch_tasks_created_at ON batch_tasks(created_at DESC)');
        this.db.exec('CREATE INDEX IF NOT EXISTS idx_batch_task_items_task_id ON batch_task_items(task_id)');

        console.log('✅ 批量任务核心持久化架构已就绪');
    }

    /**
     * 第一阶段：任务编排与入库
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

        // 镜像备份：将 URL 集群展开为具体的子条目
        if (urls && urls.length > 0) {
            const itemStmt = this.db.prepare(`
                INSERT INTO batch_task_items (task_id, url, design_source)
                VALUES (?, ?, ?)
            `);

            const urlDesignMap = options.urlDesignMap || {};

            for (const url of urls) {
                const itemDesignSource = urlDesignMap[url] || null;
                itemStmt.run(taskId, url, itemDesignSource);
            }
        }

        console.log(`📋 批量任务注册成功: ${name} (序列号: ${taskId})`);
        return taskId;
    }

    /**
     * 第二阶段：任务激活与 WebSocket 生命周期绑定
     */
    async startTask(taskId, onProgress = null) {
        if (this.runningTasks.has(taskId)) {
            throw new Error(`资源独占异常: 任务 ${taskId} 已经在流水线中执行`);
        }

        const task = this.getTask(taskId);
        if (!task || task.status !== 'pending') {
            throw new Error(`执行准入失败: 任务 ${taskId} 不存在或当前不处于待命状态`);
        }

        this.updateTaskStatus(taskId, 'running');
        wsServer.broadcastTaskUpdate(taskId, 'task:started', { taskId, status: 'running' });
        this.runningTasks.set(taskId, true);

        // 启动异步执行引擎
        this.executeTask(taskId, onProgress).catch(error => {
            console.error(`[执行引擎] 任务 ${taskId} 抛出致命错误: `, error);
            this.updateTaskStatus(taskId, 'failed', error.message);
        }).finally(() => {
            this.runningTasks.delete(taskId);
        });

        console.log(`🚀 任务流水线已点火: ${taskId}`);
    }

    /**
     * 第三阶段：核心调度引擎
     * 设计考量：
     * 1. 资源节制：通过 pLimit(3) 将 Puppeteer 并发限制在 3 个，防止爆 CPU/内存。
     * 2. 原子委托：将每一个 URL 包装为子 Config，委托给 CompareTaskService 执行。
     * 3. 实时落库：子任务每一个步骤的变化都要实时写入 DB，确保用户刷新页面时进度条能断点续传。
     */
    async executeTask(taskId, onProgress = null) {
        const task = this.getTask(taskId);
        const urls = task.urls;
        const startTime = Date.now();
        const limit = pLimit(3);

        try {
            console.log(`[BatchService] 启动执行链条: 模式=${task.designMode}`);

            const jobs = urls.map((url, index) => {
                return limit(async () => {
                    const currentUrl = url;

                    // 广播当前正在处理的节点
                    wsServer.broadcastTaskUpdate(taskId, 'task:progress', {
                        phase: 'processing',
                        current: index + 1,
                        total: urls.length,
                        currentUrl
                    });

                    const subConfig = {
                        url,
                        designSource: task.designMode === 'multiple' ? (task.urlDesignMap?.[url] || task.designSource) : task.designSource,
                        options: task.compareConfig || {},
                        aiModel: task.aiModel,
                        taskId,
                        index
                    };

                    // 核心委托：调用标准原子执行器
                    const result = await CompareTaskService.execute(subConfig, {
                        onProgress: (p) => {
                            const phase = p.currentPhase || 'processing';
                            const progress = p.progress || 0;
                            const stepText = p.stepText || '';

                            // 实时同步主任务的执行文本到数据库
                            this.db.prepare(`
                                UPDATE batch_tasks 
                                SET current_phase = ?, progress = ?, step_text = ?
                                WHERE id = ?
                            `).run(phase, progress, stepText, taskId);

                            wsServer.broadcastTaskUpdate(taskId, 'task:progress', {
                                phase, progress, stepText,
                                currentUrl: url,
                                current: index + 1,
                                total: urls.length
                            });
                        }
                    });

                    // 后置处理：明细落库并更新主表统计汇总
                    if (result.success) {
                        const finalItemResult = {
                            url, success: true,
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
                            result.images.actual, result.reportId, result.similarity,
                            result.diffRegions ? result.diffRegions.length : 0,
                            taskId, url
                        );

                        // 实时聚合汇总：平均相似度与差异总计回填至主表，确保总览仪表盘准确
                        this.db.prepare(`
                            UPDATE batch_tasks 
                            SET total_diff_count = (SELECT SUM(diff_count) FROM batch_task_items WHERE task_id = ? AND status = 'completed'),
                                avg_similarity = (SELECT AVG(similarity) FROM batch_task_items WHERE task_id = ? AND status = 'completed')
                            WHERE id = ?
                        `).run(taskId, taskId, taskId);

                        // 触发表格行数据热更新
                        wsServer.broadcastTaskUpdate(taskId, 'task:progress', {
                            phase: 'finish', progress: 100, currentUrl: url,
                            current: index + 1, total: urls.length,
                            lastResult: finalItemResult
                        });

                    } else {
                        // 失败逻辑记录
                        this.db.prepare(`
                            UPDATE batch_task_items 
                            SET error_message = ?, status = 'failed', completed_at = CURRENT_TIMESTAMP
                            WHERE task_id = ? AND url = ?
                        `).run(result.error, taskId, url);

                        wsServer.broadcastTaskUpdate(taskId, 'task:progress', {
                            phase: 'finish', progress: 0, currentUrl: url,
                            current: index + 1, total: urls.length,
                            lastResult: { url, success: false, error: result.error, status: 'failed' }
                        });
                    }

                    // 更新任务总体达成数
                    const currentStats = this.db.prepare('SELECT COUNT(*) as count FROM batch_task_items WHERE task_id = ? AND status = ?').get(taskId, 'completed');
                    this.updateTaskProgress(taskId, currentStats.count, urls.length);

                    return result;
                });
            });

            await Promise.all(jobs);

            // 第四阶段：成果归档分析
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
                    success = ?, failed = ?, duration = ?, 
                    avg_similarity = ?, total_diff_count = ?, results = ?
                WHERE id = ?
            `).run(
                stats.success || 0, stats.failed || 0, duration,
                stats.avg_similarity || 0, stats.total_diff_count || 0,
                JSON.stringify(results), taskId
            );

            console.log(`✅ 批量任务 ${taskId} 结算完成: 链路通过率 ${(stats.success / urls.length * 100).toFixed(1)}%`);

            wsServer.broadcastTaskUpdate(taskId, 'task:completed', {
                taskId, status: 'completed', duration,
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
            console.error(`❌ 对比链路发生熔断: ${taskId}`, error);
            this.updateTaskStatus(taskId, 'failed', error.message);
            wsServer.broadcastTaskUpdate(taskId, 'task:failed', { taskId, error: error.message });
            throw error;
        }
    }

    /**
     * 更新任务物理状态
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

        this.db.prepare(`UPDATE batch_tasks SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }

    /**
     * 更新进度快照
     */
    updateTaskProgress(taskId, success, total) {
        this.db.prepare(`UPDATE batch_tasks SET success = ? WHERE id = ?`).run(success, taskId);
    }

    /**
     * 获取增强版任务详情
     * 特性：实时从子表拉取最新明细，覆盖掉由于异步延迟导致的主表结果字段落后。
     */
    getTask(taskId) {
        const stmt = this.db.prepare('SELECT * FROM batch_tasks WHERE id = ?');
        const row = stmt.get(taskId);

        if (!row) return null;

        const task = this.parseTaskRow(row);

        // 强耦合对齐：从明细表通过任务 ID 反查全量子序列
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

            // 实时校准统计值，解决“数据漂移”问题
            task.success = items.filter(i => i.status === 'completed').length;
            task.failed = items.filter(i => i.status === 'failed').length;

            const completedItems = items.filter(i => i.status === 'completed' && i.similarity !== null);
            if (completedItems.length > 0) {
                const calculatedDiffs = completedItems.reduce((sum, i) => sum + (i.diff_count || 0), 0);
                task.totalDiffCount = task.totalDiffCount || calculatedDiffs;

                const totalSim = completedItems.reduce((sum, i) => sum + i.similarity, 0);
                task.avgSimilarity = task.avgSimilarity || (totalSim / completedItems.length);
            }
        }

        return task;
    }

    /**
     * 获取任务列表（流式查询）
     */
    getTaskList(options = {}) {
        const { status = null, limit = 20, offset = 0 } = options;

        let sql = 'SELECT * FROM batch_tasks';
        const params = [];

        if (status) {
            sql += ' WHERE status = ?';
            params.push(status);
        }

        sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const rows = this.db.prepare(sql).all(...params);
        return rows.map(row => this.parseTaskRow(row));
    }

    /**
     * 获取总量统计
     */
    getTaskCount(status = null) {
        let sql = 'SELECT COUNT(*) as count FROM batch_tasks';
        const params = [];

        if (status) {
            sql += ' WHERE status = ?';
            params.push(status);
        }

        const result = this.db.prepare(sql).get(...params);
        return result.count;
    }

    /**
     * 级联删除任务
     */
    deleteTask(taskId) {
        if (this.runningTasks.has(taskId)) {
            throw new Error(`权限受限: 任务 ${taskId} 正在活跃执行中，不可执行销毁操作`);
        }

        const result = this.db.prepare('DELETE FROM batch_tasks WHERE id = ?').run(taskId);

        if (result.changes === 0) {
            throw new Error(`目标缺失: 任务 ${taskId} 已在之前的操作中被移除`);
        }

        console.log(`🗑️  任务清理成功: ${taskId}`);
    }

    /**
     * 数据对象转换层 (DAO -> DTO)
     */
    parseTaskRow(row) {
        const total = row.total || 0;
        const success = row.success || 0;
        return {
            id: row.id,
            name: row.name,
            urls: JSON.parse(row.urls || '[]'),
            domain: row.domain,
            status: row.status,
            total,
            success,
            failed: row.failed,
            duration: row.duration,
            // 实时进度计算公式
            progress: row.status === 'completed' ? 100 : (total > 0 ? Math.round((success / total) * 100) : 0),
            createdAt: row.created_at,
            startedAt: row.started_at,
            completedAt: row.completed_at,
            results: row.results ? JSON.parse(row.results) : null,
            errorMessage: row.error_message,
            scriptId: row.script_id,
            designMode: row.design_mode,
            designSource: row.design_source,
            compareConfig: row.compare_config ? JSON.parse(row.compare_config) : null,
            aiModel: row.ai_model,
            avgSimilarity: row.avg_similarity,
            totalDiffCount: row.total_diff_count,
            currentPhase: row.current_phase || (row.status === 'completed' ? 'finish' : (row.status === 'running' ? 'processing' : 'init')),
            stepText: row.step_text
        };
    }
}

export default BatchTaskService;
