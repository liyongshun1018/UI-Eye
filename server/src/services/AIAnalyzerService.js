import AIModelFactory from '../models/AIModelFactory.js'

/**
 * AIAnalyzerService - 智能视觉语义诊断服务
 * 
 * 核心架构意图：
 * 1. 语义转化：将“像素级差异（冷数据）”通过多模态 AI (VLM) 转化为“开发者修复建议（热数据）”。
 * 2. 策略解耦：利用 ModelFactory 在 Qwen-VL、SiliconFlow 等不同供应端之间动态切换，透明化底层 API 差异。
 * 3. 稳健设计：执行“双轨分析制”，当云端 AI 超时或鉴权失败时，自动熔断并切回“规则引擎”，确保业务连续性。
 */
class AIAnalyzerService {
    /**
     * 服务初始化：注入模型工厂实例
     */
    constructor() {
        this.modelFactory = AIModelFactory
    }

    /**
     * 核心分析链路：诊断 UI 差异并产出修复补丁
     * 
     * @param {Object} images - 图像三元组（设计、实际、差异图物理路径）
     * @param {Object} compareResult - 像素比对量化指标（相似度、差异区域坐标等）
     * @param {string} modelType - 目标模型标识位（如 siliconflow, qwen-vl）
     * @returns {Promise<Array>} 结构化 CSS 修复建议集群
     */
    async analyze(images, compareResult, modelType = 'siliconflow') {
        console.log(`[AI 分析服务] 执行智能力量调度，目标架构: ${modelType}`)

        try {
            // 🚀 1. 实例委派：根据配置动态创建分析模型
            const model = this.modelFactory.createModel(modelType)

            // 🚀 2. 环境预检：校验 API 凭证完整性，防止任务由于未配置 Key 而在中途挂死
            if (!model.isConfigValid()) {
                console.warn('[AI 分析服务] 鉴权凭证缺失，执行主动策略回退：切换至【本地规则引擎】')
                return this.analyzeWithRules(compareResult)
            }

            // 🚀 3. 推理执行：向云端投递多模态分析请求
            const fixes = await model.analyze(images, compareResult)

            console.log(`[AI 分析服务] AI 分析逻辑闭环完成，成功拟合 ${fixes.length} 个修复方案`)
            return fixes
        } catch (error) {
            console.error('[AI 分析服务] 云端通讯链路中断:', error.message)
            console.warn('[AI 分析服务] 启动紧急避险程序：切回本地离线分析模式')

            // 🚀 4. 熔断保护：在大模型异常（如 401, 503, 429）时，强制返回基于像素统计的预设方案
            return this.analyzeWithRules(compareResult)
        }
    }

    /**
     * 启发式规则引擎 (Fallback Engine)
     * 设计初衷：作为 AI 的离线备选方案，通过数学模型（相似度 + 密度 + 位置）生成具备一定指向性的修复建议。
     * 
     * @param {Object} compareResult - 原始对比数据
     * @returns {Array} 基于经验法则生成的修复条目
     */
    analyzeWithRules(compareResult) {
        console.log('[AI 分析服务] 本地离线规则引擎装载中...')

        const fixes = []
        const { similarity, diffPixels, totalPixels } = compareResult

        // 准则一：大块布局对齐检测
        // 若相似度跌破 90%，通常意味着发生了浮动失效、Flex 换行或容器宽度溢出等结构化风险
        if (similarity < 90) {
            fixes.push({
                priority: 'high',
                type: 'layout',
                description: '检测到严重的结构性位移，当前布局无法自洽',
                selector: 'body > .container (估算)',
                currentCSS: '/* 布局逻辑异常 */',
                suggestedCSS: '/* 重点核查：width, box-sizing, flex-wrap */',
                impact: `相似度低至 (${similarity.toFixed(1)}%)，主容器可能未正确对齐设计稿中心线`
            })
        }

        // 准则二：微小间距抖动检测
        // 在 90%-95% 之间通常属于魔鬼细节（Padding, Margin, Gap）
        if (similarity >= 90 && similarity < 95) {
            fixes.push({
                priority: 'medium',
                type: 'spacing',
                description: '局部元素间距存在细微不一致',
                selector: 'div (具体元素需手动定位)',
                currentCSS: 'padding/margin: 略',
                suggestedCSS: '/* 建议动作：以设计稿 px 值为准校正间距 */',
                impact: '建议通过 Chrome 控制台针对红框标识区域进行 2-4px 的微调'
            })
        }

        // 准则三：整体色差冗余检测
        if (similarity >= 95 && similarity < 98) {
            fixes.push({
                priority: 'low',
                type: 'color',
                description: '视觉色彩存在亚像素级偏移',
                selector: 'universal',
                currentCSS: 'color/background: 未知数据',
                suggestedCSS: '/* 建议动作：检查文本色、投影色值 (Hex) */',
                impact: '边缘模糊或色值反差导致的小范围相似度下降'
            })
        }

        // 准则四：像素失真密度分析
        const diffRatio = (diffPixels / totalPixels) * 100
        if (diffRatio > 5 && similarity > 90) {
            fixes.push({
                priority: 'high',
                type: 'color',
                description: '大面积色块颜色冲突（可能缺少背景色）',
                selector: '.element',
                currentCSS: 'background-color: transparent;',
                suggestedCSS: 'background-color: [设计稿背景色];',
                impact: `差异覆盖率达 ${diffRatio.toFixed(1)}%，这往往代表了背景色块的缺失或背景图路径异常`
            })
        }

        console.log(`[AI 分析服务] 离线分析任务归档，已补充 ${fixes.length} 个备用修复锚点`)
        return fixes
    }

    /**
     * 获取系统支持的供应商列表
     */
    getAvailableModels() {
        return this.modelFactory.getAvailableModels()
    }

    /**
     * 实时校验模型联通性
     */
    validateModelConfig(modelType) {
        try {
            const model = this.modelFactory.createModel(modelType)
            return model.isConfigValid()
        } catch (error) {
            return false
        }
    }

    /**
     * 单点视觉诊断（浏览器插件联动接口）
     * 模式：针对鼠标悬停或通过插件选择的具体 DOM 元素进行局部对比
     */
    async diagnoseVision(actualImage, designImage, styles, elementInfo, modelType = 'siliconflow') {
        try {
            const model = this.modelFactory.createModel(modelType)

            if (!model.isConfigValid()) {
                throw new Error('当前选中的 AI 分析供应商凭证无效，请在服务端 .env 中配置 API Key')
            }

            // 调用模型的“点对点”诊断接口
            return await model.diagnose(actualImage, designImage, styles, elementInfo)
        } catch (error) {
            console.error('[AI 分析服务] 实时点选诊断链路中断:', error.message)
            throw error
        }
    }
}

export default AIAnalyzerService
