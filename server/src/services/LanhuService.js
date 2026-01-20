import axios from 'axios'
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { fileURLToPath } from 'url'
import { DIRS, getPublicUrl } from '../utils/PathUtils.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * 蓝湖服务类
 * 负责处理远程图片 URL 的下载和验证
 * 支持蓝湖导出的图片地址或其他图床 URL
 */
class LanhuService {
    /**
     * 构造函数
     */
    constructor() {
        this.uploadsDir = DIRS.UPLOADS
        this.supportedFormats = ['.png', '.jpg', '.jpeg']
    }

    /**
     * 验证 URL 是否为有效的图片地址
     * @param {string} url - 图片 URL
     * @returns {boolean} 是否有效
     */
    validateImageUrl(url) {
        try {
            const parsedUrl = new URL(url)
            const pathname = parsedUrl.pathname.toLowerCase()

            // 检查是否有图片扩展名
            const hasImageExt = this.supportedFormats.some(ext => pathname.endsWith(ext))

            // 检查协议是否为 http/https
            const validProtocol = ['http:', 'https:'].includes(parsedUrl.protocol)

            return hasImageExt && validProtocol
        } catch (error) {
            console.error('[蓝湖服务] URL 验证失败:', error.message)
            return false
        }
    }

    /**
     * 下载远程图片到本地
     * @param {string} url - 图片 URL
     * @returns {Promise<Object>} 下载结果
     * @returns {string} return.filename - 文件名
     * @returns {string} return.path - 文件路径
     * @returns {string} return.url - 访问 URL
     * @returns {number} return.width - 图片宽度
     * @returns {number} return.height - 图片高度
     */
    async downloadImage(url) {
        console.log(`[蓝湖服务] 开始下载图片: ${url}`)

        // 验证 URL
        if (!this.validateImageUrl(url)) {
            throw new Error('无效的图片 URL，仅支持 PNG、JPG 格式')
        }

        try {
            // 生成本地文件名
            const timestamp = Date.now()
            const parsedUrl = new URL(url)
            const ext = path.extname(parsedUrl.pathname).toLowerCase()
            const filename = `lanhu-${timestamp}${ext}`
            const filepath = path.join(this.uploadsDir, filename)

            // 下载图片
            console.log('[蓝湖服务] 正在下载...')
            const response = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: 30000, // 30 秒超时
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                },
                maxRedirects: 5
            })

            // 验证响应
            if (!response.data || response.data.length === 0) {
                throw new Error('下载的图片数据为空')
            }

            // 保存到本地
            fs.writeFileSync(filepath, response.data)
            console.log(`[蓝湖服务] 图片已保存: ${filepath}`)

            // 获取图片信息
            const metadata = await sharp(filepath).metadata()

            const result = {
                filename,
                path: filepath,
                url: getPublicUrl('UPLOADS', filename),
                width: metadata.width,
                height: metadata.height,
                format: metadata.format,
                size: response.data.length
            }

            console.log(`[蓝湖服务] 下载完成: ${metadata.width}x${metadata.height}, ${(response.data.length / 1024).toFixed(2)} KB`)

            return result
        } catch (error) {
            console.error('[蓝湖服务] 下载失败:', error.message)

            // 提供更友好的错误信息
            if (error.code === 'ECONNABORTED') {
                throw new Error('图片下载超时，请检查网络连接或稍后重试')
            } else if (error.code === 'ENOTFOUND') {
                throw new Error('无法访问图片地址，请检查 URL 是否正确')
            } else if (error.response?.status === 404) {
                throw new Error('图片不存在（404），请检查 URL 是否正确')
            } else if (error.response?.status === 403) {
                throw new Error('无权访问该图片（403），请检查图片权限设置')
            } else if (error.message.includes('Invalid')) {
                throw new Error('下载的文件不是有效的图片格式')
            } else {
                throw new Error(`图片下载失败: ${error.message}`)
            }
        }
    }

    /**
     * 获取图片信息（不下载）
     * @param {string} url - 图片 URL
     * @returns {Promise<Object>} 图片信息
     */
    async getImageInfo(url) {
        try {
            const response = await axios.head(url, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
                }
            })

            return {
                contentType: response.headers['content-type'],
                contentLength: parseInt(response.headers['content-length'] || '0'),
                exists: response.status === 200
            }
        } catch (error) {
            console.error('[蓝湖服务] 获取图片信息失败:', error.message)
            return {
                exists: false,
                error: error.message
            }
        }
    }
}

export default LanhuService
