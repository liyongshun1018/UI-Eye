import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 批量截图服务
 * 支持批量执行截图任务，可选使用登录状态
 */
class BatchScreenshotService {
    constructor(authService) {
        this.authService = authService;
        this.screenshotsDir = path.join(__dirname, '../screenshots/batch');
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
        console.log(`📸 批量截图任务开始`);
        console.log(`${'='.repeat(60)}`);
        console.log(`URL 数量: ${urls.length}`);
        console.log(`登录状态: ${domain || '无'}`);
        console.log(`截图模式: ${options.fullPage !== false ? '全页' : '可视区域'}`);
        console.log(`${'='.repeat(60)}\n`);

        // 启动浏览器
        const browser = await chromium.launch({
            headless: options.headless !== false
        });

        try {
            // 创建浏览器上下文
            let context;
            if (domain) {
                const authStatePath = await this.authService.loadAuthState(domain);
                context = await browser.newContext({
                    storageState: authStatePath,
                    viewport: options.viewport || { width: 375, height: 667 },
                    userAgent: options.userAgent || 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15'
                });
                console.log(`🔐 已加载 ${domain} 的登录状态\n`);
            } else {
                context = await browser.newContext({
                    viewport: options.viewport || { width: 375, height: 667 },
                    userAgent: options.userAgent || 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15'
                });
            }

            // 确保截图目录存在
            await fs.mkdir(this.screenshotsDir, { recursive: true });

            // 批量截图
            for (let i = 0; i < urls.length; i++) {
                const url = urls[i];
                const page = await context.newPage();

                try {
                    const pageStartTime = Date.now();
                    console.log(`[${i + 1}/${urls.length}] 正在截图: ${url}`);

                    // 访问页面
                    await page.goto(url, {
                        waitUntil: options.waitUntil || 'networkidle',
                        timeout: options.timeout || 30000
                    });

                    // 等待额外时间（可选）
                    if (options.waitAfterLoad) {
                        await page.waitForTimeout(options.waitAfterLoad);
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
                }
            }

            const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
            const successCount = results.filter(r => r.success).length;
            const failedCount = urls.length - successCount;

            // 输出统计信息
            console.log(`${'='.repeat(60)}`);
            console.log(`📊 批量截图完成！`);
            console.log(`${'='.repeat(60)}`);
            console.log(`总数: ${urls.length}`);
            console.log(`成功: ${successCount} (${(successCount / urls.length * 100).toFixed(1)}%)`);
            console.log(`失败: ${failedCount}`);
            console.log(`总耗时: ${totalDuration}s`);
            console.log(`平均耗时: ${(totalDuration / urls.length).toFixed(2)}s/页`);
            console.log(`截图目录: ${this.screenshotsDir}`);
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
     * @param {string} url - URL
     * @param {number} index - 索引
     * @returns {string} 文件名
     */
    generateFilename(url, index) {
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname.replace(/\//g, '_') || '_home';
            const timestamp = Date.now();
            return `${String(index + 1).padStart(2, '0')}_${urlObj.hostname}${pathname}_${timestamp}.png`;
        } catch {
            return `${String(index + 1).padStart(2, '0')}_invalid_url_${Date.now()}.png`;
        }
    }
}

export default BatchScreenshotService;
