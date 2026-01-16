/**
 * 批量任务状态管理
 * 管理批量任务列表、当前任务、统计信息等
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import batchTaskService from '@/services/batchTaskService'

export const useBatchStore = defineStore('batch', () => {
    // 状态
    const tasks = ref([])
    const currentTask = ref(null)
    const stats = ref({
        total: 0,
        running: 0,
        completed: 0,
        failed: 0
    })
    const loading = ref(false)
    const error = ref(null)

    // 计算属性
    const runningTasks = computed(() => {
        return tasks.value.filter(task => task.status === 'running')
    })

    const completedTasks = computed(() => {
        return tasks.value.filter(task => task.status === 'completed')
    })

    const failedTasks = computed(() => {
        return tasks.value.filter(task => task.status === 'failed')
    })

    const hasRunningTasks = computed(() => {
        return runningTasks.value.length > 0
    })

    // Actions
    const fetchTasks = async () => {
        loading.value = true
        error.value = null

        try {
            const response = await batchTaskService.getTasks()
            if (response.success) {
                tasks.value = response.tasks
            }
        } catch (err) {
            error.value = err.message
            console.error('获取任务列表失败:', err)
        } finally {
            loading.value = false
        }
    }

    const fetchStats = async () => {
        try {
            const response = await batchTaskService.getStats()
            if (response.success) {
                stats.value = response.stats
            }
        } catch (err) {
            console.error('获取统计信息失败:', err)
        }
    }

    const fetchTaskById = async (id) => {
        loading.value = true
        error.value = null

        try {
            const response = await batchTaskService.getTask(id)
            if (response.success) {
                currentTask.value = response.task
                return response.task
            }
        } catch (err) {
            error.value = err.message
            console.error('获取任务详情失败:', err)
        } finally {
            loading.value = false
        }
    }

    const createTask = async (taskData) => {
        loading.value = true
        error.value = null

        try {
            const response = await batchTaskService.createTask(taskData)
            if (response.success) {
                // 添加到任务列表
                tasks.value.unshift(response.task)
                // 更新统计
                await fetchStats()
                return response.task
            }
        } catch (err) {
            error.value = err.message
            console.error('创建任务失败:', err)
            throw err
        } finally {
            loading.value = false
        }
    }

    const deleteTask = async (id) => {
        try {
            const response = await batchTaskService.deleteTask(id)
            if (response.success) {
                // 从列表中移除
                tasks.value = tasks.value.filter(task => task.id !== id)
                // 更新统计
                await fetchStats()
                return true
            }
        } catch (err) {
            console.error('删除任务失败:', err)
            throw err
        }
    }

    const updateTaskStatus = (id, status) => {
        const task = tasks.value.find(t => t.id === id)
        if (task) {
            task.status = status
        }
        if (currentTask.value && currentTask.value.id === id) {
            currentTask.value.status = status
        }
    }

    const updateTaskProgress = (id, progress) => {
        const task = tasks.value.find(t => t.id === id)
        if (task) {
            Object.assign(task, progress)
        }
        if (currentTask.value && currentTask.value.id === id) {
            Object.assign(currentTask.value, progress)
        }
    }

    const clearError = () => {
        error.value = null
    }

    const reset = () => {
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
