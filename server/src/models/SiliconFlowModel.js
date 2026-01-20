import AIModelBase from './AIModelBase.js'
import axios from 'axios'
import fs from 'fs'

/**
 * 硅基流动 AI 模型实现
 * 适用于外网环境，支持多种开源模型
 */
class SiliconFlowModel extends AIModelBase {
    /**
     * 构造函数
     * @param {Object} config - 模型配置
     */
    constructor(config) {
        super(config)
    }

    /**
     * 分析 UI 差异
     * @param {Object} images - 图片信息
     * @param {Object} compareResult - 对比结果
     * @returns {Promise<Array>} CSS 修复建议列表
     */
    async analyze(images, compareResult) {
        this.log(`开始分析，相似度: ${compareResult.similarity}%`)

        // 将图片转换为 Base64
        const designBase64 = await this.fileToBase64(images.design)
        const actualBase64 = await this.fileToBase64(images.actual)
        const diffBase64 = await this.fileToBase64(images.diff)

        if (!designBase64 || !actualBase64 || !diffBase64) {
            throw new Error('图片转换失败')
        }

        // 构建请求
        const requestBody = {
            model: this.modelName,
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: this.buildPrompt(compareResult) + '\n请直接输出 JSON，不要包含任何 Markdown 代码块标签。'
                        },
                        { type: 'image_url', image_url: { url: designBase64 } },
                        { type: 'image_url', image_url: { url: actualBase64 } },
                        { type: 'image_url', image_url: { url: diffBase64 } }
                    ]
                }
            ],
            temperature: 0.1
        }

        try {
            this.log(`调用 API: ${this.endpoint}`)

            const response = await axios.post(this.endpoint, requestBody, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 90000 // 90 秒超时
            })

            return this.parseResponse(response.data)
        } catch (error) {
            this.log(`API 调用失败: ${error.message}`, 'error')
            throw error
        }
    }

    /**
     * 将文件转换为 Base64
     * @param {string} filePath - 文件路径
     * @returns {Promise<string|null>} Base64 字符串
     */
    async fileToBase64(filePath) {
        try {
            if (!fs.existsSync(filePath)) {
                this.log(`文件不存在: ${filePath}`, 'warn')
                return null
            }

            const buffer = fs.readFileSync(filePath)
            const extension = filePath.split('.').pop()
            return `data:image/${extension};base64,${buffer.toString('base64')}`
        } catch (error) {
            this.log(`文件转换失败: ${error.message}`, 'error')
            return null
        }
    }

    /**
     * 解析 API 响应
     * @param {Object} data - API 响应数据
     * @returns {Array} 修复建议列表
     */
    parseResponse(data) {
        try {
            let content = data.choices[0].message.content

            // 清理可能存在的 Markdown 代码块
            if (content.includes('```')) {
                content = content.replace(/```json|```/g, '').trim()
            }

            const result = JSON.parse(content)
            const fixes = result.fixes || result

            this.log(`解析成功，获得 ${fixes.length} 条修复建议`)
            return Array.isArray(fixes) ? fixes : []
        } catch (error) {
            this.log(`响应解析失败: ${error.message}`, 'error')
            return []
        }
    }

    /**
     * 执行插件视觉诊断
     */
    async diagnose(actualBase64, designBase64, styles, info) {
        this.log(`准备执行插件视觉诊断: ${info?.tagName || 'Unknown'}`)

        const prompt = `你是一位拥有 10 年经验的高级前端 UI 开发专家和视觉审美专家。
你的任务是精准对比用户提供的“设计稿截图”与“真实页面截图”，并结合提供的“当前 CSS 样式”数据，找出视觉还原上的偏差分析方案。

### 1. 图片数据
- [图片 A - 设计稿] (即对比基准)
- [图片 B - 实际页面] (即实测结果)

### 2. 实际页面元数据
- 元素标签: ${info?.tagName || 'Unknown'}
- 当前计算样式 (Computed Styles): 
${JSON.stringify(styles, null, 2)}

---

### 分析要求：
请对比 [设计稿] 与 [实际页面]，从以下维度进行深度诊断：
1. 尺寸与间距 (Layout & Spacing)
2. 色彩与视觉 (Color & Visuals)
3. 文字表现 (Typography)

---

### 请按以下格式返回结果（使用 Markdown）：

#### 🔍 差异诊断报告
- **[维度名称]**: 描述发现的具体问题及偏差程度。

#### 🛠 修复建议
请给出直接可用的 CSS 代码，并注明修改原因。
`

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
        }

        try {
            const response = await axios.post(this.endpoint, requestBody, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 90000
            })

            return response.data.choices?.[0]?.message?.content || "AI 未返回有效内容"
        } catch (error) {
            const errorDetail = error.response?.data ? JSON.stringify(error.response.data) : error.message
            this.log(`插件诊断调用失败: ${errorDetail}`, 'error')
            throw new Error(`AI 诊断失败: ${errorDetail}`)
        }
    }
}

export default SiliconFlowModel
