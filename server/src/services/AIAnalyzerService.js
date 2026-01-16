import AIModelFactory from '../models/AIModelFactory.js'

/**
 * AIAnalyzerService.js - AI 视觉语义分析服务
 * 核心职责：将“像素级差异”转化为“开发者的修复建议”。
 * 通过调用多模态大模型（如通义千问、SiliconFlow 等）分析设计稿与截图的差异，生成可直接复制的 CSS 代码。
 */
class AIAnalyzerService {
    /**
     * 构造 AI 分析服务
     * 依赖模型工厂来灵活切换不同的 AI 供应商。
     */
    constructor() {
        this.modelFactory = AIModelFactory
    }

    /**
     * 执行 UI 差异分析
     * 流程：选择模型 -> 校验 API 配置 -> 调用大模型分析 -> (失败时) 自动降级至本地规则引擎。
     * @param {Object} images - 包含设计稿、实际截图和差异图路径的对象
     * @param {Object} compareResult - 包含相似度、像素差异等统计数据的对比结果
     * @param {string} modelType - 选用的模型供应商类型 (qwen/siliconflow)
     * @returns {Promise<Array>} 返回 CSS 修复建议数组
     */
    async analyze(images, compareResult, modelType = 'siliconflow') {
        console.log(`[AI 分析服务] 启动智能力量，当前选座: ${modelType}`)

        try {
            // 1. 根据类型创建具体的 AI 执行模型（策略模式）
            const model = this.modelFactory.createModel(modelType)

            // 2. 预检：检查环境环境变量或 API Key 是否配置完整
            if (!model.isConfigValid()) {
                console.warn('[AI 分析服务] AI 密钥未配置或无效，系统已自动切换至“本地规则分析器”进行降级处理')
                return this.analyzeWithRules(compareResult)
            }

            // 3. 执行核心 AI 分析逻辑：将图片发给大模型并解析返回的 JSON 修复建议
            const fixes = await model.analyze(images, compareResult)

            console.log(`[AI 分析服务] AI 分析大获全胜，已捕捉 ${fixes.length} 个可能的样式漏洞`)
            return fixes
        } catch (error) {
            console.error('[AI 分析服务] AI 链路发生崩塌:', error.message)
            console.warn('[AI 分析服务] 为了保障核心业务不中断，系统已执行紧急降级')
            // 4. 容错处理：如果网络波动或 API 限制，回退到基于统计学的规则分析
            return this.analyzeWithRules(compareResult)
        }
    }

    /**
     * 规则引擎分析 (降级方案)
     * 当 AI 不可用时，基于相似度阈值和差异像素占比，给出一些通用性的启发式修复建议。
     * 虽然精度不如 AI，但能保证报告页不留白。
     * @param {Object} compareResult 
     * @returns {Array}
     */
    analyzeWithRules(compareResult) {
        console.log('[AI 分析服务] 正在运行启发式规则引擎...')

        const fixes = []
        const { similarity, diffPixels, totalPixels } = compareResult

        // 规则 1: 基础相似度检测 (90% 以下通常涉及大块容器错位)
        if (similarity < 90) {
            fixes.push({
                priority: 'high',
                type: 'layout',
                description: '整体布局存在重大偏差，请检查外层容器宽度及盒模型',
                selector: 'body',
                currentCSS: '/* 当前容器布局可能不匹配 */',
                suggestedCSS: '/* 建议动作：检查 box-sizing, max-width 及 flex 属性 */',
                impact: `当前相似度极低 (${similarity.toFixed(1)}%)，这通常意味着存在结构性的布局问题`
            })
        }

        // 规则 2: 细节间距微调 (90%-95% 之间通常是 Padding/Margin 问题)
        if (similarity >= 90 && similarity < 95) {
            fixes.push({
                priority: 'medium',
                type: 'spacing',
                description: '检测到容器间距存在细微未对齐',
                selector: '.container',
                currentCSS: 'padding: 10px; margin: 15px;',
                suggestedCSS: 'padding: 12px; margin: 16px;',
                impact: '建议微调容器的间距值以匹配设计稿'
            })
        }

        // 规则 3: 色值轻微偏差
        if (similarity >= 95 && similarity < 98) {
            fixes.push({
                priority: 'low',
                type: 'color',
                description: '视觉色彩存在轻微偏差',
                selector: '.text',
                currentCSS: 'color: #333333;',
                suggestedCSS: 'color: #000000;',
                impact: '边缘色值不匹配，建议检查主题色配置'
            })
        }

        // 像素密度规则：当差异点非常集中且面积较大时补充建议
        const diffRatio = (diffPixels / totalPixels) * 100
        if (diffRatio > 5 && similarity > 90) {
            fixes.push({
                priority: 'high',
                type: 'color',
                description: '背景色或大面积色块不一致',
                selector: '.element',
                currentCSS: 'background-color: #f0f0f0;',
                suggestedCSS: 'background-color: #ffffff;',
                impact: `约 ${diffRatio.toFixed(1)}% 的像素失真，请重点核对背景色值`
            })
        }

        console.log(`[AI 分析服务] 规则引擎运行完毕，已生成 ${fixes.length} 条备用建议`)
        return fixes
    }

    /**
     * 获取当前系统支持的所有 AI 模型列表
     */
    getAvailableModels() {
        return this.modelFactory.getAvailableModels()
    }

    /**
     * 校验指定模型的 API 环境是否已就绪
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
