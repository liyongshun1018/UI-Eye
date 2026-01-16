/**
 * 对比相关常量
 */

// 对比引擎
export const COMPARE_ENGINE = {
    RESEMBLE: 'resemble',
    PIXELMATCH: 'pixelmatch'
} as const

export type CompareEngine = typeof COMPARE_ENGINE[keyof typeof COMPARE_ENGINE]

// 对比引擎文本
export const COMPARE_ENGINE_TEXT: Record<CompareEngine, string> = {
    [COMPARE_ENGINE.RESEMBLE]: 'Resemble.js',
    [COMPARE_ENGINE.PIXELMATCH]: 'PixelMatch'
}

// AI 模型
export const AI_MODEL = {
    SILICONFLOW: 'siliconflow',
    OPENAI: 'openai',
    NONE: 'none'
} as const

export type AIModel = typeof AI_MODEL[keyof typeof AI_MODEL]

// AI 模型文本
export const AI_MODEL_TEXT: Record<AIModel, string> = {
    [AI_MODEL.SILICONFLOW]: 'SiliconFlow',
    [AI_MODEL.OPENAI]: 'OpenAI',
    [AI_MODEL.NONE]: '不使用AI'
}

// 相似度等级
export const SIMILARITY_LEVEL = {
    EXCELLENT: 'excellent',  // >= 95
    GOOD: 'good',           // >= 90
    FAIR: 'fair',           // >= 80
    POOR: 'poor'            // < 80
} as const

export type SimilarityLevel = typeof SIMILARITY_LEVEL[keyof typeof SIMILARITY_LEVEL]

// 相似度等级文本
export const SIMILARITY_LEVEL_TEXT: Record<SimilarityLevel, string> = {
    [SIMILARITY_LEVEL.EXCELLENT]: '优秀',
    [SIMILARITY_LEVEL.GOOD]: '良好',
    [SIMILARITY_LEVEL.FAIR]: '一般',
    [SIMILARITY_LEVEL.POOR]: '较差'
}

// 相似度等级颜色
export const SIMILARITY_LEVEL_COLOR: Record<SimilarityLevel, string> = {
    [SIMILARITY_LEVEL.EXCELLENT]: '#52c41a',
    [SIMILARITY_LEVEL.GOOD]: '#73d13d',
    [SIMILARITY_LEVEL.FAIR]: '#faad14',
    [SIMILARITY_LEVEL.POOR]: '#ff4d4f'
}

/**
 * 获取相似度等级
 */
export function getSimilarityLevel(similarity: number): SimilarityLevel {
    if (similarity >= 95) return SIMILARITY_LEVEL.EXCELLENT
    if (similarity >= 90) return SIMILARITY_LEVEL.GOOD
    if (similarity >= 80) return SIMILARITY_LEVEL.FAIR
    return SIMILARITY_LEVEL.POOR
}
