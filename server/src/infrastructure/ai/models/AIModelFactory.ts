import { AIModelBase } from './AIModelBase.js';
import { QwenModel } from './QwenModel.js';
import { SiliconFlowModel } from './SiliconFlowModel.js';
import { ConfigService } from '../../config/ConfigService.js';

/**
 * AI 模型工厂类
 * 职责：作为中间层，负责根据业务配置动态实例化具体的 AI 驱动程序
 * 设计模式：工厂模式
 */
export class AIModelFactory {
    /**
     * 根据类型创建 AI 模型实例
     * @param modelType 供应商类型标识 (qwen | siliconflow)
     * @returns 具体的模型实例
     */
    static createModel(modelType: 'qwen' | 'siliconflow'): AIModelBase {
        const modelConfig = ConfigService.getAIModelConfig(modelType);

        switch (modelType) {
            case 'qwen':
                return new QwenModel(modelConfig);
            case 'siliconflow':
                return new SiliconFlowModel(modelConfig);
            default:
                throw new Error(`[工厂错误] 不支持的 AI 供应商类型: ${modelType}`);
        }
    }

    /**
     * 获取系统默认推荐模型
     * 逻辑：优先检测具备有效 API Key 的模型，SiliconFlow 优先级最高
     */
    static getDefaultModel(): AIModelBase {
        const config = ConfigService.getConfig();

        // 尝试加载 SiliconFlow
        if (config.SILICONFLOW_API_KEY) {
            return this.createModel('siliconflow');
        }

        // 尝试加载 Qwen
        if (config.QWEN_API_KEY) {
            return this.createModel('qwen');
        }

        // 回退逻辑：如果都没配置，则返回 SiliconFlow 实例（触发配置无效报错）
        return this.createModel('siliconflow');
    }
}
