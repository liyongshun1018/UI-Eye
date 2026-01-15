/**
 * 验证工具函数
 * 提供常用的数据验证功能
 */

/**
 * 验证 URL 是否有效
 * @param {string} url - URL 字符串
 * @returns {boolean} 是否有效
 */
export const isValidURL = (url) => {
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
 * @param {string} email - 邮箱地址
 * @returns {boolean} 是否有效
 */
export const isValidEmail = (email) => {
    if (!email) return false

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
}

/**
 * 验证手机号是否有效（中国大陆）
 * @param {string} phone - 手机号
 * @returns {boolean} 是否有效
 */
export const isValidPhone = (phone) => {
    if (!phone) return false

    const phoneRegex = /^1[3-9]\d{9}$/
    return phoneRegex.test(phone)
}

/**
 * 验证是否为空
 * @param {any} value - 值
 * @returns {boolean} 是否为空
 */
export const isEmpty = (value) => {
    if (value === null || value === undefined) return true
    if (typeof value === 'string') return value.trim() === ''
    if (Array.isArray(value)) return value.length === 0
    if (typeof value === 'object') return Object.keys(value).length === 0
    return false
}

/**
 * 验证是否为数字
 * @param {any} value - 值
 * @returns {boolean} 是否为数字
 */
export const isNumber = (value) => {
    return !isNaN(parseFloat(value)) && isFinite(value)
}

/**
 * 验证是否在范围内
 * @param {number} value - 值
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @returns {boolean} 是否在范围内
 */
export const isInRange = (value, min, max) => {
    return value >= min && value <= max
}

/**
 * 验证字符串长度
 * @param {string} str - 字符串
 * @param {number} min - 最小长度
 * @param {number} max - 最大长度（可选）
 * @returns {boolean} 是否符合长度要求
 */
export const isValidLength = (str, min, max = Infinity) => {
    if (!str) return false
    const len = str.length
    return len >= min && len <= max
}
