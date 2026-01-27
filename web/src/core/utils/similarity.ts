/**
 * 相似度工具函数
 * 用于相似度分级和颜色编码
 */

/**
 * 相似度等级
 */
export type SimilarityLevel = 'excellent' | 'good' | 'warning' | 'poor'

/**
 * 根据相似度百分比返回等级
 * @param similarity 相似度百分比 (0-100)
 * @returns 相似度等级
 */
export function getSimilarityLevel(similarity: number): SimilarityLevel {
    if (similarity >= 90) return 'excellent'  // 优秀：90%+
    if (similarity >= 70) return 'good'       // 良好：70-90%
    if (similarity >= 50) return 'warning'    // 警告：50-70%
    return 'poor'                             // 差：<50%
}

/**
 * 根据相似度百分比返回颜色类名
 * @param similarity 相似度百分比 (0-100)
 * @returns CSS 类名
 */
export function getSimilarityClass(similarity: number): string {
    return `similarity-${getSimilarityLevel(similarity)}`
}

/**
 * 根据相似度百分比返回颜色值
 * @param similarity 相似度百分比 (0-100)
 * @returns 十六进制颜色值
 */
export function getSimilarityColor(similarity: number): string {
    const level = getSimilarityLevel(similarity)
    const colors: Record<SimilarityLevel, string> = {
        excellent: '#10b981', // 绿色
        good: '#3b82f6',      // 蓝色
        warning: '#f59e0b',   // 黄色
        poor: '#ef4444'       // 红色
    }
    return colors[level]
}

/**
 * 根据相似度百分比返回描述文字
 * @param similarity 相似度百分比 (0-100)
 * @returns 描述文字
 */
export function getSimilarityLabel(similarity: number): string {
    const level = getSimilarityLevel(similarity)
    const labels: Record<SimilarityLevel, string> = {
        excellent: '优秀',
        good: '良好',
        warning: '需优化',
        poor: '差异较大'
    }
    return labels[level]
}
