import puppeteer from 'puppeteer'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * 页面截图服务类
 * 负责使用 Puppeteer 截取网页截图
 */
class CaptureService {
    /**
     * 构造函数
     */
    constructor() {
        this.defaultOptions = {
            width: 375,
            height: 667,
            fullPage: true,
            waitUntil: 'networkidle0',
            deviceScaleFactor: 2 // 2x 分辨率，更清晰
        }
    }

    /**
     * 截取网页截图
     * @param {string} url - 页面 URL
     * @param {Object} options - 截图选项
     * @param {number} options.width - 视口宽度
     * @param {number} options.height - 视口高度
     * @param {boolean} options.fullPage - 是否全页截图
     * @param {string} options.waitUntil - 等待条件
     * @returns {Promise<Object>} 截图结果
     * @returns {string} return.filename - 文件名
     * @returns {string} return.path - 文件路径
     * @returns {string} return.url - 访问 URL
     */
    async capture(url, options = {}) {
        const config = { ...this.defaultOptions, ...options }
        let browser = null

        try {
            console.log(`[截图服务] 开始截图: ${url}`)

            // 启动浏览器
            browser = await this.launchBrowser()

            // 创建页面
            const page = await this.createPage(browser, config)

            // 访问页面
            await this.navigateToPage(page, url, config.waitUntil)

            // 等待额外资源加载
            await this.waitForResources(page)

            // 执行截图
            const result = await this.takeScreenshot(page, config.fullPage)

            console.log(`[截图服务] 截图完成: ${result.path}`)
            return result
        } catch (error) {
            console.error('[截图服务] 截图失败:', error)
            throw new Error(`页面截图失败: ${error.message}`)
        } finally {
            if (browser) {
                await browser.close()
            }
        }
    }

    /**
     * 启动浏览器
     * @returns {Promise<Browser>} 浏览器实例
     */
    async launchBrowser() {
        return await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu'
            ]
        })
    }

    /**
     * 创建页面并配置
     * @param {Browser} browser - 浏览器实例
     * @param {Object} config - 配置选项
     * @returns {Promise<Page>} 页面实例
     */
    async createPage(browser, config) {
        const page = await browser.newPage()

        // 设置视口
        await page.setViewport({
            width: config.width,
            height: config.height,
            deviceScaleFactor: config.deviceScaleFactor
        })

        // 设置 User-Agent（模拟移动设备）
        await page.setUserAgent(
            'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
        )

        return page
    }

    /**
     * 导航到指定页面
     * @param {Page} page - 页面实例
     * @param {string} url - 目标 URL
     * @param {string} waitUntil - 等待条件
     */
    async navigateToPage(page, url, waitUntil) {
        await page.goto(url, {
            waitUntil,
            timeout: 30000
        })
    }

    /**
     * 等待额外资源加载
     * @param {Page} page - 页面实例
     * @param {number} delay - 延迟时间（毫秒）
     */
    async waitForResources(page, delay = 2000) {
        await new Promise(resolve => setTimeout(resolve, delay))
    }

    /**
     * 执行截图
     * @param {Page} page - 页面实例
     * @param {boolean} fullPage - 是否全页截图
     * @returns {Promise<Object>} 截图结果
     */
    async takeScreenshot(page, fullPage) {
        const timestamp = Date.now()
        const filename = `screenshot-${timestamp}.png`
        const filepath = path.join(__dirname, '../uploads', filename)

        await page.screenshot({
            path: filepath,
            fullPage
        })

        return {
            filename,
            path: filepath,
            url: `/uploads/${filename}`
        }
    }

    /**
     * 批量截图（预留功能）
     * @param {Array<string>} urls - URL 列表
     * @param {Object} options - 截图选项
     * @returns {Promise<Array>} 截图结果列表
     */
    async captureMultiple(urls, options = {}) {
        const results = []
        for (const url of urls) {
            try {
                const result = await this.capture(url, options)
                results.push({ success: true, url, result })
            } catch (error) {
                results.push({ success: false, url, error: error.message })
            }
        }
        return results
    }
}

export default CaptureService
