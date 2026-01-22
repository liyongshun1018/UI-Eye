import CaptureService from './CaptureService.js'
import CompareService from './CompareService.js'
import AIAnalyzerService from './AIAnalyzerService.js'
import ReportRepository from '../repositories/ReportRepository.js'
import wsServer from './WSServer.js'
import fs from 'fs'
import sharp from 'sharp'
import { resolveDesignPath, normalizeToPublicUrl } from '../utils/PathUtils.js'

/**
 * CompareTaskService.js - 原子对比任务执行器
 * 核心设计理念：无论是单次对比还是批量对比中的某一项，都应通过此类执行，
 * 确保截图参数、对比算法、AI提示词和数据结构完全一致。
 */
class CompareTaskService {
    constructor() {
        this.captureService = new CaptureService()
        this.compareService = new CompareService()
        this.aiService = new AIAnalyzerService()
        this.reportRepo = new ReportRepository()
    }

    /**
     * 执行一个标准的原子对比任务
     * @param {Object} config - 任务配置 { url, designSource, options, taskId, index }
     * @param {Object} progressManager - 可选，用于广播进度的回调对象
     * @returns {Promise<Object>} 运行结果（含 reportId, similarity 等）
     */
    async execute(config, progressManager = null) {
        const { url, designSource, options = {}, taskId = null, index = 0, id = null } = config
        // 关键修复：优先使用传入的 ID（单次对比由控制器生成），防止前后端 ID 不匹配导致进度条卡死
        const reportId = id || (taskId ? `batch-${taskId}-${Date.now()}-${index}` : Date.now().toString())
        const aiModel = config.aiModel || 'siliconflow'

        console.log(`\n[原子执行器] 任务启动: ${reportId} (${url})`)

        try {
            // 1. 初始化或获取报告记录
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
                // 如果已由外部预创建（如 CompareController），则执行状态对齐
                this.reportRepo.update(reportId, {
                    status: 'processing',
                    progress: 5,
                    stepText: '🔍 正在初始化捕获引擎...'
                })
            }

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

            // 2. 探测设计稿宽度并对齐截图视口
            let viewportWidth = 375
            const designPath = resolveDesignPath(designSource)
            if (fs.existsSync(designPath)) {
                try {
                    const metadata = await sharp(designPath).metadata()
                    if (metadata.width) viewportWidth = metadata.width
                } catch (e) {
                    console.warn('[原子执行器] 无法探测设计稿宽度，使用默认值:', e.message)
                }
            }

            // 3. 页面截图 (统一通过 CaptureService)
            updateProgress(10, `📸 正在以 ${viewportWidth}px 宽度捕获页面...`, 'screenshot')
            const actualScreenshot = await this.captureService.capture(url, {
                width: viewportWidth,
                deviceScaleFactor: 1, // 关键：强制 1:1 像素捕获以匹配设计稿
                fullPage: true,
                ...options.viewport
            })

            // 4. 执行图像对比
            updateProgress(40, '⚖️ 执行像素级高保真差异分析...', 'compare')
            const compareResult = await this.compareService.compare(
                designPath,
                actualScreenshot.path,
                {
                    threshold: options.tolerance ? options.tolerance / 100 : 0.1,
                    engine: options.engine || 'pixelmatch',
                    enableClustering: true
                }
            )

            // 5. AI 分析
            updateProgress(70, '🧠 AI 正在诊断视觉差异原因...', 'ai')
            const fixes = await this.aiService.analyze(
                {
                    design: designPath,
                    actual: actualScreenshot.path,
                    diff: compareResult.diffImage.path
                },
                compareResult,
                aiModel
            )

            // 6. 最终落库
            const finalData = {
                status: 'completed',
                progress: 100,
                stepText: '✅ 对比分析已完成',
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

            this.reportRepo.update(reportId, finalData)
            updateProgress(100, '✅ 已生成报告', 'finish')

            return {
                reportId,
                url, // 明确返回处理的 URL，供批量任务记录使用
                ...finalData,
                success: true
            }

        } catch (error) {
            console.error(`\n[原子执行器] 任务失败 [${url}]:`, error)

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
