import pixelmatch from 'pixelmatch'
import { PNG } from 'pngjs'
import sharp from 'sharp'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import DiffClusteringService from './DiffClusteringService.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * CompareService.js - 图像对比核心服务
 * 负责两张图片的像素级比较、尺寸对齐、差异图生成以及后续的差异聚类分析。
 */
class CompareService {
    /**
     * 构造对比服务
     * 初始化默认参数并实例化差异聚类服务。
     */
    constructor() {
        this.defaultOptions = {
            threshold: 0.1,      // 匹配容差 (0-1)，数值越小越敏锐
            includeAA: false,    // 是否将抗锯齿像素视为差异
            alpha: 0.1,          // 差异图背景透明度
            diffColor: [255, 0, 0],      // 显著差异标注色 (红色)
            diffColorAlt: [255, 200, 0]  // 次要差异标注色 (橙色)
        }

        /** 初始化差异聚类引擎，用于将离散的像素差异聚合成有意义的区域 */
        this.clusteringService = new DiffClusteringService({
            minRegionSize: 100,      // 过滤掉小于 100 像素的微小噪点
            neighborhoodRadius: 10,  // 连通域搜索半径
            maxRegions: 20,          // 最多提取 20 个核心差异点
            padding: 5               // 标注框留白
        })
    }

    /**
     * 主入口：对比两张图片并生成深度分析报告
     * 流程：对齐尺寸 -> 执行像素级对比 -> 计算相似度 -> (可选) 聚类聚合 -> (可选) 绘制标注框
     * @param {string} designPath - 设计稿文件的绝对路径
     * @param {string} actualPath - 实际截图文件的绝对路径
     * @param {Object} options - 自定义对比选项
     * @returns {Promise<Object>} 包含相似度、差异区域及图片 URL 的结果对象
     */
    async compare(designPath, actualPath, options = {}) {
        const config = {
            ...this.defaultOptions,
            engine: 'pixelmatch', // 默认使用高性能 pixelmatch 引擎
            enableClustering: true, // 默认开启智能聚类分析
            ...options
        }
        try {
            console.log('[对比服务] 启动图像分析链路')
            console.log(`[对比服务] 算法引擎: ${config.engine}`)

            let result

            // 1. 根据配置选择底层算法引擎执行初步对比
            if (config.engine === 'resemble') {
                result = await this.compareWithResemble(designPath, actualPath, config)
            } else {
                result = await this.compareWithPixelmatch(designPath, actualPath, config)
            }

            // 智能分析环节：如果存在差异且开启了聚类功能
            if (config.enableClustering && result.diffPixels > 0) {
                try {
                    // 2. 利用聚类算法从差异图中提取语义化区域 (如：导航栏偏离、文字错位)
                    const diffRegions = await this.clusteringService.analyzeDiffRegions(result.diffImage.path)

                    if (diffRegions && diffRegions.length > 0) {
                        // 3. 生成增强版差异图：在差异图像上直接绘制 ID 编号和矩形框，方便用户定位
                        const enhancedDiffPath = result.diffImage.path.replace('.png', '-annotated.png')
                        await this.clusteringService.drawRegionAnnotations(
                            result.diffImage.path,
                            diffRegions,
                            enhancedDiffPath
                        )

                        // 组装最终结果
                        result.diffRegions = diffRegions
                        result.diffImage.annotatedPath = enhancedDiffPath
                        result.diffImage.annotatedUrl = `/reports/${path.basename(enhancedDiffPath)}`
                    } else {
                        result.diffRegions = []
                    }
                } catch (clusterError) {
                    console.warn('[对比服务] 聚类分析失败 (非阻塞):', clusterError.message)
                    result.diffRegions = []
                }
            }

            return result
        } catch (error) {
            console.error('[对比服务] 对比链路崩溃:', error)
            throw new Error(`图像对比失败: ${error.message}`)
        }
    }

