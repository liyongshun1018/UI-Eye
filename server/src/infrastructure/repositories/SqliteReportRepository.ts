import { IReportRepository } from '../../domain/repositories/IReportRepository.js';
import { Report } from '../../domain/models/Report.js';
import { getDatabase } from '../../db/connection.js';

/**
 * SqliteReportRepository - 审计报告 SQLite 仓储实现
 * 职责：负责 Report 实体在关系型数据库中的持久化及映射转换
 */
export class SqliteReportRepository implements IReportRepository {
    /**
     * 创建一份新的审计报告记录
     */
    create(report: Partial<Report>): void {
        const db = getDatabase();

        // 插入所有可用字段
        const stmt = db.prepare(`
            INSERT INTO reports (
                id, timestamp, config, status, similarity, 
                diff_pixels, total_pixels, images, diff_regions, 
                fixes, error, progress, step_text
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
            report.id,
            report.timestamp,
            JSON.stringify(report.config || {}),
            report.status,
            report.similarity || 0,
            report.diffPixels || 0,
            report.totalPixels || 0,
            JSON.stringify(report.images || {}),
            JSON.stringify(report.diffRegions || []),
            JSON.stringify(report.fixes || []),
            report.error || null,
            report.progress || 0,
            report.stepText || null
        );
    }

    /**
     * 更新存量报告的详细数据 (如相似度、修复建议等)
     */
    update(id: string, data: Partial<Report>): void {
        const db = getDatabase();
        const updates: string[] = [];
        const values: any[] = [];

        /**
         * 动态 SQL 构建
         * 将模型层字段名映射到数据库表列名，并处理 JSON 序列化
         */
        const mapping: Record<string, string> = {
            status: 'status',
            similarity: 'similarity',
            diffPixels: 'diff_pixels',
            totalPixels: 'total_pixels',
            diffRegions: 'diff_regions',
            fixes: 'fixes',
            error: 'error',
            progress: 'progress',
            stepText: 'step_text',
            images: 'images'
        };

        for (const [key, col] of Object.entries(mapping)) {
            if ((data as any)[key] !== undefined) {
                updates.push(`${col} = ?`);
                let value = (data as any)[key];
                // 针对数组或对象，在持久化前执行 JSON 序列化
                if (typeof value === 'object') value = JSON.stringify(value);
                values.push(value);
            }
        }

        if (updates.length === 0) return;

        // 自动更新物理记录的时间戳
        updates.push("updated_at = strftime('%s', 'now')");
        values.push(id);

        const sql = `UPDATE reports SET ${updates.join(', ')} WHERE id = ?`;
        db.prepare(sql).run(...values);
    }

    /**
     * 根据高度唯一的 ID 获取完整报告
     */
    findById(id: string): Report | null {
        const db = getDatabase();
        const row = db.prepare('SELECT * FROM reports WHERE id = ?').get(id) as any;
        if (!row) return null;
        return this.parseRow(row);
    }

    /**
     * 获取所有报告，支持分页与时间序排列
     */
    findAll(limit: number, offset: number): Report[] {
        const db = getDatabase();
        const rows = db.prepare(`
            SELECT * FROM reports 
            ORDER BY timestamp DESC 
            LIMIT ? OFFSET ?
        `).all(limit, offset) as any[];

        return rows.map(row => this.parseRow(row));
    }

    /**
     * 物理删除一份报告
     */
    deleteById(id: string): number {
        const db = getDatabase();
        const result = db.prepare('DELETE FROM reports WHERE id = ?').run(id);
        return result.changes; // 返回受影响的行数，用于前端校验
    }

    /**
     * 解析器：将平铺的数据库行 (Row) 还原回结构化的领域模型 (Entity)
     */
    private parseRow(row: any): Report {
        return {
            id: row.id,
            timestamp: row.timestamp,
            config: row.config ? JSON.parse(row.config) : {},
            status: row.status,
            similarity: row.similarity,
            diffPixels: row.diff_pixels,
            totalPixels: row.total_pixels,
            images: row.images ? JSON.parse(row.images) : {},
            diffRegions: row.diff_regions ? JSON.parse(row.diff_regions) : [],
            fixes: row.fixes ? JSON.parse(row.fixes) : [],
            error: row.error,
            progress: row.progress || 0,
            stepText: row.step_text
        };
    }
}
