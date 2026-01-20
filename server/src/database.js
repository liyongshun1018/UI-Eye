import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 数据库文件路径
const DB_PATH = path.join(__dirname, '../db/ui-eye.db')

// 初始化数据库
let db = null

/**
 * 获取数据库实例
 */
export function getDatabase() {
    if (!db) {
        db = new Database(DB_PATH)
        db.pragma('journal_mode = WAL') // 启用 WAL 模式提升性能
        initializeTables()
    }
    return db
}

/**
 * 初始化数据库表
 */
function initializeTables() {
    const createTableSQL = `
        CREATE TABLE IF NOT EXISTS reports (
            id TEXT PRIMARY KEY,
            timestamp INTEGER NOT NULL,
            config TEXT NOT NULL,
            status TEXT NOT NULL,
            similarity REAL,
            diff_pixels INTEGER,
            total_pixels INTEGER,
            images TEXT,
            diff_image TEXT,
            diff_regions TEXT,
            fixes TEXT,
            error TEXT,
            created_at INTEGER DEFAULT (strftime('%s', 'now')),
            updated_at INTEGER DEFAULT (strftime('%s', 'now'))
        )
    `

    db.exec(createTableSQL)

    // 为旧数据库添加新列（如果不存在）
    try {
        db.exec('ALTER TABLE reports ADD COLUMN diff_image TEXT')
    } catch (e) {
        // 列已存在，忽略错误
    }

    try {
        db.exec('ALTER TABLE reports ADD COLUMN progress INTEGER DEFAULT 0')
    } catch (e) { }

    try {
        db.exec('ALTER TABLE reports ADD COLUMN step_text TEXT')
    } catch (e) { }

    // 创建索引以提升查询性能
    db.exec('CREATE INDEX IF NOT EXISTS idx_timestamp ON reports(timestamp DESC)')
    db.exec('CREATE INDEX IF NOT EXISTS idx_status ON reports(status)')

    console.log('✅ 数据库表初始化完成')
}

/**
 * 创建新的对比报告记录
 * @param {object} report - 报告数据
 * @returns {object} 创建的报告
 */
