/**
 * AI 模型抽象基类
 * 定义所有 AI 模型的通用接口和行为
 */
class AIModelBase {
    /**
     * 构造函数
     * @param {Object} config - 模型配置
     * @param {string} config.name - 模型名称
     * @param {string} config.endpoint - API 端点
     * @param {string} config.apiKey - API 密钥
     * @param {string} config.modelName - 模型名称
     */
    constructor(config) {
        this.name = config.name
        this.endpoint = config.endpoint
        this.apiKey = config.apiKey
        this.modelName = config.modelName
        this.environment = config.environment
    }

    /**
     * 分析 UI 差异（抽象方法，子类必须实现）
     * @param {Object} images - 图片信息
     * @param {string} images.design - 设计稿路径
     * @param {string} images.actual - 实际页面路径
     * @param {string} images.diff - 差异图路径
     * @param {Object} compareResult - 对比结果
     * @param {number} compareResult.similarity - 相似度
     * @param {number} compareResult.diffPixels - 差异像素数
     * @param {number} compareResult.totalPixels - 总像素数
     * @returns {Promise<Array>} CSS 修复建议列表
     */
    async analyze(images, compareResult) {
        throw new Error('子类必须实现 analyze 方法')
    }

    /**
     * 视觉诊断（用于插件等单次对比场景）
     * @param {string} actualBase64 - 实测图 Base64
     * @param {string} designBase64 - 设计稿 Base64
     * @param {Object} styles - 计算样式集
     * @param {Object} info - 元素元数据
     * @returns {Promise<string>} 诊断报告文本
     */
    async diagnose(actualBase64, designBase64, styles, info) {
        throw new Error('子类必须实现 diagnose 方法')
    }

    /**
     * 验证配置是否有效
     * @returns {boolean} 配置是否有效
     */
    isConfigValid() {
        return !!(this.endpoint && this.apiKey && this.apiKey !== 'your-qwen-token' && this.apiKey !== 'your-siliconflow-key-here')
    }

    /**
     * 获取模型信息
     * @returns {Object} 模型信息
     */
    getInfo() {
        return {
            name: this.name,
            modelName: this.modelName,
            environment: this.environment,
            isValid: this.isConfigValid()
        }
    }

    /**
     * 构建分析提示词
     * @param {Object} compareResult - 对比结果
     * @returns {string} 提示词
     */
    buildPrompt(compareResult) {
        return `你是一个专业的前端 UI 审查专家。请对比以下信息：

设计稿与实际页面的相似度：${compareResult.similarity}%
差异像素数：${compareResult.diffPixels}
总像素数：${compareResult.totalPixels}

请分析可能的差异原因，并给出具体的 CSS 修复建议。

输出格式为 JSON 数组：
[
  {
    "priority": "high|medium|low",
    "type": "color|font|spacing|layout",
    "description": "差异描述",
    "selector": "CSS 选择器",
    "currentCSS": "当前样式",
    "suggestedCSS": "建议样式",
    "impact": "影响说明"
  }
]`
    }

    /**
     * 记录日志
     * @param {string} message - 日志消息
     * @param {string} level - 日志级别
     */
    log(message, level = 'info') {
        const prefix = `[${this.name}]`
        switch (level) {
            case 'error':
                console.error(prefix, message)
                break
            case 'warn':
                console.warn(prefix, message)
                break
            default:
                console.log(prefix, message)
        }
    }
}

export default AIModelBase
