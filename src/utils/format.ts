/**
 * 格式化工具函数
 * 提供日期、文件大小、时长等常用格式化功能
 */

/**
 * 格式化日期
 * @param {Date|string|number} date - 日期对象、字符串或时间戳
 * @param {string} format - 格式化模板（可选）
 * @returns {string} 格式化后的日期字符串
 */
export const formatDate = (date, format = 'default') => {
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
        .replace('YYYY', year)
        .replace('MM', month)
        .replace('DD', day)
        .replace('HH', hour)
        .replace('mm', minute)
        .replace('ss', second)
}

/**
 * 格式化相对时间（如：刚刚、5分钟前、2小时前）
 * @param {Date} date - 日期对象
 * @returns {string} 相对时间字符串
 */
export const formatRelativeTime = (date) => {
    const now = new Date()
    const diff = now - new Date(date)
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
 * @param {number} bytes - 字节数
 * @param {number} decimals - 小数位数（默认 2）
 * @returns {string} 格式化后的文件大小
 */
export const formatFileSize = (bytes, decimals = 2) => {
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
 * @param {number} ms - 毫秒数
 * @returns {string} 格式化后的时长
 */
export const formatDuration = (ms) => {
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
 * @param {number} value - 数值（0-100）
 * @param {number} decimals - 小数位数（默认 1）
 * @returns {string} 格式化后的百分比
 */
export const formatPercent = (value, decimals = 1) => {
    if (value === null || value === undefined) return '-'
    return `${value.toFixed(decimals)}%`
}

/**
 * 格式化数字（添加千分位分隔符）
 * @param {number} num - 数字
 * @returns {string} 格式化后的数字
 */
export const formatNumber = (num) => {
    if (num === null || num === undefined) return '-'
    return num.toLocaleString('zh-CN')
}

/**
 * 截断文本
 * @param {string} text - 文本
 * @param {number} maxLength - 最大长度
 * @param {string} suffix - 后缀（默认 '...'）
 * @returns {string} 截断后的文本
 */
export const truncate = (text, maxLength, suffix = '...') => {
    if (!text) return ''
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + suffix
}
