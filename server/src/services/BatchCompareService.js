/**
 * 批量对比服务
 * 负责批量任务的对比逻辑
 */

import { getDatabase } from '../database.js'
import CompareService from './CompareService.js'
import AIAnalyzerService from './AIAnalyzerService.js'
import ReportRepository from '../repositories/ReportRepository.js'
import pLimit from 'p-limit'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import { resolveDesignPath, normalizeToPublicUrl } from '../utils/PathUtils.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

class BatchCompareService {
    constructor() {
        this.compareService = new CompareService()
        this.aiService = new AIAnalyzerService()
        this.reportRepo = new ReportRepository()
        // 设置并发限制，默认为 3，避免 Puppeteer/ImageMagick 撑爆内存
        this.limit = pLimit(3)
    }

    /**
     * 执行批量对比
     * @param {number} taskId - 批量任务 ID
     * @param {Function} progressCallback - 进度回调函数
     * @returns {Promise<Object>} 对比结果统计
     */
    async batchCompare(taskId, progressCallback) {
        const db = getDatabase()

        try {
            // 1. 获取任务信息
            const task = db.prepare('SELECT * FROM batch_tasks WHERE id = ?').get(taskId)
            if (!task) {
                throw new Error(`任务不存在: ${taskId}`)
            }

            // 2. 解析配置
            const compareConfig = task.compare_config ? JSON.parse(task.compare_config) : {}
            const designMode = task.design_mode || 'single'
            const designSource = task.design_source
            const aiModel = task.ai_model || 'siliconflow'

            if (!designSource && designMode === 'single') {
                throw new Error('单设计稿模式下必须提供设计稿')
            }

            // 3. 获取所有任务明细
            const items = db.prepare(
                'SELECT * FROM batch_task_items WHERE task_id = ? ORDER BY id'
            ).all(taskId)

            if (items.length === 0) {
                throw new Error('没有找到任务明细')
            }

            console.log(`🚀 开始批量对比 [任务 ${taskId}]: 共 ${items.length} 个页面`)

            // 4. 并发执行对比逻辑
            const tasks = items.map((item, index) => {
                return this.limit(async () => {
                    const currentStatus = {
                        current: index + 1,
                        total: items.length,
                        url: item.url,
                        status: 'comparing'
                    }

                    if (progressCallback) progressCallback(currentStatus)

                    try {
                        db.prepare('UPDATE batch_task_items SET status = ? WHERE id = ?')
                            .run('running', item.id)

                        // 确定设计稿路径
                        const rawDesignSource = designMode === 'multiple' ? item.design_source : designSource
                        if (!rawDesignSource) throw new Error('未指定设计稿')

                        const designPath = resolveDesignPath(rawDesignSource)
                        if (!fs.existsSync(designPath)) throw new Error(`设计稿不存在: ${designPath}`)

                        // 执行对比 (纠正为位置参数)
                        const compareResult = await this.compareService.compare(
                            designPath,
                            item.screenshot_path,
                            {
                                threshold: compareConfig.tolerance ? compareConfig.tolerance / 100 : 0.1,
                                engine: compareConfig.engine || 'resemble'
                            }
                        )

                        // 生成全量的单条报告 (含 AI 分析)
                        const reportId = `batch-${taskId}-${Date.now()}-${index}`

                        // 创建基础记录
                        this.reportRepo.create({
                            id: reportId,
                            timestamp: Date.now(),
                            status: 'processing',
                            config: {
                                url: item.url,
                                designSource: rawDesignSource,
                                isBatch: true,
                                parentTaskId: taskId
                            }
                        })

                        // AI 分析流程
                        console.log(`[Batch] 对比完成，正在为 ${item.url} 执行 AI 分析...`)
                        const fixes = await this.aiService.analyze(
                            {
                                design: designPath,
                                actual: item.screenshot_path,
                                diff: compareResult.diffImage.path
                            },
                            compareResult,
                            aiModel
                        )

                        // 最终更新单条报告
                        this.reportRepo.update(reportId, {
                            status: 'completed',
                            similarity: compareResult.similarity,
                            diffPixels: compareResult.diffPixels,
                            totalPixels: compareResult.totalPixels,
                            images: {
                                design: normalizeToPublicUrl(rawDesignSource),
                                actual: normalizeToPublicUrl(item.screenshot_path),
                                diff: compareResult.diffImage.url
                            },
                            diffImage: compareResult.diffImage,
                            diffRegions: compareResult.diffRegions,
                            fixes
                        })

                        // 更新批量任务明细
                        db.prepare(`
                            UPDATE batch_task_items 
                            SET status = ?, 
                                report_id = ?, 
                                similarity = ?, 
                                diff_count = ?,
                                completed_at = CURRENT_TIMESTAMP
                            WHERE id = ?
                        `).run(
                            'completed',
                            reportId,
                            compareResult.similarity,
                            compareResult.diffRegions?.length || 0,
                            item.id
                        )

                        const finalResult = {
                            url: item.url,
                            success: true,
                            reportId: reportId,
                            similarity: compareResult.similarity,
                            diffCount: compareResult.diffRegions?.length || 0,
                            status: 'completed'
                        }

                        // 完成后推送最新快照
                        if (progressCallback) {
                            progressCallback({
                                ...currentStatus,
                                status: 'completed',
                                lastResult: finalResult
                            })
                        }

                        return finalResult
                    } catch (error) {
                        console.error(`❌ 对比失败 [${item.url}]:`, error.message)
                        db.prepare('UPDATE batch_task_items SET status = ?, error_message = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?')
                            .run('failed', error.message, item.id)

                        return { url: item.url, success: false, error: error.message }
                    }
                })
            })

            const itemResults = await Promise.all(tasks)

            // 5. 汇总数据
            const successItems = itemResults.filter(r => r.success)
            const successCount = successItems.length
            const failedCount = itemResults.length - successCount
            const avgSimilarity = successCount > 0
                ? successItems.reduce((acc, r) => acc + r.similarity, 0) / successCount
                : 0
            const totalDiffCount = successItems.reduce((acc, r) => acc + r.diffCount, 0)

            db.prepare(`
                UPDATE batch_tasks 
                SET success = ?, failed = ?, avg_similarity = ?, total_diff_count = ?
                WHERE id = ?
            `).run(successCount, failedCount, avgSimilarity, totalDiffCount, taskId)

            return {
                success: true,
                total: items.length,
                successCount,
                failedCount,
                avgSimilarity,
                totalDiffCount,
                results: itemResults
            }
        } catch (error) {
            console.error('批量对比主流程失败:', error)
            throw error
        }
    }

    /**
     * 获取任务对比结果
     * @param {number} taskId - 批量任务 ID
     * @returns {Object} 对比结果
     */
    getCompareResults(taskId) {
        const db = getDatabase()

        const task = db.prepare('SELECT * FROM batch_tasks WHERE id = ?').get(taskId)
        if (!task) {
            return null
        }

        const items = db.prepare(`
            SELECT * FROM batch_task_items 
            WHERE task_id = ? 
            ORDER BY id
        `).all(taskId)

        return {
            task: {
                id: task.id,
                name: task.name,
                status: task.status,
                total: task.total,
                success: task.success,
                failed: task.failed,
                avgSimilarity: task.avg_similarity,
                totalDiffCount: task.total_diff_count
            },
            items: items.map(item => ({
                id: item.id,
                url: item.url,
                reportId: item.report_id,
                status: item.status,
                similarity: item.similarity,
                diffCount: item.diff_count,
                error: item.error_message
            }))
        }
    }
}

export default BatchCompareService
