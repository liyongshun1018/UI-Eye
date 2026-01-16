import axios from 'axios'
import fs from 'fs'

/**
 * AI 分析模块
 * 支持多种大模型：千问 2.5、GPT-4 Vision、Claude 3
 */

/**
 * 分析 UI 差异并生成 CSS 修复建议
 * @param {object} images - 图片信息
 * @param {object} compareResult - 对比结果
 * @param {string} modelType - 模型类型 (qwen/gpt4/claude)
 * @returns {Promise<Array>} CSS 修复建议列表
 */
export async function analyzeWithAI(images, compareResult, modelType = 'qwen') {
    try {
        console.log(`使用 ${modelType} 模型进行 AI 分析...`)

        // 根据模型类型选择分析方法
        switch (modelType) {
            case 'qwen':
                return await analyzeWithQwen(images, compareResult)
            case 'siliconflow':
                return await analyzeWithSiliconFlow(images, compareResult)
            default:
                // 默认使用内网千问或降级规则
                return await analyzeWithQwen(images, compareResult)
        }
    } catch (error) {
        console.error('AI 分析失败:', error)
        // 降级到规则引擎
        return await analyzeWithRules(images, compareResult)
    }
}

/**
 * 将图片转换为 Base64
 */
async function fileToBase64(filePath) {
    if (!fs.existsSync(filePath)) return null
    const buffer = fs.readFileSync(filePath)
    const extension = filePath.split('.').pop()
    return `data:image/${extension};base64,${buffer.toString('base64')}`
}

/**
 * 通用 OpenAI 兼容接口调用
 */
async function callVisionModel(endpoint, apiKey, modelName, images, compareResult) {
    if (!endpoint || !apiKey) {
        throw new Error('缺少 AI 模型配置（Endpoint 或 API Key）')
    }

    const designBase64 = await fileToBase64(images.design)
    const actualBase64 = await fileToBase64(images.actual)
    const diffBase64 = await fileToBase64(images.diff)

    const prompt = buildPrompt(images, compareResult)

    try {
        const response = await axios.post(endpoint, {
            model: modelName,
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: prompt + '\n请直接输出 JSON，不要包含任何 Markdown 代码块标签（如 ```json）。' },
                        { type: 'image_url', image_url: { url: designBase64 } },
                        { type: 'image_url', image_url: { url: actualBase64 } },
                        { type: 'image_url', image_url: { url: diffBase64 } }
                    ]
                }
            ],
            temperature: 0.1
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 90000 // 增加超时时间到 90 秒，视觉大模型响应较慢
        })

        let content = response.data.choices[0].message.content
        console.log('AI 原始响应:', content.substring(0, 200) + '...')

        // 清理可能存在的 Markdown 代码块
        if (content.includes('```')) {
            content = content.replace(/```json|```/g, '').trim()
        }

        const result = JSON.parse(content)
        return result.fixes || result
    } catch (error) {
        if (error.response) {
            console.error('AI API 响应错误:', error.response.status, JSON.stringify(error.response.data))
        } else {
            console.error('AI 调用异常:', error.message)
        }
        throw error
    }
}

/**
 * 千问 2.5 分析
 */
async function analyzeWithQwen(images, compareResult) {
    const endpoint = process.env.QWEN_API_ENDPOINT || 'http://internal-qwen-api.company.com/v1/chat/completions'
    const apiKey = process.env.QWEN_API_TOKEN || 'your-qwen-token'
    const modelName = process.env.QWEN_MODEL_NAME || 'qwen-2.5-vl'

    console.log(`正在调用千问 2.5 API: ${endpoint}, 模型: ${modelName}`)

    try {
        if (apiKey === 'your-qwen-token') {
            console.warn('⚠️ 未配置真实的 Qwen Token，使用规则引擎降级')
            return await analyzeWithRules(images, compareResult)
        }
        return await callVisionModel(endpoint, apiKey, modelName, images, compareResult)
    } catch (error) {
        console.error('Qwen 分析出错:', error.message)
        return await analyzeWithRules(images, compareResult)
    }
}

/**
 * 硅基流动分析
 */
async function analyzeWithSiliconFlow(images, compareResult) {
    const endpoint = process.env.SILICONFLOW_API_ENDPOINT || 'https://api.siliconflow.cn/v1/chat/completions'
    const apiKey = process.env.SILICONFLOW_API_KEY
    const modelName = process.env.SILICONFLOW_MODEL_NAME || 'Qwen/Qwen2.5-72B-Instruct'

    console.log(`正在调用硅基流动 API: ${endpoint}, 模型: ${modelName}`)

    try {
        if (!apiKey) {
            console.warn('⚠️ 未配置 SiliconFlow API Key，使用规则引擎降级')
            return await analyzeWithRules(images, compareResult)
        }
        return await callVisionModel(endpoint, apiKey, modelName, images, compareResult)
    } catch (error) {
        console.error('SiliconFlow 分析出错:', error.message)
        return await analyzeWithRules(images, compareResult)
    }
}


/**
 * 本地规则引擎分析（降级方案）
 */
async function analyzeWithRules(images, compareResult) {
    console.log('使用本地规则引擎分析...')

    const fixes = []
    const { similarity, diffPixels, totalPixels } = compareResult

    // 基于相似度生成建议
    if (similarity < 90) {
        fixes.push({
            priority: 'high',
            type: 'layout',
            description: '整体布局存在较大差异',
            selector: 'body',
            currentCSS: '/* 当前布局 */',
            suggestedCSS: '/* 建议检查容器宽度、padding、margin 等布局属性 */',
            impact: `相似度仅为 ${similarity.toFixed(1)}%，建议优先修复布局问题`
        })
    }

    if (similarity >= 90 && similarity < 95) {
        fixes.push({
            priority: 'medium',
            type: 'spacing',
            description: '间距存在细微差异',
            selector: '.container',
            currentCSS: 'padding: 10px; margin: 15px;',
            suggestedCSS: 'padding: 12px; margin: 16px;',
            impact: '建议调整容器的 padding 和 margin 值'
        })
    }

    if (similarity >= 95 && similarity < 98) {
        fixes.push({
            priority: 'low',
            type: 'color',
            description: '颜色存在轻微差异',
            selector: '.text',
            currentCSS: 'color: #333333;',
            suggestedCSS: 'color: #000000;',
            impact: '细微的颜色差异，可选择性修复'
        })
    }

    // 如果相似度很高，返回空建议
    if (similarity >= 98) {
        return []
    }

    // 基于差异像素数量添加更多建议
    const diffRatio = (diffPixels / totalPixels) * 100

    if (diffRatio > 5) {
        fixes.push({
            priority: 'high',
            type: 'color',
            description: '颜色差异较大',
            selector: '.element',
            currentCSS: 'background-color: #f0f0f0;',
            suggestedCSS: 'background-color: #ffffff;',
            impact: `${diffRatio.toFixed(1)}% 的像素存在差异，建议检查背景色和文字颜色`
        })
    }

    return fixes
}

/**
 * 构建 AI Prompt
 */
function buildPrompt(images, compareResult) {
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
