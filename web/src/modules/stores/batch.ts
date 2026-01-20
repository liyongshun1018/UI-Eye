/**
 * 批量任务状态管理
 * 管理批量任务列表、当前任务、统计信息等
 */

import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import { batchTaskAPI } from '@core/api'
import { useWebSocket } from '@modules/composables/useWebSocket'

// 任务状态类型
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed'

// 批量任务接口
export interface BatchTask {
    id: number
    name: string
    status: TaskStatus
    createdAt: string
    updatedAt?: string
    total?: number
    success?: number
    failed?: number
    progress?: number
    [key: string]: any
}

// 统计信息接口
export interface BatchStats {
    total: number
    running: number
    completed: number
    failed: number
}

// 任务进度更新接口
export interface TaskProgress {
    total?: number
    success?: number
    failed?: number
    progress?: number
    [key: string]: any
}

// 创建任务数据接口
export interface CreateTaskData {
    name: string
    urls?: string[]
    [key: string]: any
}

export const useBatchStore = defineStore('batch', () => {
    // 状态
    const tasks: Ref<BatchTask[]> = ref([])
    const currentTask: Ref<BatchTask | null> = ref(null)
    const stats: Ref<BatchStats> = ref({
        total: 0,
        running: 0,
        completed: 0,
        failed: 0
    })
    const loading: Ref<boolean> = ref(false)
    const error: Ref<string | null> = ref(null)

    // 计算属性
    const runningTasks: ComputedRef<BatchTask[]> = computed(() => {
        return tasks.value.filter(task => task.status === 'running')
    })

    const completedTasks: ComputedRef<BatchTask[]> = computed(() => {
        return tasks.value.filter(task => task.status === 'completed')
    })

    const failedTasks: ComputedRef<BatchTask[]> = computed(() => {
        return tasks.value.filter(task => task.status === 'failed')
    })

    const hasRunningTasks: ComputedRef<boolean> = computed(() => {
        return runningTasks.value.length > 0
    })

    // Actions
    const fetchTasks = async (): Promise<void> => {
        loading.value = true
        error.value = null

        try {
            const response = await batchTaskAPI.getTasks()
            if (response.success) {
                tasks.value = response.data.tasks as any
            }
        } catch (err: any) {
            error.value = err.message
            console.error('获取任务列表失败:', err)
        } finally {
            loading.value = false
        }
    }

    const fetchStats = async (): Promise<void> => {
        try {
            const response = await batchTaskAPI.getStats()
            if (response.success) {
                stats.value = response.data as any
            }
        } catch (err) {
            console.error('获取统计信息失败:', err)
        }
    }

    const fetchTaskById = async (id: number): Promise<BatchTask | undefined> => {
        loading.value = true
        error.value = null

        try {
            const response = await batchTaskAPI.getTask(id)
            if (response.success) {
                currentTask.value = response.data as any
                return response.data as any
            }
        } catch (err: any) {
            error.value = err.message
            console.error('获取任务详情失败:', err)
        } finally {
            loading.value = false
        }
    }

    const createTask = async (taskData: CreateTaskData): Promise<BatchTask | undefined> => {
        loading.value = true
        error.value = null

        try {
            const response = await batchTaskAPI.createTask(taskData as any)
            if (response.success && response.data?.taskId) {
                // 获取新创建的任务详情
                const newTask = await fetchTaskById(response.data.taskId)
                // 更新统计
                await fetchStats()
                return newTask
            }
        } catch (err: any) {
            error.value = err.message
            console.error('创建任务失败:', err)
            throw err
        } finally {
            loading.value = false
        }
    }

    const deleteTask = async (id: number): Promise<boolean> => {
        try {
            const response = await batchTaskAPI.deleteTask(id)
            if (response.success) {
                // 从列表中移除
                tasks.value = tasks.value.filter(task => task.id !== id)
                // 更新统计
                await fetchStats()
                return true
            }
            return false
        } catch (err) {
            console.error('删除任务失败:', err)
            throw err
        }
    }

    const updateTaskStatus = (id: number, status: TaskStatus): void => {
        const task = tasks.value.find(t => t.id === id)
        if (task) {
            task.status = status
        }
        if (currentTask.value && currentTask.value.id === id) {
            currentTask.value.status = status
        }
    }

    const updateTaskProgress = (id: number, progress: TaskProgress): void => {
        const task = tasks.value.find(t => t.id === id)
        if (task) {
            Object.assign(task, progress)
        }
        if (currentTask.value && currentTask.value.id === id) {
            Object.assign(currentTask.value, progress)
        }
    }

    const clearError = (): void => {
        error.value = null
    }

    const reset = (): void => {
        tasks.value = []
        currentTask.value = null
        stats.value = {
            total: 0,
            running: 0,
            completed: 0,
            failed: 0
        }
        loading.value = false
        error.value = null
    }

    // WebSocket 处理
    const { lastMessage } = useWebSocket()

    watch(lastMessage, (message) => {
        if (!message || !message.taskId) return

        const taskId = message.taskId
        const task = tasks.value.find(t => t.id === taskId)
        const isCurrent = currentTask.value && currentTask.value.id === taskId

        switch (message.type) {
            case 'task:started':
                updateTaskStatus(taskId, 'running')
                break
            case 'task:progress':
                const progressData: TaskProgress = {
                    currentUrl: message.data.currentUrl,
                    currentPhase: message.data.phase,
                    total: message.data.total
                }

                // 处理增量结果
                if (message.data.lastResult) {
                    const target = (isCurrent ? currentTask.value : task) as any
                    if (target) {
                        if (!target.results) target.results = []
                        const existingIndex = target.results.findIndex((r: any) => r.url === message.data.lastResult.url)
                        if (existingIndex > -1) {
                            target.results[existingIndex] = { ...target.results[existingIndex], ...message.data.lastResult }
                        } else {
                            target.results.push(message.data.lastResult)
                        }
                    }
                }

                if (message.data.phase === 'compare') {
                    const target = (isCurrent ? currentTask.value : task) as any
                    if (target) {
                        progressData.success = target.results?.filter((r: any) => r.status === 'completed' || r.success).length
                    }
                } else {
                    progressData.success = message.data.current
                }

                updateTaskProgress(taskId, progressData)
                break
            case 'task:completed':
                const finalData = {
                    status: 'completed',
                    success: message.data.compare ? message.data.compare.successCount : message.data.screenshot.success,
                    failed: message.data.compare ? message.data.compare.failedCount : message.data.screenshot.failed,
                    duration: message.data.duration,
                    avgSimilarity: message.data.compare?.avgSimilarity,
                    totalDiffCount: message.data.compare?.totalDiffCount,
                    results: message.data.compare ? message.data.compare.results : message.data.screenshot.results
                }
                updateTaskProgress(taskId, finalData)
                updateTaskStatus(taskId, 'completed')
                break
            case 'task:failed':
                updateTaskStatus(taskId, 'failed')
                updateTaskProgress(taskId, { errorMessage: message.data.error })
                break
        }
    })

    return {
        // 状态
        tasks,
        currentTask,
        stats,
        loading,
        error,

        // 计算属性
        runningTasks,
        completedTasks,
        failedTasks,
        hasRunningTasks,

        // Actions
        fetchTasks,
        fetchStats,
        fetchTaskById,
        createTask,
        deleteTask,
        updateTaskStatus,
        updateTaskProgress,
        clearError,
        reset
    }
})
