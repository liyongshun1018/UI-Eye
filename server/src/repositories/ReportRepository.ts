// @ts-ignore
import { getDatabase, createReport, updateReport, getReport, getReportList, deleteOldReports, deleteReport } from '../database.js';

/**
 * ReportRepository - 报告数据仓库 (TypeScript 重构版)
 * 
 * 架构职能：
 * 1. 关注点分离：封装底层持久化逻辑，为 Service 层提供语义化的领域对象操作。
 * 2. 交互一致性：统一单次对比与批量子任务的数据接入协议。
 */
export class ReportRepository {
    private db: any;

    constructor() {
        this.db = getDatabase();
    }

    /**
     * 新增报告记录
     */
    create(report: any): any {
        console.log(`[数据仓库] 登记新报告凭证: ${report.id}`);
        return createReport(report);
    }

    /**
     * 更新报告状态与结果
     */
    update(id: string, data: any): void {
        console.log(`[数据仓库] 修正报告状态流: ${id}`);
        updateReport(id, data);
    }

    /**
     * 执行物理删除
     */
    delete(id: string): boolean {
        console.log(`[数据仓库] 物理销毁报告存档: ${id}`);
        return deleteReport(id);
    }

    /**
     * 精确查询单条报告
     */
    findById(id: string): any | null {
        console.log(`[数据仓库] 检索报告详情: ${id}`);
        return getReport(id);
    }

    /**
     * 检索聚合报告集
     */
    findAll(options: { limit?: number; offset?: number } = {}): any[] {
        const { limit = 50, offset = 0 } = options;
        console.log(`[数据仓库] 流式检索报告序列: limit=${limit}, offset=${offset}`);
        return getReportList(limit, offset);
    }

    /**
     * 磁盘空间回收
     */
    deleteExpired(days: number): number {
        console.log(`[数据仓库] 执行空间回收策略，清理周期: ${days} 天`);
        return deleteOldReports(days);
    }

    /**
     * 业务统计
     */
    count(filters: { status?: string } = {}): number {
        const reports = this.findAll({ limit: 1000 });
        if (filters.status) {
            return reports.filter(r => r.status === filters.status).length;
        }
        return reports.length;
    }

    /**
     * 幂等性检测
     */
    exists(id: string): boolean {
        const report = this.findById(id);
        return report !== null;
    }
}

export default ReportRepository;
