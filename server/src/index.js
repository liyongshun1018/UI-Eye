import express from 'express'
import cors from 'cors'
import axios from 'axios'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import dotenv from 'dotenv'
import { createReport, updateReport, getReport, getReportList, deleteOldReports } from './database.js'
import batchRoutes from './routes/batchRoutes.js'
import scriptRoutes from './routes/scriptRoutes.js'
import http from 'http'
import wsServer from './services/WSServer.js'
import { DIRS, ensureAllDirs, URL_PREFIXES, resolveDesignPath } from './utils/PathUtils.js'
import CompareController from './controllers/CompareController.js'

// 初始化控制器
const compareController = new CompareController()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 加载环境变量
const rootEnvPath = path.resolve(__dirname, '../../.env')
const serverEnvPath = path.resolve(__dirname, '../.env')

if (fs.existsSync(serverEnvPath)) {
    console.log(`[系统] 发现服务端本地配置: ${serverEnvPath}`)
    dotenv.config({ path: serverEnvPath })
} else if (fs.existsSync(rootEnvPath)) {
    console.log(`[系统] 发现并加载项目根目录配置: ${rootEnvPath}`)
    dotenv.config({ path: rootEnvPath })
} else {
    console.warn('[系统] 未找到 .env 配置文件，将尝试使用系统环境变量')
    dotenv.config()
}

// 安全核查（调试 401 问题）
const apiKey = process.env.SILICONFLOW_API_KEY
if (apiKey) {
    console.log(`[内核] 已载入 SiliconFlow 密钥: ${apiKey.substring(0, 6)}... (长度: ${apiKey.length})`)
} else {
    console.error('[内核] 严重警告: 未检测到 SILICONFLOW_API_KEY，AI 对比功能将失效！')
}

const app = express()
const PORT = 3000

// 中间件
app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))

// 静态文件服务
app.use(URL_PREFIXES.UPLOADS, express.static(DIRS.UPLOADS))
app.use(URL_PREFIXES.REPORTS, express.static(DIRS.REPORTS))
app.use(URL_PREFIXES.BATCH_SCREENSHOTS, express.static(DIRS.BATCH_SCREENSHOTS))

// 确保目录存在
ensureAllDirs(fs)

// 初始化数据库并清理过期记录
deleteOldReports(7) // 删除 7 天前的记录

// 配置文件上传
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, DIRS.UPLOADS)
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


// 批量任务路由
app.use('/api/batch', batchRoutes)
// 脚本管理路由 (统一挂载在 /api/batch 下)
app.use('/api/batch/scripts', scriptRoutes)
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

        // 3. 注入“安全沙箱”脚本 (Sandbox)
        // 核心痛点：目标页面如果调用 history.pushState/replaceState 跨域会导致浏览器抛出 SecurityError 导致 JS 崩溃
        const sandboxScript = `
    <script id="ui-eye-sandbox">
      (function() {
        console.log('[UI-Eye] 安全沙箱已激活：成功重写 History API 以防止跨域崩溃');
        const noop = () => {};
        // 劫持可能导致 SecurityError 的 API
        window.history.pushState = noop;
        window.history.replaceState = noop;
        
        // 拦截可能的自动跳转
        window.onbeforeunload = function() { return "预览环境已禁用跳转"; };
      })();
    </script>`

        if (html.includes('</head>')) {
            html = html.replace('</head>', `${sandboxScript}\n</head>`)
        } else {
            html += sandboxScript
        }

        // 4. 禁用页面内的所有链接跳转，防止用户跑偏
        html = html.replace(/<a /g, '<a onclick="return false;" style="cursor: default;" ')

        // 5. 极致跨域放行：移除所有阻碍 iframe 嵌套和资源加载的安全响应头
        res.removeHeader('X-Frame-Options')
        res.removeHeader('Content-Security-Policy')
        res.removeHeader('X-Content-Type-Options')
        res.removeHeader('X-XSS-Protection')

        // 设置宽松的响应头
        res.set({
            'Content-Type': 'text/html; charset=utf-8',
            'X-Frame-Options': 'ALLOWALL',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': '*'
        })

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
app.post('/api/compare', (req, res) => compareController.startCompare(req, res))

// 浏览器插件专用：AI 视觉诊断（单次对比）
app.post('/api/extension/diagnose', (req, res) => compareController.diagnoseExtension(req, res))
app.post('/api/extension/export', (req, res) => compareController.exportExtensionReport(req, res))

// 获取对比报告
app.get('/api/report/:id', (req, res) => compareController.getReport(req, res))

// 获取报告列表
app.get('/api/reports', (req, res) => compareController.getReportList(req, res))



// 错误处理中间件
app.use((err, req, res, next) => {
    console.error('服务器错误:', err)
    res.status(500).json({
        success: false,
        message: err.message || '服务器内部错误'
    })
})

// 创建 HTTP 服务器供 WebSocket 使用
const server = http.createServer(app)

// 初始化 WebSocket 服务
wsServer.init(server)

// 启动服务器
server.listen(PORT, () => {
    console.log(`\n🚀 UI-Eye 后端服务已启动`)
    console.log(`📍 服务地址: http://localhost:${PORT}`)
    console.log(`🔌 WebSocket: ws://localhost:${PORT}`)
    console.log(`🔌 WebSocket: ws://localhost:${PORT}`)
    console.log(`📁 上传目录: ${path.join(__dirname, '../data/uploads')}`)
    console.log(`📊 报告目录: ${path.join(__dirname, '../data/reports')}`)
    console.log(`\n按 Ctrl+C 停止服务\n`)
})

export default app
