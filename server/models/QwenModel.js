import AIModelBase from './AIModelBase.js'
import axios from 'axios'
import fs from 'fs'

/**
 * 千问 2.5 AI 模型实现
 * 适用于公司内网环境
 */
class QwenModel extends AIModelBase {
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
}

export default QwenModel
