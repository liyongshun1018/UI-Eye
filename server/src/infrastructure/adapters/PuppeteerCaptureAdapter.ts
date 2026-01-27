import puppeteer from 'puppeteer';
import path from 'path';
import { DIRS } from '../../utils/PathUtils.js';

/**
 * PuppeteerCaptureAdapter - 网页快照抓取适配器
 * 职责：负责将动态的 HTML/CSS 页面转换为物理的 PNG 图片，为后续的像素对比提供原始素材
 */
export class PuppeteerCaptureAdapter {
    /**
     * 核心方法：执行截图抓取
     * @param url 目标网页地址
     * @param options 截图选项 (宽度、是否全屏)
     * @returns 抓取结果 (物理路径与可访问 URL)
     */
    async capture(url: string, options: { width?: number; fullPage?: boolean } = {}) {
        // 定义截图保存的物理路径
        const filename = `capture-${Date.now()}.png`;
        const filePath = path.join(DIRS.UPLOADS, filename);
        const screenshotUrl = `/uploads/${filename}`;

        console.log(`[Puppeteer] 正在启动隐身浏览器以抓取: ${url}`);

        // 1. 启动并初始化浏览器上下文
        const browser = await puppeteer.launch({
            headless: true, // 生产环境下使用无头模式
            ignoreHTTPSErrors: true, // 忽略 SSL 证书错误，支持测试环境及自签名证书
            args: ['--no-sandbox', '--disable-setuid-sandbox'] // 环境兼容性参数
        });

        try {
            const page = await browser.newPage();

            // 2. 设置视口宽度。注意：高度可设为较大值或由 fullPage 动态决定
            await page.setViewport({
                width: options.width || 1920,
                height: 1080,
                deviceScaleFactor: 1 // 强制使用 1x 缩放，确保像素比对不会溢出
            });

            // 3. 导航至目标地址。使用 networkidle2 确保页面大部分静态资源加载完毕
            await page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: 60000 // 限制 60 秒加载超时
            });

            // 4. 执行物理截图
            await page.screenshot({
                path: filePath,
                fullPage: options.fullPage ?? true // 比对业务通常需要全长图以发现布局偏差
            });

            console.log(`[Puppeteer] 截图成功并存放到: ${filePath}`);

            return {
                path: filePath,
                url: screenshotUrl
            };
        } catch (error: any) {
            console.error('[Puppeteer] 抓取流程发生致命异常:', error.message);
            throw new Error(`页面抓取失败: ${error.message}`);
        } finally {
            // 5. 无论成功与否，必须完全关闭浏览器，防止僵尸进程占用 CPU 资源
            await browser.close();
        }
    }
}
