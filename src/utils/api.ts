import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { API_BASE_URL } from '@/config/constants'
import type { ApiResponse } from '@/types'

// 创建 axios 实例
const apiClient: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 60000, // 60 秒超时
    headers: {
        'Content-Type': 'application/json'
    }
})

// 请求拦截器
apiClient.interceptors.request.use(
    (config) => {
        // 可以在这里添加 token 等认证信息
        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)

// 响应拦截器
apiClient.interceptors.response.use(
    (response: AxiosResponse<ApiResponse>) => {
        return response
    },
    (error) => {
        // 统一错误处理
        const message = error.response?.data?.message || error.message || '请求失败'
        console.error('API Error:', message)
        return Promise.reject(error)
    }
)

// API 方法封装
export const api = {
    // 通用 GET 请求
    get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        return apiClient.get(url, config).then(res => res.data)
    },

    // 通用 POST 请求
    post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        return apiClient.post(url, data, config).then(res => res.data)
    },

    // 文件上传
    upload<T = any>(url: string, file: File, onProgress?: (progress: number) => void): Promise<ApiResponse<T>> {
        const formData = new FormData()
        formData.append('file', file)

        return apiClient.post(url, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            },
            onUploadProgress: (progressEvent) => {
                if (onProgress && progressEvent.total) {
                    const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
                    onProgress(progress)
                }
            }
        }).then(res => res.data)
    }
}

export default apiClient
