import { Report } from '../models/Report.js';

/**
 * IReportRepository - 审计报告领域仓储接口
 * 职责：定义报告持久化的契约，解耦领域层与具体的数据库实现 (如 SQLite/MySQL)
 */
export interface IReportRepository {
    /**
     * 创建一份初版报告记录
     */
    create(report: Partial<Report>): void;

    /**
     * 增量更新报告数据
     */
    update(id: string, data: Partial<Report>): void;

    /**
     * 精确查询单一报告
     */
    findById(id: string): Report | null;

    /**
     * 分页查询报告列表
     */
    findAll(limit?: number, offset?: number): Report[];

    /**
     * 物理删除报告
     */
    deleteById(id: string): number;
}
