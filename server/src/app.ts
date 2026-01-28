import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { CompareController } from './controllers/CompareController.js';

const app = express();
const compareController = new CompareController();
import multer from 'multer';

// 路由与接口层导入
import batchRoutes from './routes/batchRoutes.js';
import scriptRoutes from './routes/scriptRoutes.js';

// 基础设施与工具层导入
import { DIRS, ensureAllDirs, URL_PREFIXES } from './utils/PathUtils.js';
import { Container } from './infrastructure/di/Container.js';
import { validate, compareSchema, extensionExportSchema } from './utils/ValidationSchemas.js';
import globalErrorHandler, { catchAsync } from './utils/ErrorHandler.js';

/**
 * UI-Eye 服务端主入口文件
 * 职责：编配 Express 中间件、配置依赖项、声明路由生命周期
 */

/**
 * 1. 基础中间件配置
 */
app.use(cors()); // 启用跨域支持，允许 Web 前端/Chrome 插件访问
app.use(express.json({ limit: '50mb' })); // 调大 JSON 解析上限，支持上传 Base64 图片
app.use(express.urlencoded({ limit: '50mb', extended: true }));

/**
 * 2. 静态资源托管
 * 职责：让前端可以直接通过 URL 访问上传的设计稿、实测图和差异报告图
 */
app.use(URL_PREFIXES.UPLOADS, express.static(DIRS.UPLOADS));
app.use(URL_PREFIXES.REPORTS, express.static(DIRS.REPORTS));
app.use(URL_PREFIXES.BATCH_SCREENSHOTS, express.static(DIRS.BATCH_SCREENSHOTS));

/**
 * 3. 环境初始化
 * 确保所有必要的物理存储目录 (uploads/reports 等) 均已创建
 */
ensureAllDirs(fs);

/**
 * 4. 文件上传能力 (Multer 配置)
 */
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, DIRS.UPLOADS),
    filename: (req, file, cb) => {
        // 使用时间戳+随机数确保文件名唯一，防止覆盖
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 限制单张图片最大 10MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png/;
        if (allowedTypes.test(path.extname(file.originalname).toLowerCase())) return cb(null, true);
        cb(new Error('非法文件类型：仅支持图片格式 (JPG/PNG)'));
    }
});

/**
 * 5. 核心 API 路由定义
 */

// 健康检查：用于验证服务端是否在线
app.get('/api/health', (req, res) => res.json({ success: true, message: 'UI-Eye 服务运行正常' }));

// 模块化路由
app.use('/api/batch', batchRoutes);         // 批量任务相关
app.use('/api/batch/scripts', scriptRoutes); // Playwright 注入脚本管理

// 通用上传接口
app.post(['/api/upload', '/api/upload-design'], upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: '请选择文件' });
    const fileUrl = `${URL_PREFIXES.UPLOADS}/${req.file.filename}`;
    res.json({ success: true, data: { url: fileUrl, filename: req.file.filename } });
});

// 视觉对比与审计入口
const ctrl = compareController;

app.post('/api/compare', validate(compareSchema), catchAsync((req, res) => ctrl.startCompare(req, res)));
app.post('/api/extension/diagnose', catchAsync((req, res) => ctrl.diagnoseExtension(req, res)));
app.post('/api/extension/export', validate(extensionExportSchema), catchAsync((req, res) => ctrl.exportExtensionReport(req, res)));

// 历史记录与报告查询
app.get('/api/report/:id', catchAsync((req, res) => ctrl.getReport(req, res)));
app.delete('/api/report/:id', catchAsync((req, res) => ctrl.deleteReport(req, res)));
app.get('/api/compare/reports', catchAsync((req, res) => ctrl.getReportList(req, res)));

// 外部集成：蓝湖设计稿获取
app.post('/api/lanhu/fetch', (req, res) => {
    // 提示：该功能在重构版中暂由插件侧直接处理图片，服务端仅保留路径契约支持
    res.json({ success: true, message: '兰湖数据服务已就绪' });
});

// 核心增强：SPA 路由重定向兜底 (开发环境专用)
// 职责：当 Puppeteer 或用户直接访问后端路由（如 /report/:id）时，
// 如果是开发环境，将其引导至 Vite 开发服务器以支持 SPA 路由
app.use((req, res, next) => {
    // 匹配 /report/ 开头的非 API 请求
    if (req.path.startsWith('/report/') && !req.path.startsWith('/api') && process.env.NODE_ENV === 'development') {
        const protocol = req.protocol;
        // 强制导向 127.0.0.1 以确保全栈通信稳定
        console.log(`[路由重定向] 检测到 SPA 报告路径，正在导向前端开发服务器: ${req.path}`);
        return res.redirect(`${protocol}://127.0.0.1:5173${req.originalUrl}`);
    }
    next();
});

/**
 * 6. 全局错误捕获中间件
 * 特性：统筹处理异步抛出的 AppError 和 未捕获的基础 Error
 */
app.use(globalErrorHandler as any);

export default app;
