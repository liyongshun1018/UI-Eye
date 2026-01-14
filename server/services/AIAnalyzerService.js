import AIModelFactory from '../models/AIModelFactory.js'

/**
 * AI 分析服务类
 * 负责调用 AI 模型分析 UI 差异并生成修复建议
 */
class AIAnalyzerService {
    /**
     * 构造函数
     */
    constructor() {
        this.modelFactory = AIModelFactory
    }

    /**
     * 分析 UI 差异
     * @param {Object} images - 图片信息
     * @param {string} images.design - 设计稿路径
     * @param {string} images.actual - 实际页面路径
     * @param {string} images.diff - 差异图路径
     * @param {Object} compareResult - 对比结果
     * @param {number} compareResult.similarity - 相似度
     * @param {number} compareResult.diffPixels - 差异像素数
     * @param {number} compareResult.totalPixels - 总像素数
     * @param {string} modelType - 模型类型 (qwen/siliconflow)
     * @returns {Promise<Array>} CSS 修复建议列表
     */
    async analyze(images, compareResult, modelType = 'siliconflow') {
        console.log(`[AI 分析服务] 开始分析，使用模型: ${modelType}`)

        try {
            // 创建 AI 模型实例
            const model = this.modelFactory.createModel(modelType)

            // 验证配置
            if (!model.isConfigValid()) {
                console.warn('[AI 分析服务] AI 模型配置无效，使用规则引擎降级')
                return this.analyzeWithRules(compareResult)
            }

            // 调用 AI 模型分析
            const fixes = await model.analyze(images, compareResult)

            console.log(`[AI 分析服务] 分析完成，获得 ${fixes.length} 条修复建议`)
            return fixes
        } catch (error) {
            console.error('[AI 分析服务] AI 分析失败:', error.message)
            console.warn('[AI 分析服务] 降级到规则引擎')
            return this.analyzeWithRules(compareResult)
        }
    }

    /**
     * 规则引擎分析（降级方案）
     * 基于相似度和差异像素数生成基础修复建议
     * @param {Object} compareResult - 对比结果
     * @returns {Array} 修复建议列表
     */
    analyzeWithRules(compareResult) {
        console.log('[AI 分析服务] 使用规则引擎分析')

        const fixes = []
        const { similarity, diffPixels, totalPixels } = compareResult

        // 基于相似度生成建议
        if (similarity < 90) {
            fixes.push({
                priority: 'high',
                type: 'layout',
                description: '整体布局存在较大差异',
                selector: 'body',
                currentCSS: '/* 当前布局 */',
                suggestedCSS: '/* 建议检查容器宽度、padding、margin 等布局属性 */',
                impact: `相似度仅为 ${similarity.toFixed(1)}%，建议优先修复布局问题`
            })
        }

        if (similarity >= 90 && similarity < 95) {
            fixes.push({
                priority: 'medium',
                type: 'spacing',
                description: '间距存在细微差异',
                selector: '.container',
                currentCSS: 'padding: 10px; margin: 15px;',
                suggestedCSS: 'padding: 12px; margin: 16px;',
                impact: '建议调整容器的 padding 和 margin 值'
            })
        }

        if (similarity >= 95 && similarity < 98) {
            fixes.push({
                priority: 'low',
                type: 'color',
                description: '颜色存在轻微差异',
                selector: '.text',
                currentCSS: 'color: #333333;',
                suggestedCSS: 'color: #000000;',
                impact: '细微的颜色差异，可选择性修复'
            })
        }

        // 如果相似度很高，返回空建议
        if (similarity >= 98) {
            return []
        }

        // 基于差异像素数量添加更多建议
        const diffRatio = (diffPixels / totalPixels) * 100

        if (diffRatio > 5) {
            fixes.push({
                priority: 'high',
                type: 'color',
                description: '颜色差异较大',
                selector: '.element',
                currentCSS: 'background-color: #f0f0f0;',
                suggestedCSS: 'background-color: #ffffff;',
                impact: `${diffRatio.toFixed(1)}% 的像素存在差异，建议检查背景色和文字颜色`
            })
        }

        console.log(`[AI 分析服务] 规则引擎生成 ${fixes.length} 条建议`)
        return fixes
    }

    /**
     * 获取可用的 AI 模型列表
     * @returns {Array<string>} 模型类型列表
     */
    getAvailableModels() {
        return this.modelFactory.getAvailableModels()
    }

    /**
     * 验证模型配置
     * @param {string} modelType - 模型类型
     * @returns {boolean} 配置是否有效
     */
    validateModelConfig(modelType) {
        try {
            const model = this.modelFactory.createModel(modelType)
            return model.isConfigValid()
        } catch (error) {
            return false
        }
    }
}

export default AIAnalyzerService
