import { AIModelBase, AIModelConfig } from './AIModelBase.js';
import axios from 'axios';
import fs from 'fs';

/**
 * 通义千问 (Qwen) AI 模型实现类
 * 职责：适配阿里通义千问多模态模型 (如 qwen-vl-max)
 * 场景：适用于企业内网或对国产模型有特定要求的视觉分析场景
 */
export class QwenModel extends AIModelBase {
    constructor(config: AIModelConfig) {
        super(config);
    }

    /**
     * 实现：视觉差异分析
     */
    async analyze(images: { design: string; actual: string; diff: string }, compareResult: any): Promise<any[]> {
        this.log(`启动 Qwen 视觉审美序列，相似度基准: ${compareResult.similarity}%`);

        try {
            // 1. 本地图片资源 Base64 化
            const [designBase64, actualBase64, diffBase64] = await Promise.all([
                this.fileToBase64(images.design),
                this.fileToBase64(images.actual),
                this.fileToBase64(images.diff)
            ]);

            if (!designBase64 || !actualBase64 || !diffBase64) {
                throw new Error('视觉素材读取中断，请检查磁盘 IO 状态');
            }

            // 2. 构造 Qwen 模型兼容的请求负载
            const requestBody = {
                model: this.modelName,
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: this.buildPrompt(compareResult) + '\n严格要求：直接返回 JSON 数组内容，严禁包含辅助说明文字。'
                            },
                            { type: 'image_url', image_url: { url: designBase64 } },
                            { type: 'image_url', image_url: { url: actualBase64 } },
                            { type: 'image_url', image_url: { url: diffBase64 } }
                        ]
                    }
                ],
                temperature: 0.1
            };

            this.log(`连接模型端点: ${this.endpoint}`);

            // 3. 执行 API 调用
            const response = await axios.post(this.endpoint, requestBody, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 90000
            });

            return this.parseResponse(response.data);
        } catch (error: any) {
            const errorMsg = error.response?.data?.error?.message || error.message;
            this.log(`Qwen 通讯链路异常: ${errorMsg}`, 'error');
            throw new Error(`通义千问模型执行失败: ${errorMsg}`);
        }
    }

    /**
     * 辅助工具：文件转 Base64 字符串
     */
    private async fileToBase64(filePath: string): Promise<string | null> {
        try {
            if (!fs.existsSync(filePath)) {
                this.log(`[IO忽略] 文件不存在: ${filePath}`, 'warn');
                return null;
            }
            const buffer = fs.readFileSync(filePath);
            const extension = filePath.split('.').pop() || 'png';
            return `data:image/${extension};base64,${buffer.toString('base64')}`;
        } catch (error: any) {
            this.log(`[IO异常] ${error.message}`, 'error');
            return null;
        }
    }

    /**
     * 响应解析器：处理 AI 返回的 JSON 内容
     */
    private parseResponse(data: any): any[] {
        try {
            let content = data.choices[0].message.content;

            // 格式化清洗：移除 Markdown 常见的包围符
            if (content.includes('```')) {
                content = content.replace(/```json|```/g, '').trim();
            }

            const result = JSON.parse(content);
            const fixes = Array.isArray(result) ? result : (result.fixes || []);

            this.log(`解析成功：已提取 ${fixes.length} 条 CSS 修复建议`);
            return fixes;
        } catch (error: any) {
            this.log(`内容结构解析失败: ${error.message}`, 'error');
            return [];
        }
    }

    /**
     * 实现：实时视觉诊断 (Placeholder)
     */
    async diagnose(actualBase64: string, designBase64: string, styles: any, info: any, similarity?: number): Promise<string> {
        // ... 实现类似于 SiliconFlowModel 的逻辑，此处略作简化 ...
        this.log(`[Qwen] 执行单点诊断，暂未实现`);
        return "Qwen 实时诊断功能正在接入中";
    }
}
