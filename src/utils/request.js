/**
 * 统一的 HTTP 请求封装
 * 基于 axios，提供统一的请求/响应拦截、错误处理、loading 管理
 */

import axios from 'axios'
import { useDialog } from '@/composables/useDialog'

// 创建 axios 实例
const request = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json'
    }
})

// 请求拦截器
request.interceptors.request.use(
    (config) => {
        // 可以在这里添加 token
        // const token = localStorage.getItem('token')
        // if (token) {
        //   config.headers.Authorization = `Bearer ${token}`
        // }

        // 可以在这里添加全局 loading
        // if (config.showLoading !== false) {
        //   showLoading()
        // }

        return config
    },
    (error) => {
        console.error('请求错误:', error)
        return Promise.reject(error)
    }
)

// 响应拦截器
request.interceptors.response.use(
    (response) => {
        // 隐藏 loading
        // hideLoading()

        // 直接返回 data
        return response.data
    },
    (error) => {
        // 隐藏 loading
        // hideLoading()

        // 统一错误处理
        const { showError } = useDialog()

        let errorMessage = '请求失败，请重试'

        if (error.response) {
            // 服务器返回错误状态码
            const { status, data } = error.response

            switch (status) {
                case 400:
                    errorMessage = data.message || '请求参数错误'
                    break
                case 401:
                    errorMessage = '未授权，请登录'
                    // 可以在这里跳转到登录页
                    // router.push('/login')
                    break
                case 403:
                    errorMessage = '拒绝访问'
                    break
                case 404:
                    errorMessage = '请求的资源不存在'
                    break
                case 500:
                    errorMessage = '服务器错误'
                    break
                case 503:
                    errorMessage = '服务暂时不可用'
                    break
                default:
                    errorMessage = data.message || `请求失败 (${status})`
            }
        } else if (error.request) {
            // 请求已发送但没有收到响应
            errorMessage = '网络错误，请检查网络连接'
        } else {
            // 请求配置出错
            errorMessage = error.message || '请求配置错误'
        }

        // 显示错误提示（可以根据配置决定是否显示）
        if (error.config?.showError !== false) {
            showError(errorMessage)
        }

        return Promise.reject(error)
    }
)

/**
 * GET 请求
 * @param {string} url - 请求 URL
 * @param {Object} params - 查询参数
 * @param {Object} config - axios 配置
 * @returns {Promise} Promise 对象
 */
export const get = (url, params, config = {}) => {
    return request.get(url, { params, ...config })
}

/**
 * POST 请求
 * @param {string} url - 请求 URL
 * @param {Object} data - 请求数据
 * @param {Object} config - axios 配置
 * @returns {Promise} Promise 对象
 */
export const post = (url, data, config = {}) => {
    return request.post(url, data, config)
}

/**
 * PUT 请求
 * @param {string} url - 请求 URL
 * @param {Object} data - 请求数据
 * @param {Object} config - axios 配置
 * @returns {Promise} Promise 对象
 */
export const put = (url, data, config = {}) => {
    return request.put(url, data, config)
}

/**
 * DELETE 请求
 * @param {string} url - 请求 URL
 * @param {Object} config - axios 配置
 * @returns {Promise} Promise 对象
 */
export const del = (url, config = {}) => {
    return request.delete(url, config)
}

/**
 * 上传文件
 * @param {string} url - 上传 URL
 * @param {FormData} formData - 表单数据
 * @param {Function} onProgress - 进度回调
 * @returns {Promise} Promise 对象
 */
export const upload = (url, formData, onProgress) => {
    return request.post(url, formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
            if (onProgress) {
                const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
                onProgress(percent)
            }
        }
    })
}

export default request
