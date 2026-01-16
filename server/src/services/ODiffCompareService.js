import { compare } from 'odiff-bin';
import path from 'path';

/**
 * ODiffCompareService.js - ODiff 算法对比引擎
 * odiff 是目前号称速度最快的像素提取算法之一，专为大规模 UI 测试设计。
 */
class ODiffCompareService {
    /**
     * 执行对比
     * @param {string} baseImg - 基准图路径 (设计稿)
     * @param {string} compareImg - 待对比图路径 (实际截图)
     * @param {Object} options - 对比选项
     * @returns {Promise<Object>} 对比结果
     */
    async compare(baseImg, compareImg, options = {}) {
        const diffPath = compareImg.replace('.png', '-diff-odiff.png');

        try {
            console.log('[ODiff] 启动对比引擎...');

            const result = await compare(baseImg, compareImg, diffPath, {
                threshold: options.threshold || 0.1,
                antialiasing: options.ignoreAntialiasing ?? true, // 默认忽略抗锯齿
                failOnLayoutDiff: false
            });

            /**
             * ODiff 返回值示例:
             * { match: false, reason: 'pixel-diff', diffCount: 123, diffPercentage: 0.12 }
             */

            // 计算相似度 (100 - 差异百分比)
            const similarity = result.match ? 100 : (100 - (result.diffPercentage * 100));

            return {
                match: result.match,
                similarity: parseFloat(similarity.toFixed(2)),
                diffPixels: result.diffCount,
                diffImage: {
                    path: diffPath,
                    url: `/reports/${path.basename(diffPath)}`
                }
            };
        } catch (error) {
            console.error('[ODiff] 对比核心崩溃:', error);
            throw error;
        }
    }
}

export default ODiffCompareService;
