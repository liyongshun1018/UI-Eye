import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import scriptExecutor from './ScriptExecutor.js';
import { DIRS, getPublicUrl } from '../utils/PathUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 批量截图服务 (Puppeteer 版)
 * 支持批量执行截图任务，可选使用登录状态
 */
class BatchScreenshotService {
    constructor(authService) {
        this.authService = authService;
        this.screenshotsDir = DIRS.BATCH_SCREENSHOTS;
    }

    /**
     * 批量截图
     * @param {Array<string>} urls - URL 列表
     * @param {string|null} domain - 域名（用于加载登录状态，可选）
     * @param {Object} options - 截图选项
     * @returns {Promise<Object>} 执行结果统计
     */
    async batchScreenshot(urls, domain = null, options = {}) {
        const startTime = Date.now();
        const results = [];

        console.log(`\n${'='.repeat(60)}`);
        console.log(`📸 [Puppeteer] 批量截图任务开始`);
        console.log(`${'='.repeat(60)}`);
        console.log(`URL 数量: ${urls.length}`);
        console.log(`登录状态: ${domain || '无'}`);
        console.log(`截图模式: ${options.fullPage !== false ? '全页' : '可视区域'}`);
        console.log(`${'='.repeat(60)}\n`);

        // 启动浏览器
        const browser = await puppeteer.launch({
            headless: options.headless !== false ? 'new' : false,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        });

        try {
            // 确保截图目录存在
            await fs.mkdir(this.screenshotsDir, { recursive: true });

            // 批量截图
            for (let i = 0; i < urls.length; i++) {
                const url = urls[i];
                const page = await browser.newPage();

                try {
                    const pageStartTime = Date.now();
                    console.log(`[${i + 1}/${urls.length}] 正在截图: ${url}`);

                    // 设置视口
                    const vWidth = options.viewportWidth || 375;
                    const vHeight = options.viewportHeight || 667;
                    const dsf = options.deviceScaleFactor || 1;

                    await page.setViewport({
                        width: vWidth,
                        height: vHeight,
                        deviceScaleFactor: dsf
                    });

                    // 模拟 User-Agent
                    await page.setUserAgent(options.userAgent || 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1');

                    // 应用登录状态
                    if (domain && this.authService) {
                        await this.authService.applyAuthState(page, domain);
                    }

                    // 访问页面
                    await page.goto(url, {
                        waitUntil: options.waitUntil || 'networkidle2', // Puppeteer 使用 networkidle2
                        timeout: options.timeout || 30000
                    });

                    // 如果提供了操作脚本，则执行
                    if (options.scriptCode) {
                        const scriptResult = await scriptExecutor.execute(page, options.scriptCode);
                        if (!scriptResult.success) {
                            console.warn(`  ⚠️  脚本执行告警: ${scriptResult.error}`);
                        }
                    }

                    // 等待额外时间（可选）
                    if (options.waitAfterLoad) {
                        await new Promise(resolve => setTimeout(resolve, options.waitAfterLoad));
                    }

                    // 截图
                    const filename = this.generateFilename(url, i);
                    const screenshotPath = path.join(this.screenshotsDir, filename);

                    await page.screenshot({
                        path: screenshotPath,
                        fullPage: options.fullPage !== false
                    });

                    const pageDuration = ((Date.now() - pageStartTime) / 1000).toFixed(2);

                    results.push({
                        url,
                        success: true,
                        path: screenshotPath,
                        filename,
                        url_path: getPublicUrl('BATCH_SCREENSHOTS', filename),
                        duration: parseFloat(pageDuration)
                    });

                    console.log(`  ✅ 成功 (${pageDuration}s): ${filename}\n`);
                } catch (error) {
                    console.error(`  ❌ 失败: ${error.message}\n`);
                    results.push({
                        url,
                        success: false,
                        error: error.message
                    });
                } finally {
                    await page.close();

                    // 调用进度回调
                    if (options.onProgress) {
                        const lastResult = results[results.length - 1];
                        options.onProgress(results.length, urls.length, url, lastResult);
                    }
                }
            }

            const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
            const successCount = results.filter(r => r.success).length;
            const failedCount = urls.length - successCount;

            // 输出统计信息
            console.log(`${'='.repeat(60)}`);
            console.log(`📊 [Puppeteer] 批量截图完成！`);
            console.log(`${'='.repeat(60)}`);
            console.log(`总数: ${urls.length}`);
            console.log(`成功: ${successCount}`);
            console.log(`失败: ${failedCount}`);
            console.log(`总耗时: ${totalDuration}s`);
            console.log(`${'='.repeat(60)}\n`);

            return {
                total: urls.length,
                success: successCount,
                failed: failedCount,
                duration: parseFloat(totalDuration),
                avgDuration: parseFloat((totalDuration / urls.length).toFixed(2)),
                screenshotsDir: this.screenshotsDir,
                results
            };
        } finally {
            await browser.close();
        }
    }

    /**
     * 生成截图文件名
     * 修复：移除路径中的点号,避免 .html 等扩展名导致静态资源服务器解析错误
     */
    generateFilename(url, index) {
        try {
            const urlObj = new URL(url);
            // 将路径中的斜杠和点号都替换为下划线,避免文件名中包含 .html 等扩展名
            const pathname = urlObj.pathname.replace(/[\/\.]/g, '_') || '_home';
            const timestamp = Date.now();
            return `${String(index + 1).padStart(2, '0')}_${urlObj.hostname}${pathname}_${timestamp}.png`;
        } catch {
            return `${String(index + 1).padStart(2, '0')}_invalid_url_${Date.now()}.png`;
        }
    }
}

export default BatchScreenshotService;
