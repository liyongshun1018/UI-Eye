/**
 * 批量截图演示脚本
 * 演示如何使用 PlaywrightAuthService 和 BatchScreenshotService
 */

import PlaywrightAuthService from '../services/PlaywrightAuthService.js';
import BatchScreenshotService from '../services/BatchScreenshotService.js';

async function demo() {
    const authService = new PlaywrightAuthService();
    const batchService = new BatchScreenshotService(authService);

    console.log('\n🚀 批量登录截图演示\n');

    // 示例 1：无需登录的批量截图
    console.log('=== 示例 1：批量截图（无登录）===\n');

    const publicUrls = [
        'https://www.baidu.com',
        'https://www.taobao.com',
        'https://www.jd.com'
    ];

    const result = await batchService.batchScreenshot(publicUrls, null, {
        headless: true,
        fullPage: true,
        viewport: { width: 375, height: 667 },
        waitUntil: 'networkidle'
    });

    console.log('执行结果:', JSON.stringify(result, null, 2));

    console.log('\n✨ 演示完成！\n');
}

// 运行演示
demo().catch(error => {
    console.error('\n❌ 演示失败:', error);
    process.exit(1);
});
