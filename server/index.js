import express from 'express'
import cors from 'cors'
import axios from 'axios'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import dotenv from 'dotenv'
import { createReport, updateReport, getReport, getReportList, deleteOldReports } from './database.js'

// 加载环境变量
dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 3000

// 中间件
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))
app.use('/reports', express.static(path.join(__dirname, 'reports')))

// 确保目录存在
const ensureDir = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
    }
}

ensureDir(path.join(__dirname, 'uploads'))
ensureDir(path.join(__dirname, 'reports'))

// 初始化数据库并清理过期记录
deleteOldReports(7) // 删除 7 天前的记录

// 配置文件上传
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'uploads'))
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, uniqueSuffix + path.extname(file.originalname))
    }
})

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png/
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
        const mimetype = allowedTypes.test(file.mimetype)

        if (mimetype && extname) {
            return cb(null, true)
        } else {
            cb(new Error('只支持 PNG 和 JPG 格式的图片'))
        }
    }
})

// API 路由

// 健康检查
app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'Server is running' })
})

// 新增：HTML 预览代理接口 (支持 CSS 注入)
app.get('/api/proxy-preview', async (req, res) => {
    console.log('[DEBUG] 命中预览代理接口')
    try {
        const { url, css } = req.query

        if (!url) {
            return res.status(400).send('Missing target URL')
        }

        console.log(`[预览代理] 正在请求: ${url}`)

        const response = await axios.get(url, {
            responseType: 'text',
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1'
            }
        })

        let html = response.data

        // 1. 注入 <base> 标签，确保页面内的相对资源（JS/CSS/Image）能正确加载
        const urlParsed = new URL(url)
        const baseUrl = `${urlParsed.origin}${urlParsed.pathname.endsWith('/') ? urlParsed.pathname : path.dirname(urlParsed.pathname)}/`
        const baseTag = `<base href="${baseUrl}">`

        if (html.includes('<head>')) {
            html = html.replace('<head>', `<head>\n    ${baseTag}`)
        } else {
            html = `<head>${baseTag}</head>${html}`
        }

        // 2. 注入修复后的 CSS 样式
        if (css) {
            const styleTag = `\n    <style id="ui-eye-injected-fix">
      /* UI-Eye 自动注入的修复样式 */
      ${css}
      
      /* 辅助样式：高亮被修改的元素（可选） */
      [data-ui-eye-highlight] { outline: 2px solid #6366f1 !important; box-shadow: 0 0 10px rgba(99, 102, 241, 0.5) !important; }
    </style>\n`
            html = html.replace('</head>', `${styleTag}</head>`)
        }

        // 3. 禁用页面内的所有链接跳转，防止用户跑偏
        html = html.replace(/<a /g, '<a onclick="return false;" style="cursor: default;" ')

        // 4. 移除阻止 iframe 嵌套的安全响应头
        res.removeHeader('X-Frame-Options')
        res.removeHeader('Content-Security-Policy')
        res.removeHeader('X-Content-Type-Options')

        // 5. 设置允许 iframe 嵌套的响应头
        res.set('Content-Type', 'text/html; charset=utf-8')
        res.set('X-Frame-Options', 'ALLOWALL')

        res.send(html)
    } catch (error) {
        console.error('[预览代理] 失败:', error.message)
        res.status(500).send(`无法加载预览页面: ${error.message}`)
    }
})

// 上传设计稿
app.post('/api/upload-design', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: '请上传文件'
            })
        }

        res.json({
            success: true,
            data: {
                filename: req.file.filename,
                path: req.file.path,
                url: `/uploads/${req.file.filename}`
            }
        })
    } catch (error) {
        console.error('上传失败:', error)
        res.status(500).json({
            success: false,
            message: error.message
        })
    }
})

// 获取蓝湖设计稿（通过图片 URL）
app.post('/api/lanhu/fetch', async (req, res) => {
    try {
        const { url } = req.body

        if (!url) {
            return res.status(400).json({
                success: false,
                message: '请提供图片 URL'
            })
        }

        // 使用 LanhuService 下载图片
        const LanhuService = (await import('./services/LanhuService.js')).default
        const lanhuService = new LanhuService()

        const result = await lanhuService.downloadImage(url)

        res.json({
            success: true,
            data: {
                imageUrl: result.url,
                filename: result.filename,
                width: result.width,
                height: result.height,
                format: result.format,
                size: result.size
            },
            message: '图片下载成功'
        })
    } catch (error) {
        console.error('获取图片失败:', error)
        res.status(500).json({
            success: false,
            message: error.message
        })
    }
})

// 开始对比
app.post('/api/compare', async (req, res) => {
    try {
        const config = req.body

        // 验证必填字段
        if (!config.url || !config.designSource) {
            return res.status(400).json({
                success: false,
                message: '缺少必填参数'
            })
        }

        // 生成报告 ID
        const reportId = Date.now().toString()

        // 创建对比任务记录到数据库
        const report = {
            id: reportId,
            config,
            status: 'processing',
            timestamp: Date.now()
        }

        createReport(report)

        // 异步处理对比任务
        processCompareTask(reportId, config).catch(error => {
            console.error('对比任务失败:', error)
            updateReport(reportId, {
                status: 'failed',
                error: error.message
            })
        })

        res.json({
            success: true,
            data: { reportId }
        })
    } catch (error) {
        console.error('开始对比失败:', error)
        res.status(500).json({
            success: false,
            message: error.message
        })
    }
})

