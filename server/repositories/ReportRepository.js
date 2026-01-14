import { getDatabase, createReport, updateReport, getReport, getReportList, deleteOldReports } from '../database.js'

/**
 * 报告数据仓库类（Repository 模式）
 * 负责所有报告相关的数据库操作，封装数据访问逻辑
 */
class ReportRepository {
    /**
     * 构造函数
     */
    constructor() {
        this.db = getDatabase()
    }

    /**
     * 创建报告记录
     * @param {Object} report - 报告数据
     * @param {string} report.id - 报告 ID
     * @param {number} report.timestamp - 时间戳
     * @param {Object} report.config - 配置信息
     * @param {string} report.status - 状态
     * @returns {Object} 创建的报告
     */
    create(report) {
        console.log(`[报告仓库] 创建报告: ${report.id}`)
        return createReport(report)
    }

    /**
     * 更新报告记录
     * @param {string} id - 报告 ID
     * @param {Object} data - 更新数据
     * @param {string} data.status - 状态
     * @param {number} data.similarity - 相似度
     * @param {Array} data.fixes - 修复建议
     * @param {string} data.error - 错误信息
     */
    update(id, data) {
        console.log(`[报告仓库] 更新报告: ${id}`)
        updateReport(id, data)
    }

    /**
     * 根据 ID 查询报告
     * @param {string} id - 报告 ID
     * @returns {Object|null} 报告数据，不存在则返回 null
     */
    findById(id) {
        console.log(`[报告仓库] 查询报告: ${id}`)
        return getReport(id)
    }

    /**
     * 查询报告列表
     * @param {Object} options - 查询选项
     * @param {number} options.limit - 限制数量
     * @param {number} options.offset - 偏移量
     * @returns {Array} 报告列表
     */
    findAll(options = {}) {
        const { limit = 50, offset = 0 } = options
        console.log(`[报告仓库] 查询报告列表: limit=${limit}, offset=${offset}`)
        return getReportList(limit, offset)
    }

    /**
     * 删除过期报告
     * @param {number} days - 保留天数
     * @returns {number} 删除的记录数
     */
    deleteExpired(days) {
        console.log(`[报告仓库] 删除 ${days} 天前的过期报告`)
        return deleteOldReports(days)
    }

    /**
     * 统计报告数量
     * @param {Object} filters - 过滤条件
     * @param {string} filters.status - 状态过滤
     * @returns {number} 报告数量
     */
    count(filters = {}) {
        // 预留功能：统计报告数量
        const reports = this.findAll({ limit: 1000 })

        if (filters.status) {
            return reports.filter(r => r.status === filters.status).length
        }

        return reports.length
    }

    /**
     * 检查报告是否存在
     * @param {string} id - 报告 ID
     * @returns {boolean} 是否存在
     */
    exists(id) {
        const report = this.findById(id)
        return report !== null
    }
}

export default ReportRepository
