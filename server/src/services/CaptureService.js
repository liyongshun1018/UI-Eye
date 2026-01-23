import puppeteer from 'puppeteer'
import path from 'path'
import { fileURLToPath } from 'url'
import { getPhysicalPath, getPublicUrl } from '../utils/PathUtils.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * CaptureService - 自动化页面快照服务
 * 
 * 核心设计目标：
 * 1. 拟真性：利用 Puppeteer (Chromium) 模拟真实的人类设备环境（User-Agent、视口尺寸、渲染链路）。
 * 2. 稳定性：封装了资源加载探测、网络空闲判定、以及针对动态 DOM 伸缩的“视觉补偿等待”机制。
 * 3. 像素对齐：强制 Device Scale Factor 为 1，规避 Retina 屏导致的逻辑像素与物理像素图像偏移问题。
 */
class CaptureService {
    /**
     * 服务初始化：定义工业级截图基准配置
     */
    constructor() {
        this.defaultOptions = {
            width: 375,            // 模拟手机基础宽度（对齐大多数移动端 H5 规范）
            height: 667,           // 模拟手机基础高度
            fullPage: true,        // 自动探测长屏，深度捕获全量内容
            waitUntil: 'networkidle0', // 严格模式：等待全量网络请求结束（无活跃连接）
            deviceScaleFactor: 1   // 【工程关键】强制 1:1 像素捕获。若设为 2 会导致图像尺寸翻倍，使像素对比算法失效
        }
    }

    /**
     * 核心接口：执行生产级网页截图
     * 流程：引擎点火 -> 环境克隆 -> URL 导航 -> 状态平稳检测 -> 二进制采集 -> 资源落库
     * 
     * @param {string} url - 被测网页的 URL 凭证
     * @param {Object} options - 自定义覆盖配置（如视口定制）
     * @returns {Promise<Object>} 包含物权路径与 Web URL 的结果集
     */
    async capture(url, options = {}) {
        const config = { ...this.defaultOptions, ...options }
        let browser = null

        try {
            console.log(`[截图中枢] 正在同步渲染快照: ${url}`)

            // 🚀 1. 指令调度：唤醒 Chromium 混合动力无头模式
            browser = await this.launchBrowser()

            // 🚀 2. 环境模拟：注入视口尺寸并伪造设备指纹
            const page = await this.createPage(browser, config)

            // 🚀 3. 通讯建立：发起 HTTP(S) 请求并监控报文状态
            await this.navigateToPage(page, url, config.waitUntil)

            // 🚀 4. 视觉补偿（2.0s）：处理懒加载图、CSS 骨架屏动画、或异步 JS 渲染的尾音阶段
            await this.waitForResources(page)

            // 🚀 5. 像素导出：将页面当前 Render Tree 转化为 PNG 物理文件
            const result = await this.takeScreenshot(page, config.fullPage)

            console.log(`[截图中枢] 抓取链条执行成功，锚点: ${result.path}`)
            return result
        } catch (error) {
            console.error('[截图中枢] 链路捕获异常:', error)
            throw new Error(`Puppeteer 执行中断: ${error.message}`)
        } finally {
            // 安全熔断：无论成功失败，必须回收浏览器进程资源以释放 V8 堆内存
            if (browser) {
                await browser.close()
            }
        }
    }

    /**
     * 浏览器唤醒配置 (优化版)
     * 包含了在 Docker/Linux 环境下绕过沙盒限制的核心参数集
     */
    async launchBrowser() {
        return await puppeteer.launch({
            headless: 'new', // 采用 Puppeteer 全新重构的无头渲染引擎
            args: [
                '--no-sandbox',             // 允许在 root 环境执行
                '--disable-setuid-sandbox', // 禁用 setuid 沙盒
                '--disable-dev-shm-usage',  // 规避共享内存过小导致的崩溃
                '--disable-accelerated-2d-canvas',
                '--disable-gpu'             // 无头环境下禁用 GPU 加速以换取更稳定的渲染一致性
            ]
        })
    }

    /**
     * 页面环境克隆
     * 核心职责：设置精准视口、模拟 iPhone Safari User-Agent
     */
    async createPage(browser, config) {
        const page = await browser.newPage()

        // 对齐视觉规范
        await page.setViewport({
            width: config.width,
            height: config.height,
            deviceScaleFactor: config.deviceScaleFactor
        })

        // 设备指纹伪装，引导服务器返回真实的移动端 H5 模版
        await page.setUserAgent(
            'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
        )

        return page
    }

    /**
     * 跳转逻辑封装
     */
    async navigateToPage(page, url, waitUntil) {
        await page.goto(url, {
            waitUntil,
            timeout: 30000 // 限制 30s 最大超时上限，防止任务挂死
        })
    }

    /**
     * 视觉补偿等待 (Engineering Buffer)
     * 哪怕 NetworkIdle 触发，页面可能仍有 CSS 过渡动画或动态图片懒加载，
     * 强制 2000ms 的沉淀时间能极大提高“对比相似度”的稳定性。
     */
    async waitForResources(page, delay = 2000) {
        await new Promise(resolve => setTimeout(resolve, delay))
    }

    /**
     * 物理存储记录：生成 PNG 三元组（文件名、物理路径、访问链接）
     */
    async takeScreenshot(page, fullPage) {
        const timestamp = Date.now()
        const filename = `screenshot-${timestamp}.png`
        const filepath = getPhysicalPath('UPLOADS', filename)

        await page.screenshot({
            path: filepath,
            fullPage // 若页面高度超出 Viewport，则自动滚动截取全量内容
        })

        return {
            filename,
            path: filepath,
            url: getPublicUrl('UPLOADS', filename)
        }
    }

    /**
     * 批量接口：同步序列化捕获
     * 注：此处采用串行逻辑确保稳定性，如需提效可改为并发 P-Limit 模式
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
