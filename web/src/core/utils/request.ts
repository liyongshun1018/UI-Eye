import axios, { type AxiosInstance, type InternalAxiosRequestConfig, type AxiosRequestConfig, type AxiosResponse, type AxiosError } from 'axios'
import { useDialog } from '@modules/composables/useDialog'

/**
 * 扩展外部配置接口，支持控制是否显示全局错误提示或 Loading 动画
 */
declare module 'axios' {
    export interface AxiosRequestConfig {
        showError?: boolean     // 是否在失败时自动弹出 dialog 提示
        showLoading?: boolean   // 是否显示全局加载蒙层
    }
}

// 创建单一的 Axios 实例，复用底层连接池
const request: AxiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json'
    }
})

/**
 * 请求拦截器：在发送请求前统一注入属性
 */
request.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        // 后续在此处注入全局认证 Token
        // config.headers.Authorization = `Bearer ...`
        return config
    },
    (error: AxiosError) => {
        console.error('网络请求配置异常:', error)
        return Promise.reject(error)
    }
)

// 响应拦截器
request.interceptors.response.use(
    (response: AxiosResponse) => {
        // 隐藏 loading
        // hideLoading()

        // 直接返回 data
        return response.data
    },
    (error: AxiosError) => {
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
                    errorMessage = (data as any).message || '请求参数错误'
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
                    errorMessage = (data as any).message || `请求失败 (${status})`
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
 */
export const get = <T = any>(
    url: string,
    params?: any,
    config?: AxiosRequestConfig
): Promise<T> => {
    return request.get(url, { params, ...config })
}

/**
 * POST 请求
 */
export const post = <T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
): Promise<T> => {
    return request.post(url, data, config)
}

/**
 * PUT 请求
 */
export const put = <T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
): Promise<T> => {
    return request.put(url, data, config)
}

/**
 * DELETE 请求
 */
export const del = <T = any>(
    url: string,
    config?: AxiosRequestConfig
): Promise<T> => {
    return request.delete(url, config)
}

/**
 * 上传文件
 */
export const upload = <T = any>(
    url: string,
    formData: FormData,
    onProgress?: (percent: number) => void
): Promise<T> => {
    return request.post(url, formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent: any) => {
            if (onProgress && progressEvent.total) {
                const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
                onProgress(percent)
            }
        }
    })
}

export default request