// 获取对比报告
app.get('/api/report/:id', (req, res) => {
    try {
        const { id } = req.params
        const report = getReport(id)

        if (!report) {
            return res.status(404).json({
                success: false,
                message: '报告不存在'
            })
        }

        res.json({
            success: true,
            data: report
        })
    } catch (error) {
        console.error('获取报告失败:', error)
        res.status(500).json({
            success: false,
            message: error.message
        })
    }
})

// 获取报告列表
app.get('/api/reports', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50
        const offset = parseInt(req.query.offset) || 0

        const reports = getReportList(limit, offset)

        res.json({
            success: true,
            data: reports
        })
    } catch (error) {
        console.error('获取报告列表失败:', error)
        res.status(500).json({
            success: false,
            message: error.message
        })
    }
})

// 错误消息辅助函数
function getCompareErrorMessage(error) {
    const msg = error.message || String(error)
    if (msg.includes('ENOENT')) return '文件未找到'
    if (msg.includes('timeout')) return '操作超时'
    return msg
}

// 对比任务处理（真实实现）
async function processCompareTask(reportId, config) {
    try {
        console.log(`\n[对比任务] 开始处理: ${reportId}`)

        // 1. 截取实际页面
        console.log('\n[1/4] 截取实际页面...')
        let actualScreenshot
        try {
            const { captureScreenshot } = await import('./capture.js')
            actualScreenshot = await captureScreenshot(config.url, {
                width: config.viewport.width,
                height: config.viewport.height,
                fullPage: true
            })
        } catch (error) {
            throw new Error(`页面截图失败: ${getScreenshotErrorMessage(error)}`)
        }

        // 2. 获取设计稿路径
        console.log('\n[2/4] 准备设计稿...')
        let designPath = config.designSource

        // 如果是相对路径，转换为绝对路径
        if (!designPath.startsWith('/')) {
            designPath = path.join(__dirname, designPath)
        }

        // 如果是 URL 路径，转换为文件系统路径
        if (designPath.startsWith('/uploads/')) {
            designPath = path.join(__dirname, designPath)
        }

        // 验证设计稿文件是否存在
        if (!fs.existsSync(designPath)) {
            throw new Error(`设计稿文件不存在: ${designPath}。请重新上传设计稿。`)
        }

        console.log('设计稿路径:', designPath)
        console.log('实际页面路径:', actualScreenshot.path)

        // 3. 图像对比
        console.log('[3/4] 执行像素级对比')
        let compareResult
        try {
            const CompareService = (await import('./services/CompareService.js')).default
            const compareService = new CompareService()
            compareResult = await compareService.compare(
                designPath,
                actualScreenshot.path,
                {
                    threshold: config.options?.tolerance ? config.options.tolerance / 100 : 0.1,
                    enableClustering: true // 启用差异聚类
                }
            )
        } catch (error) {
            throw new Error(`图像对比失败: ${getCompareErrorMessage(error)}`)
        }

        // 4. AI 分析
        console.log('[4/4] AI 分析差异')
        let fixes
        try {
            const { analyzeWithAI } = await import('./ai-analyzer.js')
            fixes = await analyzeWithAI(
                {
                    design: designPath,
                    actual: actualScreenshot.path,
                    diff: compareResult.diffImage.path
                },
                compareResult,
                config.aiModel || 'qwen'
            )
        } catch (error) {
            console.warn('⚠️ AI 分析失败，使用规则引擎降级:', error.message)
            // AI 失败时使用空数组，不阻断流程
            fixes = []
        }

        // 生成完整报告并保存到数据库
        const reportData = {
            similarity: compareResult.similarity,
            diffPixels: compareResult.diffPixels,
            totalPixels: compareResult.totalPixels,
            images: {
                design: config.designSource.startsWith('http') || config.designSource.startsWith('/')
                    ? config.designSource.replace(__dirname, '')
                    : `/uploads/${config.designSource}`,
                actual: actualScreenshot.url,
                diff: compareResult.diffImage.url
            },
            diffImage: compareResult.diffImage, // 包含增强版差异图信息
            diffRegions: compareResult.diffRegions || [], // 差异区域列表
            fixes,
            status: 'completed'
        }

        updateReport(reportId, reportData)

        console.log(`\n✅ 对比任务完成!`)
        console.log(`相似度: ${compareResult.similarity}%`)
        console.log(`差异区域: ${compareResult.diffRegions?.length || 0} 个`)
        console.log(`修复建议: ${fixes.length} 项`)

    } catch (error) {
        console.error('\n❌ 对比任务失败:', error)
        updateReport(reportId, {
            status: 'failed',
            error: error.message
        })
        throw error
    }
}

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error('服务器错误:', err)
    res.status(500).json({
        success: false,
        message: err.message || '服务器内部错误'
    })
})

// 启动服务器
app.listen(PORT, () => {
    console.log(`\n🚀 UI-Eye 后端服务已启动`)
    console.log(`📍 服务地址: http://localhost:${PORT}`)
    console.log(`📁 上传目录: ${path.join(__dirname, 'uploads')}`)
    console.log(`📊 报告目录: ${path.join(__dirname, 'reports')}`)
    console.log(`\n按 Ctrl+C 停止服务\n`)
})

export default app
