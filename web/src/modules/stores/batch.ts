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
        console.log('📊 [updateTaskProgress] id:', id, 'progress:', progress)
        const task = tasks.value.find(t => t.id === id)
        if (task) {
            if (progress.currentUrl !== undefined) task.currentUrl = progress.currentUrl
            if (progress.currentPhase !== undefined) task.currentPhase = progress.currentPhase
            if (progress.total !== undefined) task.total = progress.total
            if (progress.progress !== undefined) task.progress = progress.progress
            if (progress.stepText !== undefined) task.stepText = progress.stepText
            if (progress.success !== undefined) task.success = progress.success
            if (progress.avgSimilarity !== undefined) {
                task.avgSimilarity = progress.avgSimilarity
                console.log('📊 [updateTaskProgress] 更新 task.avgSimilarity:', task.avgSimilarity)
            }
            if (progress.totalDiffCount !== undefined) {
                task.totalDiffCount = progress.totalDiffCount
                console.log('📊 [updateTaskProgress] 更新 task.totalDiffCount:', task.totalDiffCount)
            }
            if (progress.duration !== undefined) task.duration = progress.duration
        }
        if (currentTask.value && currentTask.value.id === id) {
            Object.assign(currentTask.value, progress)
            console.log('📊 [updateTaskProgress] 更新 currentTask:', currentTask.value)
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
                // 关键修复：同步更新 phase 和 stepText，激活进度条计算
                if (message.data) {
                    updateTaskProgress(taskId, {
                        currentPhase: message.data.phase || message.data.currentPhase,
                        stepText: message.data.stepText
                    })
                }
                break
            case 'task:progress':
                const progressData: TaskProgress = {
                    currentUrl: message.data.currentUrl,
                    currentPhase: message.data.phase || message.data.currentPhase,
                    total: message.data.total,
                    progress: message.data.progress,
                    stepText: message.data.stepText,
                    duration: message.data.duration
                }

                // 处理增量结果
                if (message.data.lastResult) {
                    const target = (isCurrent ? currentTask.value : task) as any
                    if (target) {
                        // 确保 results 存在且为数组或分组对象
                        if (!target.results) target.results = []

                        let resultsArray = target.results
                        let isGrouped = false

                        // 如果 results 是分组对象 { screenshot: { results: [] }, compare: { results: [] } }
                        if (!Array.isArray(target.results) && typeof target.results === 'object') {
                            isGrouped = true
                            // 优先存入 compare 组，如果没有则存入 screenshot 组
                            if (message.data.phase === 'compare' || target.results.compare) {
                                if (!target.results.compare) target.results.compare = { results: [] }
                                resultsArray = target.results.compare.results
                            } else {
                                if (!target.results.screenshot) target.results.screenshot = { results: [] }
                                resultsArray = target.results.screenshot.results
                            }
                        }

                        if (Array.isArray(resultsArray)) {
                            const existingIndex = resultsArray.findIndex((r: any) => r.url === message.data.lastResult.url)
                            if (existingIndex > -1) {
                                resultsArray[existingIndex] = { ...resultsArray[existingIndex], ...message.data.lastResult }
                            } else {
                                resultsArray.push(message.data.lastResult)
                            }
                        }
                    }
                }


                // 处理统计数据（移除 phase 限制）
                if (true || ['compare', 'ai', 'finish'].includes(message.data.phase || message.data.currentPhase)) {
                    const target = (isCurrent ? currentTask.value : task) as any
                    if (target) {
                        // 1. 统一计算成功数
                        let res = target.results
                        if (res !== null && !Array.isArray(res) && typeof res === 'object') {
                            res = res.compare?.results || res.screenshot?.results || []
                        }

                        const completedItems = Array.isArray(res)
                            ? res.filter((r: any) => r && (r.status === 'completed' || r.success))
                            : []

                        progressData.success = completedItems.length

                        // 2. 状态同步：优先使用后端推送的值，若为 0 且本地有数据则进行补偿计算
                        if (message.data.avgSimilarity !== undefined && message.data.avgSimilarity > 0) {
                            progressData.avgSimilarity = message.data.avgSimilarity
                        } else if (completedItems.length > 0) {
                            const totalSim = completedItems.reduce((sum: number, r: any) => sum + (Number(r.similarity) || 0), 0)
                            progressData.avgSimilarity = totalSim / completedItems.length
                        }

                        if (message.data.totalDiffCount !== undefined) {
                            progressData.totalDiffCount = message.data.totalDiffCount
                        } else if (completedItems.length > 0) {
                            progressData.totalDiffCount = completedItems.reduce((sum: number, r: any) => sum + (Number(r.diffCount) || 0), 0)
                        }
                    }
                } else {
                    progressData.success = message.data.current
                }

                updateTaskProgress(taskId, progressData)
                break
            case 'task:completed':
                const data = message.data || {}
                const finalData = {
                    status: 'completed',
                    success: data.screenshot?.success || data.compare?.successCount || 0,
                    failed: data.screenshot?.failed || data.compare?.failedCount || 0,
                    duration: Number(data.duration) || 0,
                    avgSimilarity: Number(data.avgSimilarity ?? data.compare?.avgSimilarity ?? 0),
                    totalDiffCount: Number(data.totalDiffCount ?? data.compare?.totalDiffCount ?? 0),
                    results: data.screenshot?.results ?? data.compare?.results ?? []
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
