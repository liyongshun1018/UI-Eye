import { AIModelBase, AIModelConfig } from './AIModelBase.js';
import axios from 'axios';
import fs from 'fs';

/**
 * 硅基流动 (SiliconFlow) AI 模型实现类
 * 职责：适配 SiliconFlow 平台的 VLM (Vision Language Models)
 * 场景：适用于公网环境下，基于多种开源大模型进行视觉审计
 */
export class SiliconFlowModel extends AIModelBase {
    constructor(config: AIModelConfig) {
        super(config);
    }

    /**
     * 实现：视觉差异深度分析
     */
    async analyze(images: { design: string; actual: string; diff: string }, compareResult: any): Promise<any[]> {
        this.log(`开始 AI 视觉审计序列，当前量化相似度: ${compareResult.similarity}%`);

        try {
            // 1. 将物理磁盘上的图片文件转换为 API 所需的 Base64 编码
            const [designBase64, actualBase64, diffBase64] = await Promise.all([
                this.fileToBase64(images.design),
                this.fileToBase64(images.actual),
                this.fileToBase64(images.diff)
            ]);

            if (!designBase64 || !actualBase64 || !diffBase64) {
                throw new Error('关键视觉素材转换 Base64 失败，请检查文件权限或路径');
            }

            // 2. 构造符合多模态输入标准的请求体
            const requestBody = {
                model: this.modelName,
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: this.buildPrompt(compareResult) + '\n补充指令：请严格返回 JSON 数组，不要夹带 Markdown 标签。'
                            },
                            { type: 'image_url', image_url: { url: designBase64 } },
                            { type: 'image_url', image_url: { url: actualBase64 } },
                            { type: 'image_url', image_url: { url: diffBase64 } }
                        ]
                    }
                ],
                temperature: 0.1 // 低随机性，确保 CSS 修复建议的稳定性
            };

            this.log(`连接供应商端点: ${this.endpoint}`);

            // 3. 发起异步推理请求
            const response = await axios.post(this.endpoint, requestBody, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 90000 // 视觉模型推理较耗时，设置 90 秒超时
            });

            return this.parseResponse(response.data);
        } catch (error: any) {
            const msg = error.response?.data?.error?.message || error.message;
            this.log(`推理通讯中断: ${msg}`, 'error');
            throw new Error(`AI 审计任务执行异常: ${msg}`);
        }
    }

    /**
     * 辅助工具：图片转 Base64 数据流
     */
    private async fileToBase64(filePath: string): Promise<string | null> {
        try {
            if (!fs.existsSync(filePath)) {
                this.log(`文件读取失败，路径不存在: ${filePath}`, 'warn');
                return null;
            }
            const buffer = fs.readFileSync(filePath);
            const extension = filePath.split('.').pop() || 'png';
            return `data:image/${extension};base64,${buffer.toString('base64')}`;
        } catch (error: any) {
            this.log(`IO 转换异常: ${error.message}`, 'error');
            return null;
        }
    }

    /**
     * 响应解析器：处理 AI 的原生返回内容
     */
    private parseResponse(data: any): any[] {
        try {
            let content = data.choices[0].message.content;

            // 增强型清洗：剔除潜藏在回复中的 JSON 代码块标记
            if (content.includes('```')) {
                content = content.replace(/```json|```/g, '').trim();
            }

            const result = JSON.parse(content);
            const fixes = Array.isArray(result) ? result : (result.fixes || []);

            this.log(`推理成功：已捕获 ${fixes.length} 个视觉修复锚点`);
            return fixes;
        } catch (error: any) {
            this.log(`结构化解析失败: ${error.message}`, 'error');
            return [];
        }
    }

    /**
     * 实现：实时插件视觉诊断
     */
    async diagnose(actualBase64: string, designBase64: string, styles: any, info: any, similarity?: number): Promise<string> {
        this.log(`执行实时点选诊断: ${info?.tagName || 'DOM元素'}`);

        const similarityText = similarity !== undefined ? `- **视觉还原度: ${similarity}%**` : '';

        const prompt = `你是一位拥有多年经验的高级前端专家。请深度诊断以下元素的视觉一致性偏差：
- 元素标签: ${info?.tagName || 'Unknown'}
- 计算样式: ${JSON.stringify(styles, null, 2)}
${similarityText}

请对比 [设计稿截图] 与 [实测截图]，产出 Markdown 格式的诊断报告。并在开头显著位置标注还原度评分。`;

        const requestBody = {
            model: this.modelName,
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: prompt },
                        { type: 'image_url', image_url: { url: designBase64 } },
                        { type: 'image_url', image_url: { url: actualBase64 } }
                    ]
                }
            ],
            temperature: 0.1
        };

        const response = await axios.post(this.endpoint, requestBody, {
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 60000
        });

        return response.data.choices?.[0]?.message?.content || "AI 暂时无法解析当前视觉上下文";
    }
}
