/**
 * 批量任务状态管理
 * 管理批量任务列表、当前任务、统计信息等
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import { batchTaskAPI } from '@core/api'

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
                tasks.value = response.tasks as any
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
                stats.value = response.stats
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
                currentTask.value = response.task as any
                return response.task as any
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
            if (response.success && response.taskId) {
                // 获取新创建的任务详情
                const newTask = await fetchTaskById(response.taskId)
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
