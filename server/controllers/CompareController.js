import CaptureService from '../services/CaptureService.js'
import CompareService from '../services/CompareService.js'
import AIAnalyzerService from '../services/AIAnalyzerService.js'
import ReportRepository from '../repositories/ReportRepository.js'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

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
        console.log(`\n[对比控制器] 开始处理对比任务: ${reportId}`)
        console.log('[对比控制器] 配置:', JSON.stringify(config, null, 2))

        try {
            // 步骤 1: 截取实际页面
            console.log('\n[1/4] 截取实际页面...')
            const actualScreenshot = await this.captureService.capture(config.url, config.viewport)

            // 步骤 2: 准备设计稿路径
            console.log('\n[2/4] 准备设计稿...')
            const designPath = this.resolveDesignPath(config.designSource)

            // 验证设计稿文件是否存在
            if (!fs.existsSync(designPath)) {
                throw new Error(`设计稿文件不存在: ${designPath}。请重新上传设计稿。`)
            }

            // 步骤 3: 图像对比
            console.log('\n[3/4] 执行像素级对比...')
            const compareResult = await this.compareService.compare(
                designPath,
                actualScreenshot.path,
                {
                    threshold: config.options?.tolerance ? config.options.tolerance / 100 : 0.1
                }
            )

            // 步骤 4: AI 分析
            console.log('\n[4/4] AI 分析差异...')
            const fixes = await this.aiService.analyze(
                {
                    design: designPath,
                    actual: actualScreenshot.path,
                    diff: compareResult.diffImage.path
                },
                compareResult,
                config.aiModel || 'siliconflow'
            )

            // 更新报告为完成状态
            this.reportRepo.update(reportId, {
                status: 'completed',
                similarity: compareResult.similarity,
                diffPixels: compareResult.diffPixels,
                totalPixels: compareResult.totalPixels,
                images: {
                    design: this.normalizeImagePath(config.designSource),
                    actual: actualScreenshot.url,
                    diff: compareResult.diffImage.url
                },
                fixes
            })

            console.log(`\n✅ 对比任务完成!`)
            console.log(`相似度: ${compareResult.similarity}%`)
            console.log(`修复建议: ${fixes.length} 项`)
        } catch (error) {
            console.error('\n❌ 对比任务失败:', error)
            this.reportRepo.update(reportId, {
                status: 'failed',
                error: error.message
            })
            throw error
        }
    }

    /**
     * 解析设计稿路径
     * @param {string} designSource - 设计稿来源
     * @returns {string} 绝对路径
     */
    resolveDesignPath(designSource) {
        let designPath = designSource

        // 如果是相对路径，转换为绝对路径
        if (!designPath.startsWith('/')) {
            designPath = path.join(__dirname, '..', designPath)
        }

        // 如果是 URL 路径，转换为文件系统路径
        if (designPath.startsWith('/uploads/')) {
            designPath = path.join(__dirname, '..', designPath)
        }

        return designPath
    }

    /**
     * 规范化图片路径（用于响应）
     * @param {string} imagePath - 图片路径
     * @returns {string} 规范化后的路径
     */
    normalizeImagePath(imagePath) {
        if (imagePath.startsWith('http') || imagePath.startsWith('/')) {
            return imagePath.replace(path.join(__dirname, '..'), '')
        }
        return `/uploads/${imagePath}`
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
     * 获取报告列表
     * @param {Request} req - Express 请求对象
     * @param {Response} res - Express 响应对象
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
