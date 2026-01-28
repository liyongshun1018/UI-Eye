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
        this.logSeparator('AI 视觉审计开始');
        this.log(`当前量化相似度: ${compareResult.similarity}%`);
        this.log(`差异像素总数: ${compareResult.diffPixels}`);
        this.log(`差异区域数量: ${(compareResult.diffRegions || []).length}`);

        try {
            // 1. 将物理磁盘上的图片文件转换为 API 所需的 Base64 编码
            const [designBase64, actualBase64, diffBase64] = await Promise.all([
                this.fileToBase64(images.design),
                this.fileToBase64(images.actual),
                this.fileToBase64(images.diff)
            ]);

            if (!designBase64 || !actualBase64 || !diffBase64) {
                throw new Error('关键视觉素材转换 Base64 失败,请检查文件权限或路径');
            }

            // 2. 构造提示词
            const promptText = this.buildPrompt(compareResult) + '\n补充指令:请严格返回 JSON 数组,不要夹带 Markdown 标签。';

            // 打印完整的提示词
            this.logSeparator('发送给大模型的提示词');
            this.log(promptText);

            // 3. 构造符合多模态输入标准的请求体
            const requestBody = {
                model: this.modelName,
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: promptText },
                            { type: 'image_url', image_url: { url: designBase64 } },
                            { type: 'image_url', image_url: { url: actualBase64 } },
                            { type: 'image_url', image_url: { url: diffBase64 } }
                        ]
                    }
                ],
                temperature: 0.1 // 低随机性,确保 CSS 修复建议的稳定性
            };

            // 打印请求体结构(不含图片 Base64)
            this.logSeparator('请求体结构');
            this.log({
                model: requestBody.model,
                temperature: requestBody.temperature,
                messageCount: requestBody.messages.length,
                contentItems: requestBody.messages[0].content.map((item: any) => ({
                    type: item.type,
                    hasContent: item.type === 'text' ? true : !!item.image_url
                }))
            });

            this.log(`连接供应商端点: ${this.endpoint}`);

            // 4. 发起异步推理请求
            const response = await axios.post(this.endpoint, requestBody, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 90000 // 视觉模型推理较耗时,设置 90 秒超时
            });

            // 打印大模型原始返回内容
            this.logSeparator('大模型原始返回内容');
            const rawContent = response.data.choices?.[0]?.message?.content || '';
            this.log(rawContent);

            // 打印响应元数据
            this.logSeparator('响应元数据');
            this.log({
                model: response.data.model,
                usage: response.data.usage,
                finishReason: response.data.choices?.[0]?.finish_reason
            });

            const result = this.parseResponse(response.data);

            this.logSeparator('解析后的结构化数据');
            this.log(`成功解析 ${result.length} 个修复建议`);
            this.log(result);

            this.logSeparator('AI 视觉审计完成');

            return result;
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
        this.logSeparator('AI 实时诊断开始');
        this.log(`执行实时点选诊断: ${info?.tagName || 'DOM元素'}`);
        if (similarity !== undefined) {
            this.log(`视觉还原度: ${similarity}%`);
        }

        const similarityText = similarity !== undefined ? `- **视觉还原度: ${similarity}%**` : '';

        const prompt = `你是一位拥有多年经验的高级前端 UI/UX 专家。请深度诊断以下元素的视觉一致性偏差:

**元素信息**
- 元素标签: ${info?.tagName || 'Unknown'}
- 计算样式: 
${JSON.stringify(styles, null, 2)}
${similarityText}

**分析要求**

请对比 [设计稿截图] 与 [实测截图],从以下维度进行专业诊断:

1. **视觉差异识别**
   - 精确识别颜色、字体、间距、布局等方面的差异
   - 量化差异程度(如: 颜色偏差值、间距差异像素)

2. **根因分析**
   - 分析差异产生的技术原因
   - 是 CSS 属性问题、浏览器渲染差异、还是设计规范不一致

3. **设计原则评估**
   - 评估是否违反视觉设计原则(对比度、对齐、层次、一致性)
   - 分析对用户体验的影响

4. **修复建议**
   - 提供具体的 CSS 修复方案
   - 评估修复难度和预估时间
   - 考虑浏览器兼容性和响应式设计

**输出格式**

请以 Markdown 格式输出诊断报告,包含:
- 在开头显著位置标注还原度评分
- 使用清晰的标题和列表
- 使用代码块展示 CSS 建议
- 使用表格对比当前值和建议值(如适用)`;

        // 打印完整的诊断提示词
        this.logSeparator('诊断提示词');
        this.log(prompt);

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

        this.log(`发起诊断请求到: ${this.endpoint}`);

        const response = await axios.post(this.endpoint, requestBody, {
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 60000
        });

        const diagnosis = response.data.choices?.[0]?.message?.content || "AI 暂时无法解析当前视觉上下文";

        // 打印大模型返回的诊断内容
        this.logSeparator('诊断结果');
        this.log(diagnosis);
        this.logSeparator('AI 实时诊断完成');

        return diagnosis;
    }
}
