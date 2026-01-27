import { chromium, Browser, Page } from 'playwright';
import path from 'path';
import { DIRS } from '../../utils/PathUtils.js';

/**
 * PlaywrightCaptureAdapter - 网页快照抓取适配器 (Playwright 版)
 * 职责：负责将动态的 HTML/CSS 页面转换为物理的 PNG 图片。
 * 特色：支持在截图前注入并执行自定义的 Playwright 脚本（如自动登录、清除弹窗等）。
 */
export class PlaywrightCaptureAdapter {
    /**
     * 核心方法：执行截图抓取
     * @param url 目标网页地址
     * @param options 截图选项 (宽度、是否全屏、交互脚本代码)
     * @returns 抓取结果 (物理路径与可访问 URL)
     */
    async capture(url: string, options: { width?: number; fullPage?: boolean; scriptCode?: string } = {}) {
        // 定义截图保存的物理路径
        const filename = `capture-${Date.now()}.png`;
        const filePath = path.join(DIRS.UPLOADS, filename);
        const screenshotUrl = `/uploads/${filename}`;

        console.log(`[Playwright] 正在启动浏览器以抓取: ${url}`);

        // 1. 启动并初始化浏览器上下文
        const browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        try {
            const context = await browser.newContext({
                viewport: {
                    width: options.width || 1920,
                    height: 1080
                },
                deviceScaleFactor: 1
            });

            const page = await context.newPage();

            // 2. 导航至目标地址
            console.log(`[Playwright] 正在导航至: ${url}`);
            await page.goto(url, {
                waitUntil: 'networkidle',
                timeout: 60000
            });

            // 3. 执行交互脚本 (如果存在)
            if (options.scriptCode) {
                console.log('[Playwright] 正在执行交互前置脚本...');
                try {
                    // 脚本上下文中注入 page 对象，方便用户调用 Playwright API
                    // 注意：这里由于是动态代码执行，使用简单的 eval 或类似机制
                    // 在生产环境下，建议对脚本内容进行严格的安全审查
                    const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;
                    const executeScript = new AsyncFunction('page', options.scriptCode);
                    await executeScript(page);
                    console.log('[Playwright] 交互脚本执行成功');
                } catch (scriptError: any) {
                    console.error('[Playwright] 交互脚本执行失败:', scriptError.message);
                    // 脚本执行失败不一定导致整个截图失败，通常记录日志并继续
                }
            }

            // 4. 执行物理截图
            await page.screenshot({
                path: filePath,
                fullPage: options.fullPage ?? true
            });

            console.log(`[Playwright] 截图成功并存放到: ${filePath}`);

            return {
                path: filePath,
                url: screenshotUrl
            };
        } catch (error: any) {
            console.error('[Playwright] 抓取流程发生致命异常:', error.message);
            throw new Error(`页面抓取失败: ${error.message}`);
        } finally {
            // 5. 关闭浏览器
            await browser.close();
        }
    }
}
