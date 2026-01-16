/**
 * 批量任务 API 服务
 */
import { get, post, del } from '@/utils/request'

export interface CreateTaskData {
    name: string
    urls: string[]
    domain?: string
    designMode?: 'single' | 'multiple'
    designSource?: string
    compareConfig?: {
        engine?: string
        ignoreAntialiasing?: boolean
        aiModel?: string
    }
    script_id?: number
}

export interface BatchTask {
    id: number
    name: string
    urls: string[]
    status: string
    total: number
    success: number
    failed: number
    designMode?: string
    designSource?: string
    avgSimilarity?: number
    totalDiffCount?: number
    createdAt: string
    [key: string]: any
}

export const batchTaskAPI = {
    /**
     * 创建批量任务
     */
    createTask: (data: CreateTaskData) => {
        return post<{ success: boolean; taskId: number }>('/batch/tasks', data)
    },

    /**
     * 获取任务列表
     */
    getTasks: (params?: { status?: string; limit?: number; offset?: number }) => {
        return get<{ success: boolean; tasks: BatchTask[]; total: number }>('/batch/tasks', params)
    },

    /**
     * 获取任务详情
     */
    getTask: (id: number) => {
        return get<{ success: boolean; task: BatchTask }>(`/batch/tasks/${id}`)
    },

    /**
     * 启动任务
     */
    startTask: (id: number) => {
        return post<{ success: boolean }>(`/batch/tasks/${id}/start`)
    },

    /**
     * 删除任务
     */
    deleteTask: (id: number) => {
        return del<{ success: boolean }>(`/batch/tasks/${id}`)
    },

    /**
     * 获取任务统计
     */
    getStats: () => {
        return get<{ success: boolean; stats: any }>('/batch/stats')
    }
}
