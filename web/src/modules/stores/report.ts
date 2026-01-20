/**
 * 单页报告状态管理
 * 负责管理单个对比报告的加载、状态轮询及数据存储
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Ref } from 'vue'
import { compareAPI } from '@core/api/compare'
import type { ApiResponse } from '@core/types'

export interface CompareReport {
    id: string
    timestamp: number
    status: 'pending' | 'processing' | 'completed' | 'failed'
    similarity: number
    diffPixels: number
    totalPixels: number
    images: {
        design: string
        actual: string
        diff: string
    }
    diffImage?: {
        path: string
        url: string
        annotatedUrl: string
    }
    diffRegions?: any[]
    fixes?: any[]
    error?: string
    config: {
        url: string
        [key: string]: any
    }
}

export const useReportStore = defineStore('report', () => {
    // 状态
    const currentReport: Ref<CompareReport | null> = ref(null)
    const loading: Ref<boolean> = ref(false)
    const error: Ref<string | null> = ref(null)
    const pollTimer: Ref<any | null> = ref(null)

    // Actions

    /**
     * 获取单个报告详情
     * @param id 报告 ID
     */
    const fetchReport = async (id: string): Promise<CompareReport | undefined> => {
        loading.value = true
        error.value = null

        try {
            const response = await compareAPI.getReport(id)
            if (response.success) {
                currentReport.value = response.data as any

                // 如果报告正在处理中，启动轮询
                if (response.data.status === 'processing' || response.data.status === 'pending') {
                    startPolling(id)
                } else {
                    stopPolling()
                }

                return response.data as any
            }
        } catch (err: any) {
            error.value = err.message || '加载报告失败'
            console.error('获取报告失败:', err)
        } finally {
            loading.value = false
        }
    }

    /**
     * 启动轮询获取最新报告状态
     * @param id 报告 ID
     */
    const startPolling = (id: string) => {
        stopPolling() // 确保只有一个定时器

        pollTimer.value = setInterval(async () => {
            try {
                const response = await compareAPI.getReport(id)
                if (response.success) {
                    currentReport.value = response.data as any

                    // 如果已完成或失败，停止轮询
                    if (['completed', 'failed'].includes(response.data.status)) {
                        stopPolling()
                    }
                }
            } catch (err) {
                console.error('轮询报告状态失败:', err)
                stopPolling()
            }
        }, 3000) // 每 3 秒轮询一次
    }

    /**
     * 停止轮询
     */
    const stopPolling = () => {
        if (pollTimer.value) {
            clearInterval(pollTimer.value)
            pollTimer.value = null
        }
    }

    /**
     * 重置状态（并在组件卸载时调用）
     */
    const reset = () => {
        stopPolling()
        currentReport.value = null
        loading.value = false
        error.value = null
    }

    return {
        // 状态
        currentReport,
        loading,
        error,

        // Actions
        fetchReport,
        stopPolling,
        reset
    }
})
