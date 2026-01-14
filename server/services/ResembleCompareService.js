import resemble from 'resemblejs'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Resemble.js 图像对比服务
 * 提供更智能的对比能力，支持抗锯齿检测和颜色容差
 */
class ResembleCompareService {
  /**
   * 构造函数
   * @param {Object} options - 配置选项
   */
  constructor(options = {}) {
    this.options = {
      ignoreAntialiasing: options.ignoreAntialiasing !== false, // 默认忽略抗锯齿
      ignoreColors: options.ignoreColors || false,
      scaleToSameSize: options.scaleToSameSize !== false,
      ...options
    }
  }

  /**
   * 对比两张图片
   * @param {string} designPath - 设计稿路径
   * @param {string} actualPath - 实际页面路径
   * @param {Object} options - 对比选项
   * @returns {Promise<Object>} 对比结果
   */
  async compare(designPath, actualPath, options = {}) {
    try {
      console.log('[Resemble服务] 开始图像对比')
      const compareOptions = { ...this.options, ...options }

      // 读取图片
      const designBuffer = await fs.readFile(designPath)
      const actualBuffer = await fs.readFile(actualPath)

      // 执行对比
      const result = await new Promise((resolve, reject) => {
        const comparison = resemble(designBuffer)
          .compareTo(actualBuffer)

        // 配置选项
        if (compareOptions.ignoreAntialiasing) {
          comparison.ignoreAntialiasing()
        }

        if (compareOptions.ignoreColors) {
          comparison.ignoreColors()
        }

        if (compareOptions.scaleToSameSize) {
          comparison.scaleToSameSize()
        }

        // 执行对比
        comparison.onComplete((data) => {
          if (data.error) {
            reject(new Error(data.error))
          } else {
            resolve(data)
          }
        })
      })

      console.log(`[Resemble服务] 对比完成: 相似度 ${(100 - parseFloat(result.misMatchPercentage)).toFixed(2)}%`)

      // 保存差异图
      const diffImagePath = await this.saveDiffImage(result)

      // 计算差异像素数
      const diffPixels = this.calculateDiffPixels(result)
      const totalPixels = result.dimensionDifference ? 0 : (result.width * result.height)

      // 格式化返回结果
      return {
        similarity: parseFloat((100 - parseFloat(result.misMatchPercentage)).toFixed(2)),
        diffPixels,
        totalPixels,
        width: result.width,
        height: result.height,
        diffBounds: result.diffBounds,
        analysisTime: result.analysisTime,
        diffImage: {
          path: diffImagePath,
          url: `/reports/${path.basename(diffImagePath)}`
        },
        rawData: result.rawMisMatchPercentage
      }
    } catch (error) {
      console.error('[Resemble服务] 对比失败:', error)
      throw error
    }
  }

  /**
   * 计算差异像素数
   * @param {Object} result - Resemble.js 结果
   * @returns {number} 差异像素数
   */
  calculateDiffPixels(result) {
    if (result.dimensionDifference) return 0
    const totalPixels = result.width * result.height
    return Math.round(totalPixels * result.rawMisMatchPercentage / 100)
  }

  /**
   * 保存差异图
   * @param {Object} result - Resemble.js 结果
   * @returns {Promise<string>} 差异图路径
   */
  async saveDiffImage(result) {
    const timestamp = Date.now()
    const diffFileName = `diff-resemble-${timestamp}.png`
    const reportsDir = path.join(__dirname, '../reports')
    const diffPath = path.join(reportsDir, diffFileName)

    // 获取差异图 Buffer
    const diffBuffer = result.getBuffer()

    // 保存到文件
    await fs.writeFile(diffPath, diffBuffer)

    console.log(`[Resemble服务] 差异图已保存: ${diffPath}`)
    return diffPath
  }

  /**
   * 获取差异区域边界
   * @param {Object} diffBounds - Resemble.js 差异边界
   * @returns {Array} 格式化的边界信息
   */
  getDiffRegions(diffBounds) {
    if (!diffBounds) return []

    return [{
      x: diffBounds.left,
      y: diffBounds.top,
      width: diffBounds.right - diffBounds.left,
      height: diffBounds.bottom - diffBounds.top
    }]
  }
}

export default ResembleCompareService
