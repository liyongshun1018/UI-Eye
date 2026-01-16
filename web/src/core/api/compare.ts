/**
 * 对比核心 API 服务
 * 
 * @description 该模块封装了单个页面的“即时对比”接口逻辑，支持从外部传递截图和参考图进行像素差异分析，
 * 并负责检索已生成的视觉对比报告详情。
 */
import { get, post } from '@core/utils/request'

/**
 * 发起即时对比请求所需的输入参数
 */
export interface CompareData {
    designSource: string        // 参考图（设计稿）的路径或 URL
    screenshotSource: string    // 待对比的实际页面截图路径或 URL
    engine?: string             // 指定像素对比引擎类型: 'resemble' | 'pixelmatch'
    ignoreAntialiasing?: boolean // 图像算法层：是否过滤抗锯齿边缘
    aiModel?: string            // 智能分析层：关联执行分析的模型名称
}

/**
 * 视觉走查对比报告的数据模型
 */
export interface CompareReport {
    id: string                  // 报告唯一流水号
    timestamp: number           // 生成时间戳（毫秒）
    status: string              // 报告处理状态: completed | processing | failed
    similarity: number          // 最终计算得出的还原度分数 (0.1 - 100.0)
    diffPixels: number          // 检出的差异像素点总数
    totalPixels: number         // 图像总像素量（用于计算还原度基础）
    diffRegions?: any[]         // 具体的坐标差异区块列表
    fixes?: any[]               // AI 生成的 CSS 修复建议数组
    [key: string]: any          // 其他元数据扩展
}

export const compareAPI = {
    /**
     * 对两张指定的图像执行像素级比对及 AI 语义分析
     * @param {CompareData} data 
     * @returns {Promise<CompareReport>} 
     */
    compare: (data: CompareData) => {
        return post<CompareReport>('/compare', data)
    },

    /**
     * 根据报告 ID 检索完整的视觉走查分析结果（含差异区域坐标和修复建议）
     * @param {string} id 
     * @returns {Promise<CompareReport>}
     */
    getReport: (id: string) => {
        return get<CompareReport>(`/reports/${id}`)
    },

    /**
     * 分页查询所有的历史视觉对比报告梗概信息
     * @param {Object} [params]
     * @param {number} [params.limit]
     * @param {number} [params.offset]
     */
    getReports: (params?: { limit?: number; offset?: number }) => {
        return get<{ reports: CompareReport[]; total: number }>('/reports', params)
    }
}
