import { api } from '@core/utils/api'
import type { CompareConfig, CompareReport, UploadResponse, LanhuDesignResponse } from '@core/types'

// 上传设计稿
export const uploadDesign = (file: File, onProgress?: (progress: number) => void) => {
    return api.upload<UploadResponse>('/upload-design', file, onProgress)
}

// 获取蓝湖设计稿
export const fetchLanhuDesign = (url: string) => {
    return api.post<LanhuDesignResponse>('/lanhu/fetch', { url })
}

// 开始对比
export const startCompare = (config: CompareConfig) => {
    return api.post<{ reportId: string }>('/compare', config)
}

// 获取对比报告
export const getReport = (reportId: string) => {
    return api.get<CompareReport>(`/report/${reportId}`)
}

// 获取报告列表
export const getReportList = () => {
    return api.get<CompareReport[]>('/reports')
}
