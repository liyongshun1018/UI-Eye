import { getDatabase, createReport, updateReport, getReport, getReportList, deleteOldReports, deleteReport } from '../database.js'

/**
 * ReportRepository - 报告数据仓库
 * 
 * 架构职能：
 * 1. 关注点分离：封装底层持久化逻辑（SQLite API / database.js），为 Service 层提供语义化的领域对象操作。
 * 2. 交互一致性：确保无论单机对比还是批量子任务，均采用统一的数据注入与检索协议。
 * 3. 性能屏障：在 Repository 中预留缓存或批量写入的扩展点。
 */
class ReportRepository {
    /**
     * 实例初始化：获取共享数据库句柄
     */
    constructor() {
        this.db = getDatabase()
    }

    /**
     * 新增报告记录
     * @param {Object} report - 符合领域规范的报告实体
     * @returns {Object} 已持久化的报告数据映射
     */
    create(report) {
        console.log(`[数据仓库] 登记新报告凭证: ${report.id}`)
        return createReport(report)
    }

    /**
     * 更新报告状态与结果
     * @param {string} id - 报告唯一标识
     * @param {Object} data - 待局部更新的差异数据
     */
    update(id, data) {
        console.log(`[数据仓库] 修正报告状态流: ${id}`)
        updateReport(id, data)
    }

    /**
     * 执行物理删除
     * @param {string} id - 目标报告 ID
     */
    delete(id) {
        console.log(`[数据仓库] 物理销毁报告存档: ${id}`)
        return deleteReport(id)
    }

    /**
     * 精确查询单条报告
     * @param {string} id - 报告 ID
     * @returns {Object|null} 完整报告 DTO 或 空
     */
    findById(id) {
        console.log(`[数据仓库] 检索报告详情: ${id}`)
        return getReport(id)
    }

    /**
     * 检索聚合报告集
     * @param {Object} options - 分页查询模型
     */
    findAll(options = {}) {
        const { limit = 50, offset = 0 } = options
        console.log(`[数据仓库] 流式检索报告序列: limit=${limit}, offset=${offset}`)
        return getReportList(limit, offset)
    }

    /**
     * 自动化磁盘空间回收：清理陈旧报告（及其物理文件映射）
     * @param {number} days - 活跃窗口天数
     */
    deleteExpired(days) {
        console.log(`[数据仓库] 执行空间回收策略，清理周期: ${days} 天`)
        return deleteOldReports(days)
    }

    /**
     * 业务统计：计算当前报告总量（支持状态切片）
     */
    count(filters = {}) {
        const reports = this.findAll({ limit: 1000 })

        if (filters.status) {
            return reports.filter(r => r.status === filters.status).length
        }

        return reports.length
    }

    /**
     * 判断记录是否已存在（幂等性检测）
     */
    exists(id) {
        const report = this.findById(id)
        return report !== null
    }
}

export default ReportRepository
