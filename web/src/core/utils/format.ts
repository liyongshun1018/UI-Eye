/**
 * 格式化工具函数
 * 提供日期、文件大小、时长等常用格式化功能
 */

type DateInput = Date | string | number
type FormatType = 'default' | 'date' | 'time' | 'relative' | string

/**
 * 格式化日期
 */
export const formatDate = (date: DateInput, format: FormatType = 'default'): string => {
    if (!date) return '-'

    const d = new Date(date)
    if (isNaN(d.getTime())) return '-'

    if (format === 'default') {
        return d.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        })
    }

    if (format === 'date') {
        return d.toLocaleDateString('zh-CN')
    }

    if (format === 'time') {
        return d.toLocaleTimeString('zh-CN')
    }

    if (format === 'relative') {
        return formatRelativeTime(d)
    }

    // 自定义格式
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hour = String(d.getHours()).padStart(2, '0')
    const minute = String(d.getMinutes()).padStart(2, '0')
    const second = String(d.getSeconds()).padStart(2, '0')

    return format
        .replace('YYYY', String(year))
        .replace('MM', month)
        .replace('DD', day)
        .replace('HH', hour)
        .replace('mm', minute)
        .replace('ss', second)
}

/**
 * 格式化相对时间（如：刚刚、5分钟前、2小时前）
 */
export const formatRelativeTime = (date: DateInput): string => {
    const now = new Date()
    const diff = now.getTime() - new Date(date).getTime()
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (seconds < 60) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    if (days < 7) return `${days}天前`

    return formatDate(date, 'date')
}

/**
 * 格式化文件大小
 */
export const formatFileSize = (bytes: number, decimals: number = 2): string => {
    if (bytes === 0) return '0 B'
    if (!bytes || bytes < 0) return '-'

    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']

    const i = Math.floor(Math.log(bytes) / Math.log(k))
    const size = parseFloat((bytes / Math.pow(k, i)).toFixed(dm))

    return `${size} ${sizes[i]}`
}

/**
 * 格式化时长（毫秒转为可读格式）
 */
export const formatDuration = (ms: number): string => {
    if (!ms || ms < 0) return '-'

    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
        return `${hours}小时${minutes % 60}分钟`
    }
    if (minutes > 0) {
        return `${minutes}分钟${seconds % 60}秒`
    }
    return `${seconds}秒`
}

/**
 * 格式化百分比
 */
export const formatPercent = (value: number, decimals: number = 1): string => {
    if (value === null || value === undefined) return '-'
    return `${value.toFixed(decimals)}%`
}

/**
 * 格式化数字（添加千分位分隔符）
 */
export const formatNumber = (num: number): string => {
    if (num === null || num === undefined) return '-'
    return num.toLocaleString('zh-CN')
}

/**
 * 截断文本
 */
export const truncate = (text: string, maxLength: number, suffix: string = '...'): string => {
    if (!text) return ''
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + suffix
}
