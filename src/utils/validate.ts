/**
 * 验证工具函数
 * 提供常用的数据验证功能
 */

/**
 * 验证 URL 是否有效
 */
export const isValidURL = (url: string): boolean => {
    if (!url) return false

    try {
        const urlObj = new URL(url)
        return urlObj.protocol === 'http:' || urlObj.protocol === 'https:'
    } catch {
        return false
    }
}

/**
 * 验证邮箱是否有效
 */
export const isValidEmail = (email: string): boolean => {
    if (!email) return false

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
}

/**
 * 验证手机号是否有效（中国大陆）
 */
export const isValidPhone = (phone: string): boolean => {
    if (!phone) return false

    const phoneRegex = /^1[3-9]\d{9}$/
    return phoneRegex.test(phone)
}

/**
 * 验证是否为空
 */
export const isEmpty = (value: any): boolean => {
    if (value === null || value === undefined) return true
    if (typeof value === 'string') return value.trim() === ''
    if (Array.isArray(value)) return value.length === 0
    if (typeof value === 'object') return Object.keys(value).length === 0
    return false
}

/**
 * 验证是否为数字
 */
export const isNumber = (value: any): boolean => {
    return !isNaN(parseFloat(value)) && isFinite(value)
}

/**
 * 验证是否在范围内
 */
export const isInRange = (value: number, min: number, max: number): boolean => {
    return value >= min && value <= max
}

/**
 * 验证字符串长度
 */
export const isValidLength = (str: string, min: number, max: number = Infinity): boolean => {
    if (!str) return false
    const len = str.length
    return len >= min && len <= max
}
