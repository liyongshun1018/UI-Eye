import CaptureService from '../services/CaptureService.js'
import CompareService from '../services/CompareService.js'
import AIAnalyzerService from '../services/AIAnalyzerService.js'
import ReportRepository from '../repositories/ReportRepository.js'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import { DIRS, resolveDesignPath, normalizeToPublicUrl } from '../utils/PathUtils.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * 对比控制器类
 * 负责处理所有对比相关的 HTTP 请求
 * 采用依赖注入模式，降低耦合度
 */
class CompareController {
    /**
     * 构造函数（依赖注入）
     * @param {CaptureService} captureService - 截图服务
     * @param {CompareService} compareService - 对比服务
     * @param {AIAnalyzerService} aiService - AI 分析服务
     * @param {ReportRepository} reportRepo - 报告仓库
     */
    constructor(captureService, compareService, aiService, reportRepo) {
        this.captureService = captureService || new CaptureService()
        this.compareService = compareService || new CompareService()
        this.aiService = aiService || new AIAnalyzerService()
        this.reportRepo = reportRepo || new ReportRepository()
    }

    /**
     * 开始对比任务
     * @param {Request} req - Express 请求对象
     * @param {Response} res - Express 响应对象
     */
    async startCompare(req, res) {
        try {
            const config = req.body

            // 验证必填字段
            if (!config.url || !config.designSource) {
                return res.status(400).json({
                    success: false,
                    message: '缺少必填参数：url 和 designSource'
                })
            }

            // 生成报告 ID
            const reportId = Date.now().toString()

            // 创建报告记录
            const report = this.reportRepo.create({
                id: reportId,
                config,
                status: 'processing',
                timestamp: Date.now()
            })

            // 异步处理对比任务（不阻塞响应）
            this.processCompareTask(reportId, config).catch(error => {
                console.error('[对比控制器] 对比任务失败:', error)
                this.reportRepo.update(reportId, {
                    status: 'failed',
                    error: error.message
                })
            })

            // 立即返回报告 ID
            res.json({
                success: true,
                data: { reportId }
            })
        } catch (error) {
            this.handleError(res, error, '开始对比失败')
        }
    }

    /**
     * 处理对比任务（核心业务逻辑）
     * @param {string} reportId - 报告 ID
     * @param {Object} config - 配置信息
     */
    async processCompareTask(reportId, config) {
        // 重构：直接调用统一的原子执行任务服务
        // 注意：单次对比不传递 taskId，内部会使用时间戳作为 ID
        // 为保持旧接口兼容，我们这里把 reportId 作为 fallback 传递（虽然 execute 内部会处理）
        const CompareTaskService = (await import('../services/CompareTaskService.js')).default;

        try {
            await CompareTaskService.execute({
                ...config,
                id: reportId // 强制覆盖 ID 保持前端引用一致
            }, {
                onProgress: (data) => {
                    // WebSocket 广播已在 reportRepo.update 中通过 Hook 处理（或手动触发）
                    // 这里的 progress 已经由 CompareTaskService 同步到数据库
                    console.log(`[原子代理] 任务 ${reportId} 进度: ${data.progress}% - ${data.stepText}`);
                }
            });
            console.log(`\n✅ 对比任务委派完成: ${reportId}`);
        } catch (error) {
            console.error('\n❌ 对比代理任务失败:', error);
            throw error;
        }
    }

    /**
     * 获取报告
     * @param {Request} req - Express 请求对象
     * @param {Response} res - Express 响应对象
     */
    async getReport(req, res) {
        try {
            const { id } = req.params
            const report = this.reportRepo.findById(id)

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
            this.handleError(res, error, '获取报告失败')
        }
    }

    /**
     * 删除报告
     */
    async deleteReport(req, res) {
        try {
            const { id } = req.params
            const deletedCount = this.reportRepo.delete(id)

            if (deletedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: '报告不存在或已被删除'
                })
            }

