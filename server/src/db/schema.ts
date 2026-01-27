import Database from 'better-sqlite3';

/**
 * 数据库扩展：初始化表结构与数据迁移
 * 职责：确保数据库具备最新的 Schema 定义
 * 
 * @param {Database.Database} db 数据库实例
 */
export function initializeTables(db: Database.Database): void {
    // 1. 核心报告表：存储单次比对的详细数据
    const createTableSQL = `
        CREATE TABLE IF NOT EXISTS reports (
            id TEXT PRIMARY KEY,                       -- 报告唯一 ID
            timestamp INTEGER NOT NULL,                -- 任务执行时间戳
            config TEXT NOT NULL,                      -- 比对配置快照 (JSON)
            status TEXT NOT NULL,                      -- 状态: pending, processing, completed, failed
            similarity REAL,                           -- 视觉相似度 (0-100)
            diff_pixels INTEGER,                       -- 差异像素总数
            total_pixels INTEGER,                      -- 总像素数
            images TEXT,                               -- 原始图像路径 (JSON: design, actual, diff)
            diff_image TEXT,                           -- 差异图路径增强 (JSON: path, url, annotatedUrl)
            diff_regions TEXT,                         -- 智能聚类后的差异区域列表 (JSON)
            fixes TEXT,                                -- AI 生成的修复建议列表 (JSON)
            error TEXT,                                -- 报错明细信息
            progress INTEGER DEFAULT 0,                -- 任务实时进度 (0-100)
            step_text TEXT,                            -- 进度对应的描述文案
            created_at INTEGER DEFAULT (strftime('%s', 'now')), 
            updated_at INTEGER DEFAULT (strftime('%s', 'now'))
        )
    `;

    db.exec(createTableSQL);

    // 2. 批量任务表：支持兰湖/多链接等大规模走查
    db.exec(`
        CREATE TABLE IF NOT EXISTS batch_tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,      -- 批量任务 ID (自增)
            name TEXT NOT NULL,                        -- 任务名称
            urls TEXT NOT NULL,                        -- 待对比 URL 列表 (JSON)
            domain TEXT,                               -- 限制域名
            status TEXT NOT NULL,                      -- 批处理状态
            total INTEGER NOT NULL,                    -- 子任务总数
            success INTEGER DEFAULT 0,                 -- 已完成数
            failed INTEGER DEFAULT 0,                  -- 失败数
            duration INTEGER,                          -- 累计耗时
            design_mode TEXT,                          -- 设计稿关联模式 (single/matching)
            design_source TEXT,                        -- 设计稿来源路径
            compare_config TEXT,                       -- 通用比对参数
            ai_model TEXT,                             -- 指定的 AI 分析模型
            progress INTEGER DEFAULT 0,                -- 整体进度
            step_text TEXT,                            -- 当前批次阶段描述
            avg_similarity REAL,                       -- 批次平均相似度
            total_diff_count INTEGER,                  -- 累计差异点总数
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            started_at DATETIME,
            completed_at DATETIME
        )
    `);

    // 3. 批量任务子项表：记录主任务下每个页面的执行细节
    db.exec(`
        CREATE TABLE IF NOT EXISTS batch_task_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id INTEGER NOT NULL,                  -- 关联的主任务 ID
            url TEXT NOT NULL,                         -- 页面 URL
            design_source TEXT,                        -- 该项特定的设计稿
            status TEXT DEFAULT 'pending',             -- 子项状态
            report_id TEXT,                            -- 关联的详细报告 ID (reports.id)
            error TEXT,                                -- 单项报错
            FOREIGN KEY (task_id) REFERENCES batch_tasks(id) ON DELETE CASCADE
        )
    `);

    // 4. 用户自定义脚本表：存储注入到 Puppeteer 的前置操作脚本
    db.exec(`
        CREATE TABLE IF NOT EXISTS scripts (
            id TEXT PRIMARY KEY,                       -- 脚本 ID
            name TEXT NOT NULL,                        -- 脚本标题 (如: 自动登录)
            code TEXT NOT NULL,                        -- JS 代码正文
            description TEXT,                          -- 脚本用途描述
            created_at INTEGER DEFAULT (strftime('%s', 'now')),
            updated_at INTEGER DEFAULT (strftime('%s', 'now'))
        )
    `);

    // 5. 数据平滑迁移逻辑 (reports)
    const reportsColumns = db.prepare("PRAGMA table_info(reports)").all() as any[];
    const reportsColNames = reportsColumns.map(c => c.name);

    if (!reportsColNames.includes('diff_image')) {
        try { db.exec('ALTER TABLE reports ADD COLUMN diff_image TEXT'); } catch (e) { }
    }
    if (!reportsColNames.includes('progress')) {
        try { db.exec('ALTER TABLE reports ADD COLUMN progress INTEGER DEFAULT 0'); } catch (e) { }
    }
    if (!reportsColNames.includes('step_text')) {
        try { db.exec('ALTER TABLE reports ADD COLUMN step_text TEXT'); } catch (e) { }
    }

    // 6. 数据平滑迁移逻辑 (batch_task_items)
    const itemsColumns = db.prepare("PRAGMA table_info(batch_task_items)").all() as any[];
    const itemsColNames = itemsColumns.map(c => c.name);

    if (!itemsColNames.includes('error')) {
        try { db.exec('ALTER TABLE batch_task_items ADD COLUMN error TEXT'); } catch (e) { }
    }

    // 7. 性能优化：为高频查询字段建立索引
    db.exec('CREATE INDEX IF NOT EXISTS idx_timestamp ON reports(timestamp DESC)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_status ON reports(status)');

    console.log('[数据库] 表结构初始化与版本适配完成');
}
