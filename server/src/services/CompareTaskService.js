import CaptureService from './CaptureService.js'
import CompareService from './CompareService.js'
import AIAnalyzerService from './AIAnalyzerService.js'
import ReportRepository from '../repositories/ReportRepository.js'
import wsServer from './WSServer.js'
import fs from 'fs'
import sharp from 'sharp'
import { resolveDesignPath, normalizeToPublicUrl } from '../utils/PathUtils.js'

/**
 * CompareTaskService - 原子任务调度中枢
 * 
 * 核心架构意图：
 * 1. 标准化执行流程：确保“单次对比”与“批量对比中的某一项”共用同一套底层的执行序列。
 * 2. 状态自动化：封装了从任务排队、初始化、截图、比对到 AI 诊断的全生命周期状态更新。
 * 3. 复用性：统一管理截图参数、对比阈值和数据转换逻辑，实现结果的高预见性。
 */
class CompareTaskService {
    constructor() {
        this.captureService = new CaptureService()
        this.compareService = new CompareService()
        this.aiService = new AIAnalyzerService()
        this.reportRepo = new ReportRepository()
    }

    /**
     * 执行标准的原子对比子任务
     * @param {Object} config - 配置参数对象
     * @param {string} config.url - 目标网页地址
     * @param {string} config.designSource - 设计稿路径
     * @param {Object} [config.options] - 算法参数（阈值等）
     * @param {string} [config.taskId] - 若属于批量任务，则为父批量任务 ID
     * @param {number} [config.index] - 在批量序列中的索引位置
     * @param {string} [config.id] - 强制指定的报告 ID（常用于单次对比的凭证对齐）
     * @param {Object} [progressManager] - 进度生命周期监听器
     * @returns {Promise<Object>} 包含报告状态与相似度分析的结构化数据
     */
    async execute(config, progressManager = null) {
        const { url, designSource, options = {}, taskId = null, index = 0, id = null } = config

        // ID 调度策略：优先使用预分配 ID（控制器生成），否则根据所属任务类型降级生成
        const reportId = id || (taskId ? `batch-${taskId}-${Date.now()}-${index}` : Date.now().toString())
        const aiModel = config.aiModel || 'siliconflow'

        console.log(`\n[原子任务] 链条启动 -> ${reportId} 目标: ${url}`)

        try {
            // 🚀 步骤 1: 环境占位与就绪
            // 如果已预创（如 Control 层），则直接更新为“处理中”，否则新建一条影子记录用于前端 UI 联动
            if (!this.reportRepo.exists(reportId)) {
                this.reportRepo.create({
                    id: reportId,
                    config,
                    status: 'processing',
                    timestamp: Date.now(),
                    progress: 5,
                    stepText: '🔍 正在初始化捕获引擎...'
                })
            } else {
                this.reportRepo.update(reportId, {
                    status: 'processing',
                    progress: 5,
                    stepText: '🔍 正在初始化捕获引擎...'
                })
            }

            /**
             * 进度外溢：同步更新数据库状态并触发回调监听
             */
            const updateProgress = (progress, stepText, currentPhase) => {
                this.reportRepo.update(reportId, { progress, stepText })
                if (progressManager && progressManager.onProgress) {
                    progressManager.onProgress({
                        reportId,
                        url,
                        progress,
                        stepText,
                        currentPhase
                    })
                }
            }

            // 🚀 步骤 2: 视口宽度探测
            // 设计逻辑：自动探测设计稿宽度，并以此宽度作为截图视口，确保对齐后的比对精度保持 1:1
            let viewportWidth = 375
            const designPath = resolveDesignPath(designSource)
            if (fs.existsSync(designPath)) {
                try {
                    const metadata = await sharp(designPath).metadata()
                    if (metadata.width) viewportWidth = metadata.width
                } catch (e) {
                    console.warn('[原子任务] 设计稿元数据读取失败，将回退至 375px:', e.message)
                }
            }

            // 🚀 步骤 3: 实时页面捕获 (Headless Chrome)
            updateProgress(10, `📸 正在以 ${viewportWidth}px 宽度捕获全量截图...`, 'screenshot')
            const actualScreenshot = await this.captureService.capture(url, {
                width: viewportWidth,
                deviceScaleFactor: 1, // 禁用视网膜缩放，确保物理像素精准对齐
                fullPage: true,
                ...options.viewport
            })

            // 🚀 步骤 4: 数学像素差异计算
            updateProgress(40, '⚖️ 执行高精度像素级比对分析...', 'compare')
            const compareResult = await this.compareService.compare(
                designPath,
                actualScreenshot.path,
                {
                    threshold: options.tolerance ? options.tolerance / 100 : 0.1,
                    engine: options.engine || 'pixelmatch',
                    enableClustering: true // 默认开启差异聚类用于报告展现红框
                }
            )

            // 🚀 步骤 5: AI 视觉神经诊断
            updateProgress(70, '🧠 AI 专家正在综合评估视觉偏差原因...', 'ai')
            const fixes = await this.aiService.analyze(
                {
                    design: designPath,
                    actual: actualScreenshot.path,
                    diff: compareResult.diffImage.path
                },
                compareResult,
                aiModel
            )

            // 🚀 步骤 6: 结果收口与持久化
            const finalData = {
                status: 'completed',
                progress: 100,
                stepText: '✅ 视觉对比与 AI 诊断已全部就绪',
                similarity: compareResult.similarity,
                diffPixels: compareResult.diffPixels,
                totalPixels: compareResult.totalPixels,
                images: {
                    design: normalizeToPublicUrl(designSource),
                    actual: actualScreenshot.url,
                    diff: compareResult.diffImage.url
                },
                diffRegions: compareResult.diffRegions,
                diffImage: compareResult.diffImage,
                fixes
            }

            // 同步写入数据库
            this.reportRepo.update(reportId, finalData)
            updateProgress(100, '✅ 报告生成完毕', 'finish')

            return {
                reportId,
                url,
                ...finalData,
                success: true
            }

        } catch (error) {
            console.error(`\n[原子任务] 链路执行中断 [${url}]:`, error)

            // 悲观逻辑处理：记录失败原因，确保 UI 能够正确显示异常信息
            const errorData = {
                status: 'failed',
                error: error.message,
                progress: 0
            }
            this.reportRepo.update(reportId, errorData)

            if (progressManager && progressManager.onProgress) {
                progressManager.onProgress({ reportId, url, status: 'failed', error: error.message })
            }

            return {
                reportId,
                ...errorData,
                success: false
            }
        }
    }
}

export default new CompareTaskService()
