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
 * CompareService - 视觉比对核心调度引擎
 * 
 * 职责：
 * 1. 图像规格化：确保不同分辨率的设计稿与截图在同一物理坐标系下进行精准像素比对。
 * 2. 算法吸附 (Smart Alignment)：利用滑动窗口算法自动补偿 1-2px 的渲染引擎偏差。
 * 3. 结果量化：输出相似度百分比、差异像素点分布、以及逻辑聚类区域。
 * 4. 格式化生产：生成带有标注框的增强型差异图（Augmented Diff Image）。
 */
class CompareService {
    /**
     * 实例初始化：配置对比精密参数
     */
    constructor() {
        this.defaultOptions = {
            threshold: 0.1,      // 像素差异判定阈值 (0-1)，越小代表对色彩偏差越敏感
            includeAA: false,    // 是否剔除“抗锯齿曲线”产生的边缘色差噪点
            alpha: 0.1,          // 差异背景透明度，用于在红点后面保留原图轮廓作为参照
            diffColor: [255, 0, 0],      // 显著差异点的渲染色 (RGB)
            diffColorAlt: [255, 200, 0]  // 聚类标注的辅助色彩
        }

        /**
         * 注入聚类分析器：
         * 用于将杂乱的“红点”差异点阵，通过 DBSCAN 算法聚合为具有业务意义的矩形区域。
         */
        this.clusteringService = new DiffClusteringService({
            minRegionSize: 100,      // 过滤面积小于 100 像素的孤立噪点
            neighborhoodRadius: 10,  // 合并半径 10 像素以内的邻近差异
            maxRegions: 20,          // 报告中最多标注 20 个高优先级差异区
            padding: 5
        })
    }

    /**
     * 执行全量比对流水线
     * 
     * 核心步骤：
     * Alignment (尺寸补白) -> Snapping (位移吸附) -> Match (像素扫描) -> Clustering (语义聚类) -> Save (资源化)
     * 
     * @param {string} designPath - 静态规范图路径
     * @param {string} actualPath - 实际渲染截图路径
     * @param {Object} options - 对比策略重载
     * @returns {Promise<Object>} 包含视觉洞察指标的报告结构体
     */
    async compare(designPath, actualPath, options = {}) {
        const config = {
            ...this.defaultOptions,
            engine: 'pixelmatch',
            enableClustering: true,
            enableSmartAlignment: true,
            ...options
        }
        try {
            console.log('[比对中枢] 启动图像分析序列')

            // 🚀 1. 物理对齐：获取共通的最大宽高，利用透明像素补平尺寸差，建立同一坐标原点
            const alignmentData = await this.alignImages(designPath, actualPath)
            let { img1, img2, width, height } = alignmentData

            let result = {}

            // 🚀 2. 智能吸附逻辑 (Smart Alignment)：
            // 解决浏览器在不同渲染引擎下可能产生的 1px 抖动或由于滚动条导致的微小位移。
            if (config.enableSmartAlignment) {
                const bestAlignment = await this.findBestAlignment(img1, img2, width, height, config)
                img2 = bestAlignment.alignedImg
                result.alignmentOffset = bestAlignment.offset
                result.alignmentImprovement = bestAlignment.improvement
            }

            // 🚀 3. 差异算力输出
            let engineResult
            if (config.engine === 'resemble') {
                engineResult = await this.compareWithResemble(designPath, actualPath, config)
            } else if (config.engine === 'odiff') {
                engineResult = await this.compareWithODiff(designPath, actualPath, config)
            } else {
                // 默认使用内存处理后的图像块进行 Pixelmatch 高速精算
                engineResult = await this.compareWithPixelmatchProcessed(img1, img2, width, height, config)
            }

            result = { ...result, ...engineResult }

            // 🚀 4. 语义化聚类：将散乱的像素点拟合为逻辑组件边框
            if (config.enableClustering && (result.diffPixels > 0 || result.similarity < 100)) {
                try {
                    const diffRegions = await this.clusteringService.analyzeDiffRegions(result.diffImage.path)

                    if (diffRegions && diffRegions.length > 0) {
                        // 绘制带有索引编号的增强版差异报告图
                        const enhancedDiffPath = result.diffImage.path.replace('.png', '-annotated.png')
                        await this.clusteringService.drawRegionAnnotations(
                            result.diffImage.path,
                            diffRegions,
                            enhancedDiffPath
                        )

                        result.diffRegions = diffRegions
                        result.diffImage.annotatedPath = enhancedDiffPath
                        result.diffImage.annotatedUrl = `/reports/${path.basename(enhancedDiffPath)}`
                    } else {
                        result.diffRegions = []
                    }
                } catch (clusterError) {
                    console.warn('[比对中枢] 聚类流水线熔断 (容错处理中):', clusterError.message)
                    result.diffRegions = []
                }
            }

            return result
        } catch (error) {
            console.error('[比对中枢] 链路致命错误:', error)
            throw new Error(`图像分析链路执行失败: ${error.message}`)
        }
    }

