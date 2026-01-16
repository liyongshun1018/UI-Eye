/**
 * 对比 API 服务
 */
import { get, post } from '@/utils/request'

export interface CompareData {
    designSource: string
    screenshotSource: string
    engine?: string
    ignoreAntialiasing?: boolean
    aiModel?: string
}

export interface CompareReport {
    id: string
    timestamp: number
    status: string
    similarity: number
    diffPixels: number
    totalPixels: number
    diffRegions?: any[]
    fixes?: any[]
    [key: string]: any
}

export const compareAPI = {
    /**
     * 执行对比
     */
    compare: (data: CompareData) => {
        return post<CompareReport>('/compare', data)
    },

    /**
     * 获取报告
     */
    getReport: (id: string) => {
        return get<CompareReport>(`/reports/${id}`)
    },

    /**
     * 获取报告列表
     */
    getReports: (params?: { limit?: number; offset?: number }) => {
        return get<{ reports: CompareReport[]; total: number }>('/reports', params)
    }
}
