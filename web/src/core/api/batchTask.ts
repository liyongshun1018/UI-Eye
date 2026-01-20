/**
 * 批量任务 API 服务封装
 * 
 * @description 该模块整合了项目中所有关于“批量截图”和“批量视觉对比”的后端接口调用。
 * 包含任务的生命周期管理（创建、启动、获取状态、删除）以及预定义的自动化交互脚本管理。
 */
import { get, post, put, del } from '@core/utils/request'
import type { ApiResponse } from '@core/types'

/**
 * 创建批量任务所需的载体数据
 */
export interface CreateTaskData {
    name: string                // 任务名称（必填）
    urls: string[]              // 待处理的页面 URL 列表（必填，至少一个）
    domain?: string             // 关联域名，用于持久化登录态（Cookie 映射）
    designMode?: 'single' | 'multiple'  // 设计稿模式：单图或多图（默认为 single）
    designSource?: string       // 全局设计稿的后端存储路径或公开访问地址
    compareConfig?: {           // 只有在提供 designSource 时生效的像素对比配置
        engine?: string         // 对比引擎: resemble | pixelmatch
        ignoreAntialiasing?: boolean // 是否忽略抗锯齿噪点
        aiModel?: string        // 关联的 AI 层智能分析模型（如 GPT-4, SiliconFlow 等）
    }
    script_id?: number          // 关联的自动化脚本 ID，将在截图前置运行（如登录、弹窗关闭等）
}

/**
 * 批量任务实体数据结构
 */
export interface BatchTask {
    id: number                  // 任务唯一标识符
    name: string                // 任务名称
    urls: string[]              // 处理的 URL 数组原文
    status: string              // 当前状态: pending | running | completed | failed
    total: number               // URL 总数
    success: number             // 已成功处理的数量
    failed: number              // 处理失败的数量
    designMode?: string         // 参考图模式
    designSource?: string       // 参考图路径
    avgSimilarity?: number      // 任务整体平均还原度 (0-100)
    totalDiffCount?: number     // 任务产生的总计差异区域数量
    createdAt: string           // 创建时间 ISO 字符串
    [key: string]: any          // 扩展字段
}

export const batchTaskAPI = {
    /**
     * 发起并创建一个新的批量任务
     */
    createTask: (data: CreateTaskData) => {
        return post<ApiResponse<{ taskId: number }>>('/batch/tasks', data)
    },

    /**
     * 根据过滤条件获取任务列表及统计
     */
    getTasks: (params?: { status?: string; limit?: number; offset?: number }) => {
        return get<ApiResponse<{ tasks: BatchTask[]; total: number; page: number; pageSize: number }>>('/batch/tasks', params)
    },

    /**
     * 获取指定任务的实时快照
     */
    getTask: (id: number) => {
        return get<ApiResponse<BatchTask>>(`/batch/tasks/${id}`)
    },

    /**
     * 获取指定任务的详细对比结果列表
     */
    getTaskResults: (id: number) => {
        return get<ApiResponse<{ task: any; items: any[] }>>(`/batch/tasks/${id}/results`)
    },

    /**
     * 手动触发一个处于 pending 状态的任务开始执行
     */
    startTask: (id: number) => {
        return post<ApiResponse<any>>(`/batch/tasks/${id}/start`)
    },

    /**
     * 永久删除任务
     */
    deleteTask: (id: number) => {
        return del<ApiResponse<any>>(`/batch/tasks/${id}`)
    },

    /**
     * 获取全局任务仪表盘统计数据
     */
    getStats: () => {
        return get<ApiResponse<{ total: number; pending: number; running: number; completed: number; failed: number }>>('/batch/stats')
    },

    /**
     * 获取所有可复用的 Puppeteer 自动化交互脚本列表
     */
    getScripts: () => {
        return get<ApiResponse<any[]>>('/batch/scripts')
    },

    /**
     * 获取单个交互脚本的详细逻辑定义代码
     */
    getScript: (id: number | string) => {
        return get<ApiResponse<any>>(`/batch/scripts/${id}`)
    },

    /**
     * 新增一份自动化交互脚本
     */
    createScript: (data: any) => {
        return post<ApiResponse<{ id: number }>>('/batch/scripts', data)
    },

    /**
     * 覆写更新已有的自动化脚本
     */
    updateScript: (id: number | string, data: any) => {
        return put<ApiResponse<any>>(`/batch/scripts/${id}`, data)
    },

    /**
     * 永久注销移除一个脚本
     */
    deleteScript: (id: number | string) => {
        return del<ApiResponse<any>>(`/batch/scripts/${id}`)
    }
}
