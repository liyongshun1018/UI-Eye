// API 基础配置
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

// AI 模型配置
export const AI_MODELS = {
    QWEN_INTERNAL: {
        name: '千问 2.5（内网）',
        value: 'qwen',
        environment: 'internal'
    },
    SILICONFLOW_EXTERNAL: {
        name: '硅基流动（外网）',
        value: 'siliconflow',
        environment: 'external'
    }
} as const

// 对比模式配置
export const COMPARE_MODES = {
    UPLOAD: {
        name: '效果图上传',
        value: 'upload',
        description: '上传本地设计稿图片进行对比'
    },
    LANHU: {
        value: 'lanhu',
        name: '图片 URL',
        icon: '🔗',
        description: '输入远程图片直链地址'
    }
} as const

// 视口尺寸预设
export const VIEWPORT_PRESETS = [
    { name: 'iPhone SE', width: 375, height: 667 },
    { name: 'iPhone 12/13', width: 390, height: 844 },
    { name: 'iPhone 12/13 Pro Max', width: 428, height: 926 },
    { name: 'iPad', width: 768, height: 1024 },
    { name: 'iPad Pro', width: 1024, height: 1366 },
    { name: '自定义', width: 0, height: 0 }
]

// 优先级配置
export const PRIORITY_LEVELS = {
    HIGH: { label: '高', color: '#ef4444', value: 'high' },
    MEDIUM: { label: '中', color: '#f59e0b', value: 'medium' },
    LOW: { label: '低', color: '#10b981', value: 'low' }
} as const

// 差异类型配置
export const DIFF_TYPES = {
    COLOR: { label: '颜色', icon: '🎨', value: 'color' },
    FONT: { label: '字体', icon: '📝', value: 'font' },
    SPACING: { label: '间距', icon: '📏', value: 'spacing' },
    LAYOUT: { label: '布局', icon: '📐', value: 'layout' }
} as const
