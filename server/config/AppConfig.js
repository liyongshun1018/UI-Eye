/**
 * 应用配置管理类（单例模式）
 * 负责加载和管理所有应用配置
 */
class AppConfig {
    static instance = null

    /**
     * 构造函数（私有化，确保单例）
     */
    constructor() {
        if (AppConfig.instance) {
            return AppConfig.instance
        }

        this.loadConfig()
        AppConfig.instance = this
    }

    /**
     * 加载环境配置
     */
    loadConfig() {
        // 服务器配置
        this.port = process.env.PORT || 3000

        // AI 模型配置
        this.aiModels = {
            qwen: {
                name: '千问 2.5',
                endpoint: process.env.QWEN_API_ENDPOINT || 'http://internal-qwen-api.company.com/v1/chat/completions',
                apiKey: process.env.QWEN_API_TOKEN || '',
                modelName: process.env.QWEN_MODEL_NAME || 'qwen-2.5-vl',
                environment: 'internal'
            },
            siliconflow: {
                name: '硅基流动',
                endpoint: process.env.SILICONFLOW_API_ENDPOINT || 'https://api.siliconflow.cn/v1/chat/completions',
                apiKey: process.env.SILICONFLOW_API_KEY || '',
                modelName: process.env.SILICONFLOW_MODEL_NAME || 'Qwen/Qwen2.5-72B-Instruct',
                environment: 'external'
            }
        }

        // 数据库配置
        this.database = {
            retentionDays: parseInt(process.env.REPORT_RETENTION_DAYS) || 7
        }

        // 蓝湖配置
        this.lanhu = {
            apiToken: process.env.LANHU_API_TOKEN || ''
        }
    }

    /**
     * 获取配置实例（单例）
     * @returns {AppConfig} 配置实例
     */
    static getInstance() {
        if (!AppConfig.instance) {
            new AppConfig()
        }
        return AppConfig.instance
    }

    /**
     * 获取服务器端口
     * @returns {number} 端口号
     */
    getPort() {
        return this.port
    }

    /**
     * 获取 AI 模型配置
     * @param {string} modelType - 模型类型 (qwen/siliconflow)
     * @returns {Object} 模型配置对象
     */
    getAIModelConfig(modelType) {
        const config = this.aiModels[modelType]
        if (!config) {
            throw new Error(`不支持的 AI 模型类型: ${modelType}`)
        }
        return config
    }

    /**
     * 获取所有可用的 AI 模型
     * @returns {Array} 模型列表
     */
    getAvailableAIModels() {
        return Object.keys(this.aiModels).filter(key => {
            const config = this.aiModels[key]
            return config.apiKey && config.apiKey !== ''
        })
    }

    /**
     * 获取数据库配置
     * @returns {Object} 数据库配置
     */
    getDatabaseConfig() {
        return this.database
    }

    /**
     * 获取蓝湖配置
     * @returns {Object} 蓝湖配置
     */
    getLanhuConfig() {
        return this.lanhu
    }

    /**
     * 验证配置是否完整
     * @returns {Object} 验证结果
     */
    validate() {
        const errors = []
        const warnings = []

        // 检查是否至少配置了一个 AI 模型
        const availableModels = this.getAvailableAIModels()
        if (availableModels.length === 0) {
            warnings.push('未配置任何 AI 模型，将使用规则引擎降级')
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            availableModels
        }
    }
}

export default AppConfig
