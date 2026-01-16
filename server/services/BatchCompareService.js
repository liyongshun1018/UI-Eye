/**
 * 批量对比服务
 * 负责批量任务的对比逻辑
 */

import { getDatabase } from '../database.js'
import CompareService from './CompareService.js'
import path from 'path'
import fs from 'fs/promises'

class BatchCompareService {
    constructor() {
        this.compareService = new CompareService()
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
            const urls = JSON.parse(task.urls)
            const compareConfig = task.compare_config ? JSON.parse(task.compare_config) : {}
            const designMode = task.design_mode || 'single'
            const designSource = task.design_source

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

            // 4. 逐个进行对比
            const results = []
            let successCount = 0
            let failedCount = 0
            let totalSimilarity = 0

            for (let i = 0; i < items.length; i++) {
                const item = items[i]

                // 更新进度
                if (progressCallback) {
                    progressCallback({
                        current: i + 1,
                        total: items.length,
                        url: item.url,
                        status: 'comparing'
                    })
                }

                try {
                    // 更新明细状态为 running
                    db.prepare(
                        'UPDATE batch_task_items SET status = ? WHERE id = ?'
                    ).run('running', item.id)

                    // 确定使用的设计稿
                    const currentDesignSource = designMode === 'multiple'
                        ? item.design_source
                        : designSource

                    if (!currentDesignSource) {
                        throw new Error('未指定设计稿')
                    }

                    // 执行对比
                    const compareResult = await this.compareService.compare({
                        designSource: currentDesignSource,
                        screenshotSource: item.screenshot_path,
                        engine: compareConfig.engine || 'resemble',
                        ignoreAntialiasing: compareConfig.ignoreAntialiasing !== false,
                        aiModel: compareConfig.aiModel || 'siliconflow'
                    })

                    // 更新明细记录
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
                        compareResult.id,
                        compareResult.similarity,
                        compareResult.diffRegions?.length || 0,
                        item.id
                    )

                    successCount++
                    totalSimilarity += compareResult.similarity || 0

                    results.push({
                        url: item.url,
                        reportId: compareResult.id,
                        similarity: compareResult.similarity,
                        diffCount: compareResult.diffRegions?.length || 0,
                        status: 'completed'
                    })

                } catch (error) {
                    console.error(`对比失败 [${item.url}]:`, error.message)

                    // 更新明细为失败状态
                    db.prepare(`
                        UPDATE batch_task_items 
                        SET status = ?, 
                            error_message = ?,
                            completed_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    `).run('failed', error.message, item.id)

                    failedCount++

                    results.push({
                        url: item.url,
                        status: 'failed',
                        error: error.message
                    })
                }
            }

            // 5. 更新任务统计
            const avgSimilarity = successCount > 0 ? totalSimilarity / successCount : 0
            const totalDiffCount = results
                .filter(r => r.status === 'completed')
                .reduce((sum, r) => sum + (r.diffCount || 0), 0)

            db.prepare(`
                UPDATE batch_tasks 
                SET success = ?,
                    failed = ?,
                    avg_similarity = ?,
                    total_diff_count = ?
                WHERE id = ?
            `).run(successCount, failedCount, avgSimilarity, totalDiffCount, taskId)

            return {
                success: true,
                total: items.length,
                successCount,
                failedCount,
                avgSimilarity,
                totalDiffCount,
                results
            }

        } catch (error) {
            console.error('批量对比失败:', error)
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
