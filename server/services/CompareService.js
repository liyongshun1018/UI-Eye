import pixelmatch from 'pixelmatch'
import { PNG } from 'pngjs'
import sharp from 'sharp'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import DiffClusteringService from './DiffClusteringService.js'
import ODiffCompareService from './ODiffCompareService.js'

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
            enableSmartAlignment: true, // 默认开启智能吸附
            ...options
        }
        try {
            console.log('[对比服务] 启动图像分析链路')
            console.log(`[对比服务] 算法引擎: ${config.engine}`)

            // 1. 获取对齐后的图片对象
            const alignmentData = await this.alignImages(designPath, actualPath)
            let { img1, img2, width, height } = alignmentData

            // 初始化结果对象
            let result = {}

            // 2. 核心增强：执行智能吸附 (Smart Alignment)
            // 如果开启了此功能，系统会尝试微调图片位置以找到最小差异点
            if (config.enableSmartAlignment) {
                const bestAlignment = await this.findBestAlignment(img1, img2, width, height, config)
                img2 = bestAlignment.alignedImg
                result.alignmentOffset = bestAlignment.offset
                result.alignmentImprovement = bestAlignment.improvement
                console.log(`[对比服务] 智能吸附完成，最佳偏移: x=${result.alignmentOffset.x}, y=${result.alignmentOffset.y}`)
            }

            // 3. 根据配置选择底层算法引擎执行初步对比
            let engineResult
            if (config.engine === 'resemble') {
                engineResult = await this.compareWithResemble(designPath, actualPath, config)
            } else if (config.engine === 'odiff') {
                engineResult = await this.compareWithODiff(designPath, actualPath, config)
            } else {
                // 注意：这里使用已经对齐（吸附）过的 img2
                engineResult = await this.compareWithPixelmatchProcessed(img1, img2, width, height, config)
            }

            result = { ...result, ...engineResult }

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
     * 核心逻辑：智能吸附算法
     * 目的：在 +/- 2 像素范围内寻找最佳对齐位，消除渲染引擎导致的 1px 抖动或整体偏移。
     */
    async findBestAlignment(img1, img2, width, height, config) {
        const offsets = [
            { x: 0, y: 0 },
            { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
            { x: 1, y: 1 }, { x: -1, y: -1 }, { x: 1, y: -1 }, { x: -1, y: 1 }
        ]

        let minDiff = Infinity
        let bestOffset = { x: 0, y: 0 }
        let initialDiff = 0

        for (const offset of offsets) {
            const diffCount = this.quickDiff(img1, img2, width, height, offset)
            if (offset.x === 0 && offset.y === 0) initialDiff = diffCount

            if (diffCount < minDiff) {
                minDiff = diffCount
                bestOffset = offset
            }
        }

        const improvement = initialDiff > 0 ? (initialDiff - minDiff) / initialDiff : 0

        // 如果偏移能带来的改进小于 10%，则忽略偏移，防止过度拟合
        if (improvement < 0.1) {
            return { alignedImg: img2, offset: { x: 0, y: 0 }, improvement: 0 }
        }

        // 生成偏移后的图片数据
        const alignedImg = this.createOffsetImage(img2, width, height, bestOffset)
        return { alignedImg, offset: bestOffset, improvement }
    }

    /**
     * 快速差异评估（不生成差异图，仅计数）
     */
    quickDiff(img1, img2, width, height, offset) {
        let diffCount = 0
        const data1 = img1.data
        const data2 = img2.data

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const targetX = x + offset.x
                const targetY = y + offset.y

                if (targetX < 0 || targetX >= width || targetY < 0 || targetY >= height) {
                    diffCount++
                    continue
                }

                const i1 = (y * width + x) * 4
                const i2 = (targetY * width + targetX) * 4

                if (
                    Math.abs(data1[i1] - data2[i2]) > 30 ||
                    Math.abs(data1[i1 + 1] - data2[i2 + 1]) > 30 ||
                    Math.abs(data1[i1 + 2] - data2[i2 + 2]) > 30
                ) {
                    diffCount++
                }
            }
        }
        return diffCount
    }

    /**
     * 创建偏移后的 PNG 对象
     */
    createOffsetImage(originalImg, width, height, offset) {
        if (offset.x === 0 && offset.y === 0) return originalImg

        const newImg = new PNG({ width, height })
        // 填充背景色 (透明)
        for (let i = 0; i < newImg.data.length; i += 4) {
            newImg.data[i + 3] = 0
        }

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const sourceX = x - offset.x
                const sourceY = y - offset.y

                if (sourceX >= 0 && sourceX < width && sourceY >= 0 && sourceY < height) {
                    const targetIdx = (y * width + x) * 4
                    const sourceIdx = (sourceY * width + sourceX) * 4

                    newImg.data[targetIdx] = originalImg.data[sourceIdx]
                    newImg.data[targetIdx + 1] = originalImg.data[sourceIdx + 1]
                    newImg.data[targetIdx + 2] = originalImg.data[sourceIdx + 2]
                    newImg.data[targetIdx + 3] = originalImg.data[sourceIdx + 3]
                }
            }
        }
        return newImg
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
        return await this.compareWithPixelmatchProcessed(img1, img2, width, height, config)
    }

    /**
     * 核心实现：基于已处理（对齐/吸附）图片的 Pixelmatch 对比
     */
    async compareWithPixelmatchProcessed(img1, img2, width, height, config) {
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

    /**
     * 扩展接口：ODiff 对比逻辑
     * 极端高性能的像素对比引擎。
     */
    async compareWithODiff(designPath, actualPath, config) {
        const odiffService = new ODiffCompareService()
        return await odiffService.compare(designPath, actualPath, {
            threshold: config.threshold,
            ignoreAntialiasing: config.ignoreAntialiasing
        })
    }
}

export default CompareService
