/**
 * 对比核心 API 服务
 * 
 * @description 该模块封装了单个页面的"即时对比"接口逻辑，支持设计稿上传、远程图片获取、开启对比及报告检索。
 * 统一使用 @core/utils/request 作为底层请求引擎。
 */
import { get, post, upload } from '@core/utils/request'
import type { CompareConfig, CompareReport, UploadResponse, LanhuDesignResponse, ApiResponse } from '@core/types'

export const compareAPI = {
    /**
     * 上传本地设计稿文件
     * @param {File} file - 图片文件
     * @param {Function} [onProgress] - 上传进度回调
     */
    uploadDesign: (file: File, onProgress?: (percent: number) => void) => {
        const formData = new FormData()
        formData.append('file', file)
        return upload<UploadResponse>('/upload-design', formData, onProgress)
    },

    /**
     * 从远程 URL 获取设计稿并存入服务器
     * @param {string} url - 远程图片 URL
     */
    fetchLanhuDesign: (url: string) => {
        return post<LanhuDesignResponse>('/lanhu/fetch', { url })
    },

    /**
     * 发起即时对比任务
     * @param {CompareConfig} data - 对比配置
     */
    compare: (data: CompareConfig) => {
        return post<ApiResponse<{ reportId: string }>>('/compare', data)
    },

    /**
     * 根据报告 ID 检索完整的视觉走查分析结果
     * @param {string} id 
     */
    getReport: (id: string) => {
        return get<ApiResponse<CompareReport>>(`/report/${id}`)
    },

    /**
     * 分页查询所有的历史视觉对比报告列表
     * @param {Object} [params]
     * @param {number} [params.limit]
     * @param {number} [params.offset]
     */
    getReports: (params?: { limit?: number; offset?: number }) => {
        return get<ApiResponse<CompareReport[]>>('/reports', params)
    }
}
