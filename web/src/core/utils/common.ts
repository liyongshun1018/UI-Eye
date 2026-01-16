/**
 * 通用工具函数
 * 提供防抖、节流、深拷贝等常用功能
 */

type AnyFunction = (...args: any[]) => any

/**
 * 防抖函数
 */
export const debounce = <T extends AnyFunction>(fn: T, delay: number = 300): ((...args: Parameters<T>) => void) => {
    let timer: NodeJS.Timeout | null = null

    return function (this: any, ...args: Parameters<T>) {
        if (timer) clearTimeout(timer)

        timer = setTimeout(() => {
            fn.apply(this, args)
            timer = null
        }, delay)
    }
}

/**
 * 节流函数
 */
export const throttle = <T extends AnyFunction>(fn: T, delay: number = 300): ((...args: Parameters<T>) => void) => {
    let lastTime = 0

    return function (this: any, ...args: Parameters<T>) {
        const now = Date.now()

        if (now - lastTime >= delay) {
            fn.apply(this, args)
            lastTime = now
        }
    }
}

/**
 * 深拷贝
 */
export const deepClone = <T>(obj: T): T => {
    if (obj === null || typeof obj !== 'object') return obj
    if (obj instanceof Date) return new Date(obj) as any
    if (obj instanceof Array) return obj.map(item => deepClone(item)) as any

    const clonedObj: any = {}
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            clonedObj[key] = deepClone(obj[key])
        }
    }

    return clonedObj
}

/**
 * 对象合并（深度合并）
 */
export const deepMerge = <T extends Record<string, any>>(target: T, source: Partial<T>): T => {
    const result = { ...target }

    for (const key in source) {
        if (source.hasOwnProperty(key)) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = deepMerge(result[key] || {} as any, source[key] as any)
            } else {
                result[key] = source[key] as any
            }
        }
    }

    return result
}

/**
 * 生成唯一 ID
 */
export const generateId = (prefix: string = 'id'): string => {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 延迟函数
 */
export const delay = (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 重试函数
 */
export const retry = async <T>(fn: () => Promise<T>, retries: number = 3, delayMs: number = 1000): Promise<T> => {
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
 */
export const unique = <T>(arr: T[], key?: keyof T): T[] => {
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
 */
export const groupBy = <T>(arr: T[], fn: ((item: T) => string) | keyof T): Record<string, T[]> => {
    if (!Array.isArray(arr)) return {}

    return arr.reduce((groups, item) => {
        const key = typeof fn === 'function' ? fn(item) : String(item[fn])
        if (!groups[key]) groups[key] = []
        groups[key].push(item)
        return groups
    }, {} as Record<string, T[]>)
}

/**
 * 下载文件
 */
export const downloadFile = (url: string, filename: string): void => {
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}

/**
 * 复制到剪贴板
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
        await navigator.clipboard.writeText(text)
        return true
    } catch (error) {
        console.error('复制失败:', error)
        return false
    }
}
