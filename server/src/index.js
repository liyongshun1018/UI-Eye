// 核心依赖
import express from 'express'
import cors from 'cors'
import axios from 'axios'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import dotenv from 'dotenv'
import http from 'http'

// 业务模块与路由
import { deleteOldReports } from './database.js'
import batchRoutes from './routes/batchRoutes.js'
import scriptRoutes from './routes/scriptRoutes.js'
import wsServer from './services/WSServer.js'

// 工具与基础设施
import { DIRS, ensureAllDirs, URL_PREFIXES } from './utils/PathUtils.js'
import CompareController from './controllers/CompareController.js'
import { validate, compareSchema, extensionExportSchema } from './utils/ValidationSchemas.js'
import globalErrorHandler, { catchAsync } from './utils/ErrorHandler.js'

// 实例初始化
const compareController = new CompareController()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 环境变量加载逻辑
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

// 核心密钥安全核查
const apiKey = process.env.SILICONFLOW_API_KEY
if (apiKey) {
    console.log(`[内核] 已载入 SiliconFlow 密钥: ${apiKey.substring(0, 6)}...`)
} else {
    console.error('[内核] 严重警告: 未检测到 SILICONFLOW_API_KEY，AI 对比功能将失效！')
}

const app = express()
const PORT = 3000

/**
 * 基础中间件配置
 */
app.use(cors()) // 开启跨域支持
app.use(express.json({ limit: '50mb' })) // 支持大容量 JSON Payload（用于图床同步）
app.use(express.urlencoded({ limit: '50mb', extended: true }))

/**
 * 静态资源托管规划
 * 将内部物理路径映射为前端可直接访问的 Web URL
 */
app.use(URL_PREFIXES.UPLOADS, express.static(DIRS.UPLOADS))
app.use(URL_PREFIXES.REPORTS, express.static(DIRS.REPORTS))
app.use(URL_PREFIXES.BATCH_SCREENSHOTS, express.static(DIRS.BATCH_SCREENSHOTS))

// 确保系统所需的持久化目录结构完整
ensureAllDirs(fs)

// 数据库日常维护：自动清理过期报告（默认保留 7 天）
deleteOldReports(7)

/**
 * 磁盘存储策略配置 (Multer)
 * 用于处理前端上传的设计稿原件
 */
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
    limits: { fileSize: 10 * 1024 * 1024 }, // 限制单文件 10MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png/
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
        const mimetype = allowedTypes.test(file.mimetype)

        if (mimetype && extname) {
            return cb(null, true)
        } else {
            cb(new Error('系统仅支持 PNG 和 JPG 格式的平面设计稿'))
        }
    }
})

/**
 * API 路由定义
 */

// 健康监测
app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'UI-Eye 服务运行正常' })
})

// 批量任务与脚本自动化路由
app.use('/api/batch', batchRoutes)
app.use('/api/batch/scripts', scriptRoutes)

// 核心业务：文件上传
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: '请选择要上传的文件' })
    }
    const fileUrl = `${URL_PREFIXES.UPLOADS}/${req.file.filename}`
    res.json({
        success: true,
        data: {
            url: fileUrl,
            filename: req.file.filename,
            size: req.file.size
        }
    })
})

// 核心业务：启动像素对比任务
// 采用鉴权、校验、异步执行三层包装
app.post('/api/compare', validate(compareSchema), catchAsync((req, res) => compareController.startCompare(req, res)))

/**
 * 浏览器插件增强接口
 */
// 实时 AI 视觉诊断
app.post('/api/extension/diagnose', catchAsync((req, res) => compareController.diagnoseExtension(req, res)))
// 数据导出与持久化同步
app.post('/api/extension/export', validate(extensionExportSchema), catchAsync((req, res) => compareController.exportExtensionReport(req, res)))

/**
 * 报告管理接口
 */
app.get('/api/report/:id', catchAsync((req, res) => compareController.getReport(req, res)))
app.delete('/api/report/:id', catchAsync((req, res) => compareController.deleteReport(req, res)))
app.get('/api/reports', catchAsync((req, res) => compareController.getReportList(req, res)))

/**
 * 全局异常捕捉中间件
 * 注意：必须放在所有应用路由定义的最后，作为最后的安全兜底
 */
app.use(globalErrorHandler)

// 创建 HTTP 混合服务器（支持 Web 与 WebSocket 共用端口）
const server = http.createServer(app)

// 启动实时通讯补丁
wsServer.init(server)

// 绑定端口，正式对外提供服务
server.listen(PORT, () => {
    console.log(`\n🚀 UI-Eye 后端服务已加载完毕`)
    console.log(`📍 接口网关: http://localhost:${PORT}`)
    console.log(`🔌 实时通道: ws://localhost:${PORT}`)
    console.log(`📁 存储集群: ${DIRS.UPLOADS}`)
    console.log(`\n按 Ctrl+C 安全退出进程\n`)
})

export default app