    /**
     * 内部方法：自动对齐两张图片
     * 对比前必须保证两图分辨率一致。若不一致，将自动以最小公共区域进行等比例缩放/裁剪。
     */
    async alignImages(path1, path2) {
        try {
            const meta1 = await sharp(path1).metadata()
            const meta2 = await sharp(path2).metadata()

            // 选取较小的宽高作为基准，避免放大导致的模糊失真影响对比精度
            const targetWidth = Math.min(meta1.width, meta2.width)
            const targetHeight = Math.min(meta1.height, meta2.height)

            console.log(`[对比服务] 正在执行尺寸归一化: ${targetWidth}x${targetHeight}`)

            const buffer1 = await this.resizeImage(path1, targetWidth, targetHeight)
            const buffer2 = await this.resizeImage(path2, targetWidth, targetHeight)

            const img1 = PNG.sync.read(buffer1)
            const img2 = PNG.sync.read(buffer2)

            return { img1, img2, width: targetWidth, height: targetHeight }
        } catch (error) {
            console.error('[对比服务] 图片预处理失败:', error)
            throw new Error(`图片对齐失败: ${error.message}`)
        }
    }

    /**
     * 内部方法：使用 Sharp 执行高效图像缩放
     */
    async resizeImage(imagePath, width, height) {
        return await sharp(imagePath)
            .resize(width, height, {
                fit: 'cover',   // 填充模式
                position: 'top' // 从顶部对齐，适合网页长图
            })
            .png()
            .toBuffer()
    }

    /**
     * 内部方法：调用底层像素匹配库
     * @returns {number} 差异像素总数
     */
    performPixelMatch(img1, img2, diff, width, height, config) {
        return pixelmatch(
            img1.data,
            img2.data,
            diff.data,
            width,
            height,
            {
                threshold: config.threshold,
                includeAA: config.includeAA,
                alpha: config.alpha,
                diffColor: config.diffColor,
                diffColorAlt: config.diffColorAlt
            }
        )
    }

    /**
     * 内部方法：将生成的差异图保存到本地磁盘
     */
    async saveDiffImage(diff) {
        const timestamp = Date.now()
        const filename = `diff-${timestamp}.png`
        const filepath = path.join(__dirname, '../reports', filename)

        await new Promise((resolve, reject) => {
            diff.pack()
                .pipe(fs.createWriteStream(filepath))
                .on('finish', resolve)
                .on('error', reject)
        })

        return {
            filename,
            path: filepath,
            url: `/reports/${filename}`
        }
    }

    /**
     * 计算百分比相似度
     */
    calculateSimilarity(diffPixels, totalPixels) {
        const similarity = ((totalPixels - diffPixels) / totalPixels) * 100
        return parseFloat(similarity.toFixed(2))
    }

    /**
     * 核心实现：Pixelmatch 对比逻辑
     */
    async compareWithPixelmatch(designPath, actualPath, config) {
        // 对齐图片
        const { img1, img2, width, height } = await this.alignImages(designPath, actualPath)

        // 准备输出差异图缓冲区
        const diff = new PNG({ width, height })

        // 像素级逐行扫描比较
        const diffPixels = this.performPixelMatch(img1, img2, diff, width, height, config)

        // 保存文件
        const diffImage = await this.saveDiffImage(diff)

        // 计算相似度
        const totalPixels = width * height
        const similarity = this.calculateSimilarity(diffPixels, totalPixels)

        console.log(`[对比服务] Pixelmatch 对比完成，相似度: ${similarity}%`)

        return {
            similarity,
            diffPixels,
            totalPixels,
            width,
            height,
            diffImage
        }
    }

    /**
     * 扩展接口：Resemble.js 对比逻辑
     * 适合需要忽略颜色差异或抗锯齿更智能的场景。
     */
    async compareWithResemble(designPath, actualPath, config) {
        const ResembleCompareService = (await import('./ResembleCompareService.js')).default
        const resembleService = new ResembleCompareService()

        return await resembleService.compare(designPath, actualPath, {
            ignoreAntialiasing: config.ignoreAntialiasing ?? true,
            ignoreColors: config.ignoreColors ?? false,
            scaleToSameSize: true
        })
    }
}

export default CompareService