            res.json({
                success: true,
                message: '报告删除成功'
            })
        } catch (error) {
            this.handleError(res, error, '删除报告失败')
        }
    }

    /**
     * 获取报告列表
     */
    async getReportList(req, res) {
        try {
            const limit = parseInt(req.query.limit) || 50
            const offset = parseInt(req.query.offset) || 0

            const reports = this.reportRepo.findAll({ limit, offset })

            res.json({
                success: true,
                data: reports
            })
        } catch (error) {
            this.handleError(res, error, '获取报告列表失败')
        }
    }

    /**
     * 浏览器插件专用：一键导出数据至管理平台
     * 业务流程：
     * 1. 接收插件采集的 Base64 图像、AI 诊断结论及样式快照。
     * 2. 将 Base64 实时持久化为服务端的物理 PNG 文件。
     * 3. 在 SQLite 中创建一条状态为 'completed' 的正式报告记录。
     * 4. 返回 reportId 供插件执行详情页跳转。
     */
    async exportExtensionReport(req, res) {
        try {
            const { actualImage, designImage, diagnosis, styles, elementInfo } = req.body

            // 基础校验：必须包含双端图像数据
            if (!actualImage || !designImage) {
                return res.status(400).json({
                    success: false,
                    message: '导出失败：缺少图像数据'
                })
            }

            const reportId = `ext-${Date.now()}`
            console.log(`[对比控制器] 正在执行插件数据同步: ${reportId}`)

            /**
             * 内部助手：将 Base64 编码转化为物理文件
             * @param {string} base64 - 图像 base64
             * @param {string} type - 前缀（实测/设计）
             * @returns {string} 文件名
             */
            const saveBase64 = (base64, type) => {
                const base64Data = base64.replace(/^data:image\/\w+;base64,/, "")
                const buffer = Buffer.from(base64Data, 'base64')
                const fileName = `${type}-${reportId}.png`
                const filePath = path.join(DIRS.UPLOADS, fileName)
                fs.writeFileSync(filePath, buffer)
                return fileName
            }

            // 执行磁盘写入
            const actualFileName = saveBase64(actualImage, 'actual')
            const designFileName = saveBase64(designImage, 'design')
            const actualPath = path.join(DIRS.UPLOADS, actualFileName)
            const designPath = path.join(DIRS.UPLOADS, designFileName)

            // 执行核心对比：生成像素差异图并计算精确相似度
            console.log(`[对比控制器] 正在为导出任务执行像素对比分析...`)
            const compareResult = await this.compareService.compare(designPath, actualPath, {
                enableClustering: true // 开启聚类分析，以便在平台展现红框标注
            })

            /** 
             * 构造标准报告对象 
             * 此处将插件采集的“非结构化”AI 结论填充到系统的“结构化”Fixes 字段中
             * 确保 Web 端报表能够平稳渲染。
             */
            const reportData = {
                id: reportId,
                status: 'completed',
                timestamp: Date.now(),
                similarity: compareResult.similarity,
                diffPixels: compareResult.diffPixels,
                totalPixels: compareResult.totalPixels,
                config: {
                    url: elementInfo?.url || 'Browser Extension',
                    designSource: designFileName
                },
                images: {
                    // 路径规范化：将绝对路径转化为前端可用的 URLPrefix
                    actual: normalizeToPublicUrl(actualPath),
                    design: normalizeToPublicUrl(designPath),
                    diff: compareResult.diffImage?.annotatedUrl || compareResult.diffImage?.url
                },
                diffRegions: compareResult.diffRegions || [],
                fixes: [{
                    priority: 'medium',
                    type: 'layout',
                    selector: elementInfo?.tagName || 'UI Component',
                    currentCSS: '',
                    suggestedCSS: '',
                    suggestion: diagnosis || 'AI 诊断未生成'
                }],
                elementInfo: styles // 原始采集样式快照
            }

            // 写入数据库
            this.reportRepo.create(reportData)

            res.json({
                success: true,
                data: { reportId },
                message: '数据已成功镜像至管理平台'
            })
        } catch (error) {
            this.handleError(res, error, '同步导出至平台失败')
        }
    }

    /**
     * 浏览器插件专用：AI 视觉实时诊断
     * 业务流程：
     * 1. 接收实测截图与设计稿 Base64。
     * 2. 调用 AIAnalyzerService 触达 Vision 大模型。
     * 3. 返回包含 Markdown 语法的视觉走查建议。
     */
    async diagnoseExtension(req, res) {
        try {
            const { actualImage, designImage, styles, elementInfo } = req.body

            if (!actualImage || !designImage) {
                return res.status(400).json({
                    success: false,
                    message: '缺少图像数据：需同时提供实测图和设计图'
                })
            }

            console.log(`[对比控制器] 处理插件诊断请求: ${elementInfo?.tagName || 'Unknown'} @ ${elementInfo?.url || 'Unknown'}`)

            // 1. 临时保存图像以进行物理相似度比对 (增强数据可靠性)
            const saveTempImg = (base64, type) => {
                const buffer = Buffer.from(base64.replace(/^data:image\/\w+;base64,/, ""), 'base64')
                const tempPath = path.join(DIRS.UPLOADS, `temp-${type}-${Date.now()}.png`)
                fs.writeFileSync(tempPath, buffer)
                return tempPath
            }

            const tempActual = saveTempImg(actualImage, 'actual')
            const tempDesign = saveTempImg(designImage, 'design')

            // 2. 异步并行执行：AI 视觉诊断 + 像素级相似度计算
            const [diagnosis, compareResult] = await Promise.all([
                this.aiService.diagnoseVision(actualImage, designImage, styles, elementInfo),
                this.compareService.compare(tempDesign, tempActual, { enableClustering: false })
            ])

            // 清理临时文件 (可选，或依赖后续清理任务)
            // try { fs.unlinkSync(tempActual); fs.unlinkSync(tempDesign); } catch(e) {}

            res.json({
                success: true,
                data: {
                    diagnosis,
                    similarity: compareResult.similarity
                },
                message: 'AI 视觉分析与相似度计算已完成'
            })
        } catch (error) {
            this.handleError(res, error, 'AI 视觉诊断执行失败')
        }
    }

    /**
     * 错误处理
     * @param {Response} res - Express 响应对象
     * @param {Error} error - 错误对象
     * @param {string} message - 错误消息
     */
    handleError(res, error, message = '操作失败') {
        console.error(`[对比控制器] ${message}:`, error)
        res.status(500).json({
            success: false,
            message: `${message}: ${error.message}`
        })
    }
}

export default CompareController
