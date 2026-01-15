import puppeteer from 'puppeteer'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * CaptureService.js - 页面截图服务
 * 利用 Puppeteer (无头浏览器) 模拟真实用户访问网页并生成高分辨率截图。
 * 支持视口缩放 (Device Scale Factor)、全页截图以及移动端 User-Agent 模拟。
 */
class CaptureService {
    /**
     * 构造截图服务
     * 初始化默认截图配置，确保在不同视口下的一致性。
     */
    constructor() {
        this.defaultOptions = {
            width: 375,            // 默认宽度 (iPhone 尺寸)
            height: 667,           // 默认高度
            fullPage: true,        // 默认截取长屏
            waitUntil: 'networkidle0', // 默认等待网络完全空闲
            deviceScaleFactor: 2   // 2倍分辨率 (Retina) 确保 AI 分析更精准
        }
    }

    /**
     * 执行网页截图任务
     * 封装了完整的浏览器生命周期管理：启动 -> 创建页面 -> 导航 -> 等待 -> 截图 -> 关闭。
     * @param {string} url - 目标网页的在线 URL
     * @param {Object} options - 自定义截图选项，覆盖默认值
     * @returns {Promise<Object>} 包含文件名、绝对路径和相对访问 URL 的对象
     */
    async capture(url, options = {}) {
        const config = { ...this.defaultOptions, ...options }
        let browser = null

        try {
            console.log(`[截图服务] 正在渲染页面: ${url}`)

            // 1. 启动无头浏览器
            browser = await this.launchBrowser()

            // 2. 并在浏览器中开启新标签页并配置模拟环境
            const page = await this.createPage(browser, config)

            // 3. 访问目标 URL
            await this.navigateToPage(page, url, config.waitUntil)

            // 4. 额外缓冲：等待图片、字体等静态资源完成最终渲染
            await this.waitForResources(page)

            // 5. 保存截图到指定目录
            const result = await this.takeScreenshot(page, config.fullPage)

            console.log(`[截图服务] 任务成功完成，输出至: ${result.path}`)
            return result
        } catch (error) {
            console.error('[截图服务] 截图链路异常:', error)
            throw new Error(`页面截图失败: ${error.message}`)
        } finally {
            // 确保无论成功还是失败，浏览器进程都能被正确关闭，防止内存泄漏
            if (browser) {
                await browser.close()
            }
        }
    }

    /**
     * 内部方法：启动 Puppeteer 浏览器实例
     * 配置了 Linux 环境下必须的 --no-sandbox 等参数
     * @returns {Promise<Browser>}
     */
    async launchBrowser() {
        return await puppeteer.launch({
            headless: 'new', // 使用 Puppeteer 新一代无头模式
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
     * 内部方法：初始化页面视口和 User-Agent
     * 模拟移动端 Safari 浏览器环境，以获取最真实的移动端 H5 渲染效果。
     * @param {Browser} browser 
     * @param {Object} config 
     */
    async createPage(browser, config) {
        const page = await browser.newPage()

        // 设置缩放比例，解决截图模糊问题
        await page.setViewport({
            width: config.width,
            height: config.height,
            deviceScaleFactor: config.deviceScaleFactor
        })

        // 设置移动端标准的 User-Agent
        await page.setUserAgent(
            'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
        )

        return page
    }

    /**
     * 内部方法：执行 URL 跳转
     */
    async navigateToPage(page, url, waitUntil) {
        await page.goto(url, {
            waitUntil,
            timeout: 30000 // 默认 30 秒超时
        })
    }

    /**
     * 内部方法：视觉补偿等待
     * 哪怕网络空闲，有时动态 JS 仍需一点时间来调整 DOM 布局或动画，故强制等待 2s 确保 UI 稳定。
     */
    async waitForResources(page, delay = 2000) {
        await new Promise(resolve => setTimeout(resolve, delay))
    }

    /**
     * 内部方法：物理截图并保存文件
     * 生成带时间戳的文件名，存储在 uploads 目录下。
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
     * 批量处理：支持一次性截取多个 URL（待扩展到并发处理）
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
