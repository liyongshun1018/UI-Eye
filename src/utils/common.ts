/**
 * 通用工具函数
 * 提供防抖、节流、深拷贝等常用功能
 */

/**
 * 防抖函数
 * @param {Function} fn - 要防抖的函数
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
export const debounce = (fn, delay = 300) => {
    let timer = null

    return function (...args) {
        if (timer) clearTimeout(timer)

        timer = setTimeout(() => {
            fn.apply(this, args)
            timer = null
        }, delay)
    }
}

/**
 * 节流函数
 * @param {Function} fn - 要节流的函数
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {Function} 节流后的函数
 */
export const throttle = (fn, delay = 300) => {
    let lastTime = 0

    return function (...args) {
        const now = Date.now()

        if (now - lastTime >= delay) {
            fn.apply(this, args)
            lastTime = now
        }
    }
}

/**
 * 深拷贝
 * @param {any} obj - 要拷贝的对象
 * @returns {any} 拷贝后的对象
 */
export const deepClone = (obj) => {
    if (obj === null || typeof obj !== 'object') return obj
    if (obj instanceof Date) return new Date(obj)
    if (obj instanceof Array) return obj.map(item => deepClone(item))

    const clonedObj = {}
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            clonedObj[key] = deepClone(obj[key])
        }
    }

    return clonedObj
}

/**
 * 对象合并（深度合并）
 * @param {Object} target - 目标对象
 * @param {Object} source - 源对象
 * @returns {Object} 合并后的对象
 */
export const deepMerge = (target, source) => {
    const result = { ...target }

    for (const key in source) {
        if (source.hasOwnProperty(key)) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = deepMerge(result[key] || {}, source[key])
            } else {
                result[key] = source[key]
            }
        }
    }

    return result
}

/**
 * 生成唯一 ID
 * @param {string} prefix - 前缀（可选）
 * @returns {string} 唯一 ID
 */
export const generateId = (prefix = 'id') => {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 延迟函数
 * @param {number} ms - 延迟时间（毫秒）
 * @returns {Promise} Promise 对象
 */
export const delay = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 重试函数
 * @param {Function} fn - 要重试的函数
 * @param {number} retries - 重试次数
 * @param {number} delay - 重试延迟（毫秒）
 * @returns {Promise} Promise 对象
 */
export const retry = async (fn, retries = 3, delayMs = 1000) => {
    try {
        return await fn()
    } catch (error) {
        if (retries <= 0) throw error

        await delay(delayMs)
        return retry(fn, retries - 1, delayMs)
    }
}

/**
 * 数组去重
 * @param {Array} arr - 数组
 * @param {string} key - 对象数组的唯一键（可选）
 * @returns {Array} 去重后的数组
 */
export const unique = (arr, key) => {
    if (!Array.isArray(arr)) return []

    if (key) {
        const seen = new Set()
        return arr.filter(item => {
            const value = item[key]
            if (seen.has(value)) return false
            seen.add(value)
            return true
        })
    }

    return [...new Set(arr)]
}

/**
 * 数组分组
 * @param {Array} arr - 数组
 * @param {Function|string} fn - 分组函数或属性名
 * @returns {Object} 分组后的对象
 */
export const groupBy = (arr, fn) => {
    if (!Array.isArray(arr)) return {}

    return arr.reduce((groups, item) => {
        const key = typeof fn === 'function' ? fn(item) : item[fn]
        if (!groups[key]) groups[key] = []
        groups[key].push(item)
        return groups
    }, {})
}

/**
 * 下载文件
 * @param {string} url - 文件 URL
 * @param {string} filename - 文件名
 */
export const downloadFile = (url, filename) => {
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}

/**
 * 复制到剪贴板
 * @param {string} text - 要复制的文本
 * @returns {Promise<boolean>} 是否成功
 */
export const copyToClipboard = async (text) => {
    try {
        await navigator.clipboard.writeText(text)
        return true
    } catch (error) {
        console.error('复制失败:', error)
        return false
    }
}
