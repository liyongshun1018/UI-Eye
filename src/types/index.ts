// 对比配置接口
export interface CompareConfig {
    url: string
    mode: 'upload' | 'lanhu'
    designSource: string // 文件路径或蓝湖链接
    aiModel: 'qwen' | 'siliconflow' | 'gpt4' | 'claude'
    engine?: 'pixelmatch' | 'resemble' // 对比引擎
    ignoreAntialiasing?: boolean // 是否忽略抗锯齿
    viewport: {
        width: number
        height: number
    }
    options?: {
        tolerance?: number // 容差值 0-100
        ignoreRegions?: Array<{
            x: number
            y: number
            width: number
            height: number
        }>
    }
}

// CSS 修复建议接口
export interface CSSFix {
    priority: 'critical' | 'high' | 'medium' | 'low'
    type: 'color' | 'font' | 'spacing' | 'layout'
    description: string
    selector: string
    currentCSS: string
    suggestedCSS: string
    impact?: string
}

// 差异区域接口
export interface DiffRegion {
    id: number
    x: number
    y: number
    width: number
    height: number
    pixelCount: number
    type: 'layout' | 'major' | 'medium' | 'minor'
    description: string
    // 优先级相关字段
    priority: 'critical' | 'high' | 'medium' | 'low'
    score: number  // 0-100
}

// 对比报告接口
export interface CompareReport {
    id: string
    timestamp: number
    config: CompareConfig
    similarity: number // 0-100
    diffPixels: number
    totalPixels: number
    images: {
        design: string
        actual: string
        diff: string
    }
    diffImage?: {
        path: string
        url: string
        annotatedPath?: string
        annotatedUrl?: string
    }
    diffRegions?: DiffRegion[]
    fixes: CSSFix[]
    status: 'pending' | 'processing' | 'completed' | 'failed'
    error?: string
}

// API 响应接口
export interface ApiResponse<T = any> {
    success: boolean
    data?: T
    message?: string
    error?: string
}

// 上传文件响应
export interface UploadResponse {
    filename: string
    path: string
    url: string
}

// 蓝湖设计稿响应
export interface LanhuDesignResponse {
    imageUrl: string
    filename: string
    width: number
    height: number
    format?: string
    size?: number
}
