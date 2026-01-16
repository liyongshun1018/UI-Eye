import puppeteer from 'puppeteer'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * 截取网页截图
 * @param {string} url - 页面 URL
 * @param {object} options - 配置选项
 * @returns {Promise<string>} 截图文件路径
 */
export async function captureScreenshot(url, options = {}) {
    const {
        width = 375,
        height = 667,
        fullPage = true,
        waitUntil = 'networkidle0'
    } = options

    let browser = null

    try {
        console.log(`开始截图: ${url}`)

        // 启动浏览器
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu'
            ]
        })

        const page = await browser.newPage()

        // 设置视口
        await page.setViewport({
            width,
            height,
            deviceScaleFactor: 2 // 2x 分辨率，更清晰
        })

        // 设置 User-Agent（模拟移动设备）
        await page.setUserAgent(
            'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
        )

        // 访问页面
        await page.goto(url, {
            waitUntil,
            timeout: 30000
        })

        // 等待额外的资源加载
        await new Promise(resolve => setTimeout(resolve, 2000))

        // 生成文件名
        const timestamp = Date.now()
        const filename = `screenshot-${timestamp}.png`
        const filepath = path.join(__dirname, '../data/uploads', filename)

        // 截图
        await page.screenshot({
            path: filepath,
            fullPage
        })

        console.log(`截图完成: ${filepath}`)

        return {
            filename,
            path: filepath,
            url: `/uploads/${filename}`
        }
    } catch (error) {
        console.error('截图失败:', error)
        throw new Error(`截图失败: ${error.message}`)
    } finally {
        if (browser) {
            await browser.close()
        }
    }
}

/**
 * 批量截图（支持多个页面状态）
 */
export async function captureMultipleScreenshots(url, states = []) {
    // 预留功能：支持捕获 hover、focus 等不同状态
    // 目前返回单个截图
    return [await captureScreenshot(url)]
}
