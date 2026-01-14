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
 * 图像对比服务类
 * 负责像素级图像对比和差异分析
 */
class CompareService {
    /**
     * 构造函数
     */
    constructor() {
        this.defaultOptions = {
            threshold: 0.1,      // 容差值 0-1
            includeAA: false,    // 是否包含抗锯齿差异
            alpha: 0.1,          // 透明度
            diffColor: [255, 0, 0],      // 红色标注差异
            diffColorAlt: [255, 200, 0]  // 橙色标注次要差异
        }

        // 初始化差异聚类服务
        this.clusteringService = new DiffClusteringService({
            minRegionSize: 100,
            neighborhoodRadius: 10,
            maxRegions: 20,
            padding: 5
        })
    }

    /**
     * 对比两张图片
     * @param {string} designPath - 设计稿路径
     * @param {string} actualPath - 实际页面截图路径
     * @param {Object} options - 对比选项
     * @param {number} options.threshold - 容差值
     * @param {boolean} options.includeAA - 是否包含抗锯齿差异
     * @param {boolean} options.enableClustering - 是否启用差异聚类（默认 true）
     * @returns {Promise<Object>} 对比结果
     * @returns {number} return.similarity - 相似度百分比
     * @returns {number} return.diffPixels - 差异像素数
     * @returns {number} return.totalPixels - 总像素数
     * @returns {Object} return.diffImage - 差异图信息
     * @returns {Array} return.diffRegions - 差异区域列表（如果启用聚类）
     */
    async compare(designPath, actualPath, options = {}) {
        const config = {
            ...this.defaultOptions,
            engine: 'pixelmatch', // 默认引擎
            enableClustering: true,
            ...options
        }
        try {
            console.log('[对比服务] 开始图像对比')
            console.log('[对比服务] 引擎:', config.engine)

            let result

            // 根据引擎选择对比方法
            if (config.engine === 'resemble') {
                result = await this.compareWithResemble(designPath, actualPath, config)
            } else {
                result = await this.compareWithPixelmatch(designPath, actualPath, config)
            }

            // 如果启用聚类，分析差异区域并生成增强版差异图
            if (config.enableClustering && result.diffPixels > 0) {

                try {
                    // 分析差异区域
                    const diffRegions = await this.clusteringService.analyzeDiffRegions(result.diffImage.path)

                    if (diffRegions && diffRegions.length > 0) {

                        // 生成带标注的增强版差异图
                        const enhancedDiffPath = result.diffImage.path.replace('.png', '-annotated.png')
                        await this.clusteringService.drawRegionAnnotations(
                            result.diffImage.path,
                            diffRegions,
                            enhancedDiffPath
                        )

                        // 更新结果
                        result.diffRegions = diffRegions
                        result.diffImage.annotatedPath = enhancedDiffPath
                        result.diffImage.annotatedUrl = `/reports/${path.basename(enhancedDiffPath)}`
                    } else {
                        result.diffRegions = []
                    }
                } catch (clusterError) {
                    console.warn('[聚类失败]', clusterError.message)
                    result.diffRegions = []
                }
            }

            return result
        } catch (error) {
            console.error('[对比服务] 图像对比失败:', error)
            throw new Error(`图像对比失败: ${error.message}`)
        }
    }

    /**
     * 对齐两张图片（调整为相同尺寸）
     * @param {string} path1 - 图片1路径
     * @param {string} path2 - 图片2路径
     * @returns {Promise<Object>} 对齐后的图片数据
     */
    async alignImages(path1, path2) {
        try {
            // 获取两张图片的元数据
            const meta1 = await sharp(path1).metadata()
            const meta2 = await sharp(path2).metadata()

            // 使用较小的尺寸作为目标尺寸
            const targetWidth = Math.min(meta1.width, meta2.width)
            const targetHeight = Math.min(meta1.height, meta2.height)

            console.log(`[对比服务] 对齐图片尺寸: ${targetWidth}x${targetHeight}`)

            // 调整图片尺寸
            const buffer1 = await this.resizeImage(path1, targetWidth, targetHeight)
            const buffer2 = await this.resizeImage(path2, targetWidth, targetHeight)

            // 转换为 PNG 对象
            const img1 = PNG.sync.read(buffer1)
            const img2 = PNG.sync.read(buffer2)

            return {
                img1,
                img2,
                width: targetWidth,
                height: targetHeight
            }
        } catch (error) {
            console.error('[对比服务] 图片对齐失败:', error)
            throw new Error(`图片对齐失败: ${error.message}`)
        }
    }

