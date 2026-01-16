/**
 * 任务相关常量
 */

// 任务状态
export const TASK_STATUS = {
    PENDING: 'pending',
    RUNNING: 'running',
    COMPLETED: 'completed',
    FAILED: 'failed'
} as const

export type TaskStatus = typeof TASK_STATUS[keyof typeof TASK_STATUS]

// 任务状态文本
export const TASK_STATUS_TEXT: Record<TaskStatus, string> = {
    [TASK_STATUS.PENDING]: '等待中',
    [TASK_STATUS.RUNNING]: '执行中',
    [TASK_STATUS.COMPLETED]: '已完成',
    [TASK_STATUS.FAILED]: '失败'
}

// 任务状态颜色
export const TASK_STATUS_COLOR: Record<TaskStatus, string> = {
    [TASK_STATUS.PENDING]: '#faad14',
    [TASK_STATUS.RUNNING]: '#1677ff',
    [TASK_STATUS.COMPLETED]: '#52c41a',
    [TASK_STATUS.FAILED]: '#ff4d4f'
}

// 设计稿模式
export const DESIGN_MODE = {
    SINGLE: 'single',
    MULTIPLE: 'multiple'
} as const

export type DesignMode = typeof DESIGN_MODE[keyof typeof DESIGN_MODE]

// 设计稿模式文本
export const DESIGN_MODE_TEXT: Record<DesignMode, string> = {
    [DESIGN_MODE.SINGLE]: '单设计稿',
    [DESIGN_MODE.MULTIPLE]: '多设计稿'
}