export function createReport(report) {
    const db = getDatabase()

    const stmt = db.prepare(`
        INSERT INTO reports (id, timestamp, config, status, similarity, diff_pixels, total_pixels, images, fixes, error, progress, step_text)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
        report.id,
        report.timestamp,
        JSON.stringify(report.config || {}),
        report.status,
        report.similarity || null,
        report.diffPixels || null,
        report.totalPixels || null,
        report.images ? JSON.stringify(report.images) : null,
        report.fixes ? JSON.stringify(report.fixes) : null,
        report.error || null,
        report.progress || 0,
        report.stepText || null
    )

    return report
}

/**
 * 更新报告记录
 * @param {string} id - 报告 ID
 * @param {object} data - 要更新的数据
 */
export function updateReport(id, data) {
    const db = getDatabase()

    const updates = []
    const values = []

    if (data.status !== undefined) {
        updates.push('status = ?')
        values.push(data.status)
    }

    if (data.similarity !== undefined) {
        updates.push('similarity = ?')
        values.push(data.similarity)
    }

    if (data.diffPixels !== undefined) {
        updates.push('diff_pixels = ?')
        values.push(data.diffPixels)
    }

    if (data.totalPixels !== undefined) {
        updates.push('total_pixels = ?')
        values.push(data.totalPixels)
    }

    if (data.images !== undefined) {
        updates.push('images = ?')
        values.push(JSON.stringify(data.images))
    }

    if (data.diffImage !== undefined) {
        updates.push('diff_image = ?')
        values.push(JSON.stringify(data.diffImage))
    }

    if (data.diffRegions !== undefined) {
        updates.push('diff_regions = ?')
        values.push(JSON.stringify(data.diffRegions))
    }

    if (data.fixes !== undefined) {
        updates.push('fixes = ?')
        values.push(JSON.stringify(data.fixes))
    }

    if (data.error !== undefined) {
        updates.push('error = ?')
        values.push(data.error)
    }

    if (data.progress !== undefined) {
        updates.push('progress = ?')
        values.push(data.progress)
    }

    if (data.stepText !== undefined) {
        updates.push('step_text = ?')
        values.push(data.stepText)
    }

    if (updates.length === 0) {
        return
    }

    updates.push('updated_at = ?')
    values.push(Math.floor(Date.now() / 1000))

    values.push(id)

    const stmt = db.prepare(`
        UPDATE reports 
        SET ${updates.join(', ')}
        WHERE id = ?
    `)

    stmt.run(...values)
}

/**
 * 获取单个报告
 * @param {string} id - 报告 ID
 * @returns {object|null} 报告数据
 */
export function getReport(id) {
    const db = getDatabase()

    const stmt = db.prepare('SELECT * FROM reports WHERE id = ?')
    const row = stmt.get(id)

    if (!row) {
        return null
    }

    return parseReportRow(row)
}

/**
 * 获取报告列表
 * @param {number} limit - 限制数量
 * @param {number} offset - 偏移量
 * @returns {Array} 报告列表
 */
export function getReportList(limit = 50, offset = 0) {
    const db = getDatabase()

    const stmt = db.prepare(`
        SELECT * FROM reports 
        ORDER BY timestamp DESC 
        LIMIT ? OFFSET ?
    `)

    const rows = stmt.all(limit, offset)
    return rows.map(parseReportRow)
}

/**
 * 删除过期报告
 * @param {number} days - 保留天数
 * @returns {number} 删除的记录数
 */
export function deleteOldReports(days = 7) {
    const db = getDatabase()

    const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000)

    const stmt = db.prepare('DELETE FROM reports WHERE timestamp < ?')
    const result = stmt.run(cutoffTime)

    console.log(`🗑️  删除了 ${result.changes} 条过期报告（${days} 天前）`)

    return result.changes
}

/**
 * 解析数据库行为报告对象
 * @param {object} row - 数据库行
 * @returns {object} 报告对象
 */
/**
 * 解析数据库中的报告对象，并确保 URL 路径完整性
 * @param {object} row - 数据库行
 * @returns {object} 报告对象
 */
function parseReportRow(row) {
    const images = row.images ? JSON.parse(row.images) : null
    const diffImage = row.diff_image ? JSON.parse(row.diff_image) : null

    /**
     * 内部助手：路径修复与 URL 转换函数
     * 业务背景：
     * 插件捕获的图片在存入数据库时可能携带了后端的绝对磁盘路径。
     * 为了让 Web 前端（Vue）能正常加载这些图片，必须将其转换为基于 Web 的公开 URL。
     * @param {string} url - 数据库中的原始路径
     * @param {string} defaultPrefix - 默认路径前缀
     * @returns {string} 可在浏览器中直接访问的 Web URL
     */
    const fixUrl = (url, defaultPrefix) => {
        if (!url) return url
        // 1. 如果已经是完整的公网 HTTP 链接，不再重复处理
        if (url.startsWith('http')) return url

        // 提取文件名，忽略具体目录层级
        const filename = path.basename(url)

        // 2. 特征工程：根据路径中的关键标识，自动匹配对应的 Web 前缀
        if (url.includes('reports')) return `/reports/${filename}`
        if (url.includes('screenshots/batch')) return `/api/batch/screenshots/${filename}`

        // 如果文件名带有插件导出的特征词，则归入上传目录
        if (url.includes('uploads') || url.includes('actual-') || url.includes('design-')) {
            return `/uploads/${filename}`
        }

        // 3. 容错处理：如果带了斜杠前缀且属于合法的静态资源路径，直接放行
        if (url.startsWith('/') && (url.includes('/uploads/') || url.includes('/reports/'))) {
            return url
        }

        // 4. 兜底方案：使用传入的默认前缀拼接
        return `${defaultPrefix}${filename}`
    }

    if (images) {
        images.design = fixUrl(images.design, '/uploads/')
        images.actual = fixUrl(images.actual, '/uploads/')
        images.diff = fixUrl(images.diff, '/reports/')
    }

    if (diffImage) {
        if (typeof diffImage === 'string') {
            // 处理一些历史遗留的字符串格式
            diffImage = { url: fixUrl(diffImage, '/reports/') }
        } else {
            diffImage.url = fixUrl(diffImage.url, '/reports/')
            diffImage.annotatedUrl = fixUrl(diffImage.annotatedUrl, '/reports/')
        }
    }

    return {
        id: row.id,
        timestamp: row.timestamp,
        config: row.config ? JSON.parse(row.config) : {},
        status: row.status,
        similarity: row.similarity,
        diffPixels: row.diff_pixels,
        totalPixels: row.total_pixels,
        images,
        diffImage,
        diffRegions: row.diff_regions ? JSON.parse(row.diff_regions) : null,
        fixes: row.fixes ? JSON.parse(row.fixes) : null,
        error: row.error,
        progress: row.progress || 0,
        stepText: row.step_text || null
    }
}

/**
 * 关闭数据库连接
 */
export function closeDatabase() {
    if (db) {
        db.close()
        db = null
        console.log('📦 数据库连接已关闭')
    }
}

// 进程退出时关闭数据库
process.on('exit', closeDatabase)
process.on('SIGINT', () => {
    closeDatabase()
    process.exit(0)
})