    /**
     * 图像补白对齐控制
     */
    async alignImages(path1, path2) {
        try {
            const meta1 = await sharp(path1).metadata()
            const meta2 = await sharp(path2).metadata()

            const targetWidth = Math.max(meta1.width, meta2.width)
            const targetHeight = Math.max(meta1.height, meta2.height)

            // 采用透明背景扩展，不拉伸图像，确保比对区域真实
            const buffer1 = await this.normalizeImage(path1, targetWidth, targetHeight)
            const buffer2 = await this.normalizeImage(path2, targetWidth, targetHeight)

            const img1 = PNG.sync.read(buffer1)
            const img2 = PNG.sync.read(buffer2)

            return { img1, img2, width: targetWidth, height: targetHeight }
        } catch (error) {
            console.error('[比对中枢] 物理对齐失败:', error)
            throw new Error(`无法完成图片对齐: ${error.message}`)
        }
    }

    /**
     * 规格化处理：利用 Sharp 进行画布扩展
     */
    async normalizeImage(imagePath, targetWidth, targetHeight) {
        const metadata = await sharp(imagePath).metadata();
        const extendBottom = targetHeight - metadata.height;
        const extendRight = targetWidth - metadata.width;

        return await sharp(imagePath)
            .extend({
                top: 0, left: 0,
                bottom: Math.max(0, extendBottom),
                right: Math.max(0, extendRight),
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .png().toBuffer()
    }

    /**
     * 智能吸附模型 (Smart Alignment)
     * 
     * 数学原理：
     * 1. 采用 [-1, 0, 1] 的九宫格位移搜索空间。
     * 2. 在内存中模拟各偏移量下的“快速相似度计算”。
     * 3. 计算“对齐改进率 (Improvement)”：(初始差异 - 偏移后最小差异) / 初始差异。
     * 4. 判定阈值：若 Improvement > 10% 确认为抖动，执行物理位移重绘；否则视为正常差异不予修正。
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

        // 置信度核查：只有当位移能大幅减少差异点时（>10%），才执行物理对齐，防止过度拟合
        if (improvement < 0.1) {
            return { alignedImg: img2, offset: { x: 0, y: 0 }, improvement: 0 }
        }

        const alignedImg = this.createOffsetImage(img2, width, height, bestOffset)
        return { alignedImg, offset: bestOffset, improvement }
    }

    /**
     * 内存级图像差异快测
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

                // 色觉感知阈值判定
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
     * 物理位移重构（重绘对齐图层）
     */
    createOffsetImage(originalImg, width, height, offset) {
        if (offset.x === 0 && offset.y === 0) return originalImg

        const newImg = new PNG({ width, height })
        for (let i = 0; i < newImg.data.length; i += 4) {
            newImg.data[i + 3] = 0 // 背景透明
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
     * 核心封装：调用 pixelmatch 驱动底层 C++ 扫描
     */
    performPixelMatch(img1, img2, diff, width, height, config) {
        return pixelmatch(
            img1.data, img2.data, diff.data, width, height,
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
     * 对齐结果保存与 Web 资源转换
     */
    async saveDiffImage(diff) {
        const uniqueId = Math.random().toString(36).substring(2, 15)
        const filename = `diff-${uniqueId}.png`
        const filepath = path.join(__dirname, '../../data/reports', filename)

        await new Promise((resolve, reject) => {
            diff.pack().pipe(fs.createWriteStream(filepath)).on('finish', resolve).on('error', reject)
        })

        // 异步生成缩略图，加速前端卡片渲染效率
        const thumbUrl = await this.generateThumbnail(filepath)

        return {
            filename,
            path: filepath,
            url: `/reports/${filename}`,
            thumbnailUrl: thumbUrl
        }
    }

    /**
     * 缩略图生成：将大容量图压缩为 400px WebP
     */
    async generateThumbnail(fullPath) {
        try {
            const thumbFilename = path.basename(fullPath).replace(/\.(png|jpg|jpeg)$/, '-thumb.webp')
            const thumbPath = path.join(path.dirname(fullPath), thumbFilename)

            await sharp(fullPath)
                .resize(400, null, { withoutEnlargement: true })
                .webp({ quality: 80 })
                .toFile(thumbPath)

            const isReport = thumbPath.includes('reports')
            return isReport ? `/reports/${thumbFilename}` : `/uploads/${thumbFilename}`
        } catch (error) {
            console.warn('[比对中枢] 缩略图引擎异常 (非阻塞):', error.message)
            return null
        }
    }

    /**
     * 量化：相似度计算公式
     */
    calculateSimilarity(diffPixels, totalPixels) {
        const similarity = ((totalPixels - diffPixels) / totalPixels) * 100
        return parseFloat(similarity.toFixed(2))
    }

    /**
     * 策略 A: Pixelmatch 混合模式
     */
    async compareWithPixelmatch(designPath, actualPath, config) {
        const { img1, img2, width, height } = await this.alignImages(designPath, actualPath)
        return await this.compareWithPixelmatchProcessed(img1, img2, width, height, config)
    }

    /**
     * 算法执行底层序列
     */
    async compareWithPixelmatchProcessed(img1, img2, width, height, config) {
        const diff = new PNG({ width, height })
        const diffPixels = this.performPixelMatch(img1, img2, diff, width, height, config)
        const diffImage = await this.saveDiffImage(diff)

        const totalPixels = width * height
        const similarity = this.calculateSimilarity(diffPixels, totalPixels)

        return { similarity, diffPixels, totalPixels, width, height, diffImage }
    }

    /**
     * 策略 B: Resemble.js 引擎
     * 优点：具备更强的色彩模糊容赦度，适合测试 H5/移动端
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
     * 策略 C: ODiff 极致性能引擎
     * 优点：原生二进制执行，在大规模走查任务中可节省 50% 时间
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