    /**
     * 调整图片尺寸
     * @param {string} imagePath - 图片路径
     * @param {number} width - 目标宽度
     * @param {number} height - 目标高度
     * @returns {Promise<Buffer>} 调整后的图片缓冲区
     */
    async resizeImage(imagePath, width, height) {
        return await sharp(imagePath)
            .resize(width, height, {
                fit: 'cover',
                position: 'top'
            })
            .png()
            .toBuffer()
    }

    /**
     * 执行像素匹配
     * @param {PNG} img1 - 图片1
     * @param {PNG} img2 - 图片2
     * @param {PNG} diff - 差异图
     * @param {number} width - 宽度
     * @param {number} height - 高度
     * @param {Object} config - 配置选项
     * @returns {number} 差异像素数
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
     * 保存差异图
     * @param {PNG} diff - 差异图对象
     * @returns {Promise<Object>} 差异图信息
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
     * 计算相似度
     * @param {number} diffPixels - 差异像素数
     * @param {number} totalPixels - 总像素数
     * @returns {number} 相似度百分比
     */
    calculateSimilarity(diffPixels, totalPixels) {
        const similarity = ((totalPixels - diffPixels) / totalPixels) * 100
        return parseFloat(similarity.toFixed(2))
    }

    /**
     * 分析差异区域
     * @param {string} diffImagePath - 差异图路径
     * @returns {Promise<Array>} 差异区域列表
     */
    async analyzeDiffRegions(diffImagePath) {
        try {
            return await this.clusteringService.analyzeDiffRegions(diffImagePath)
        } catch (error) {
            console.error('[对比服务] 差异区域分析失败:', error)
            return []
        }
    }

    /**
     * 生成增强版差异图（带区域标注）
     * @param {string} diffImagePath - 原始差异图路径
     * @param {Array} regions - 差异区域列表
     * @returns {Promise<string>} 增强版差异图路径
     */
    async generateEnhancedDiffImage(diffImagePath, regions) {
        try {
            const enhancedPath = diffImagePath.replace('.png', '-annotated.png')
            await this.clusteringService.drawRegionAnnotations(diffImagePath, regions, enhancedPath)
            return enhancedPath
        } catch (error) {
            console.error('[对比服务] 生成增强版差异图失败:', error)
            throw error
        }
    }

    /**
     * 使用 Pixelmatch 引擎对比
     * @param {string} designPath - 设计稿路径
     * @param {string} actualPath - 实际页面路径
     * @param {Object} config - 配置选项
     * @returns {Promise<Object>} 对比结果
     */
    async compareWithPixelmatch(designPath, actualPath, config) {
        // 读取并对齐图片
        const { img1, img2, width, height } = await this.alignImages(designPath, actualPath)

        // 创建差异图
        const diff = new PNG({ width, height })

        // 执行像素对比
        const diffPixels = this.performPixelMatch(img1, img2, diff, width, height, config)

        // 保存基础差异图
        const diffImage = await this.saveDiffImage(diff)

        // 计算相似度
        const totalPixels = width * height
        const similarity = this.calculateSimilarity(diffPixels, totalPixels)

        console.log(`[对比服务] Pixelmatch对比完成: 相似度 ${similarity}%`)

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
     * 使用 Resemble.js 引擎对比
     * @param {string} designPath - 设计稿路径
     * @param {string} actualPath - 实际页面路径
     * @param {Object} config - 配置选项
     * @returns {Promise<Object>} 对比结果
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
