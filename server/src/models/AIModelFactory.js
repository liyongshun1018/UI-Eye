import QwenModel from './QwenModel.js'
import SiliconFlowModel from './SiliconFlowModel.js'
import AppConfig from '../config/AppConfig.js'

/**
 * AI 模型工厂类（工厂模式）
 * 负责根据配置创建对应的 AI 模型实例
 */
class AIModelFactory {
    /**
     * 创建 AI 模型实例
     * @param {string} modelType - 模型类型 (qwen/siliconflow)
     * @returns {AIModelBase} AI 模型实例
     * @throws {Error} 当模型类型不支持时抛出错误
     */
    static createModel(modelType) {
        const config = AppConfig.getInstance()
        const modelConfig = config.getAIModelConfig(modelType)

        switch (modelType) {
            case 'qwen':
                return new QwenModel(modelConfig)
            case 'siliconflow':
                return new SiliconFlowModel(modelConfig)
            default:
                throw new Error(`不支持的 AI 模型类型: ${modelType}`)
        }
    }

    /**
     * 获取所有可用的模型类型
     * @returns {Array<string>} 可用模型类型列表
     */
    static getAvailableModels() {
        const config = AppConfig.getInstance()
        return config.getAvailableAIModels()
    }

    /**
     * 获取默认模型
     * @returns {AIModelBase} 默认 AI 模型实例
     */
    static getDefaultModel() {
        const availableModels = AIModelFactory.getAvailableModels()

        if (availableModels.length === 0) {
            throw new Error('没有可用的 AI 模型，请检查配置')
        }

        // 优先使用硅基流动，其次是千问
        const defaultType = availableModels.includes('siliconflow') ? 'siliconflow' : availableModels[0]
        return AIModelFactory.createModel(defaultType)
    }
}

export default AIModelFactory
