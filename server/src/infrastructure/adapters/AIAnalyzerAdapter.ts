import { IAIProvider } from '../../domain/services/IAIProvider.js';
import { AIModelFactory } from '../ai/models/AIModelFactory.js';

/**
 * AIAnalyzerAdapter - AI 智能视觉分析适配器
 * 职责：实现 IAIProvider 接口，负责对接大语言模型 (LLM) 以完成“视觉还原度审计”
 * 设计模式：桥接模式，将业务层的抽象接口与具体的模型实现解耦
 */
export class AIAnalyzerAdapter implements IAIProvider {
    /**
     * 调用 AI 执行多图差异分析
     * @param images 图片物理路径快照
     * @param compareResult 像素比对基础指标
     * @returns 结构化的 CSS 修复建议数组
     */
    async analyze(images: { design: string; actual: string; diff: string }, compareResult: any): Promise<any[]> {
        try {
            // 1. 通过工厂获取当前选定的 AI 驱动程序（如 SiliconFlow 或 Qwen）
            const model = AIModelFactory.getDefaultModel();

            // 2. 检查模型状态：若 API Key 等核心配置缺失，则优雅降级，返回空列表而非让整个链路崩溃
            if (!model.isConfigValid()) {
                console.warn('[AI适配器] 当前未配置有效的 AI 供应商密钥，已跳过辅助审计环节');
                return [];
            }

            // 3. 委派给底层模型实现类执行多模态推理
            return await model.analyze(images, compareResult);
        } catch (error: any) {
            console.error('[AI适配器] 多模态分析链路异常:', error.message);
            // 容错机制：AI 层非核心阻塞步骤，即便失败也应允许生成基础报告
            return [];
        }
    }

    /**
     * 调用 AI 执行 Chrome 插件侧的实时视觉诊断
     * @param actualBase64 实测元素快照 (Base64)
     * @param designBase64 关联设计稿快照 (Base64)
     * @param styles 实时计算样式
     * @param elementInfo DOM 元素元数据
     * @returns Markdown 格式的详细诊断文本
     */
    async diagnoseVision(actualBase64: string, designBase64: string, styles: any, elementInfo: any, similarity?: number): Promise<string> {
        try {
            const model = AIModelFactory.getDefaultModel();

            if (!model.isConfigValid()) {
                return "尚未配置 AI 密钥，请在服务端 .env 中补充相关凭证。";
            }

            return await model.diagnose(actualBase64, designBase64, styles, elementInfo, similarity);
        } catch (error: any) {
            console.error('[AI适配器] 实时诊断序列异常:', error.message);
            return `AI 诊断临时不可用: ${error.message}`;
        }
    }
}
