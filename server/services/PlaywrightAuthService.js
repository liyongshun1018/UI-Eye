import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Playwright 登录状态管理服务
 * 用于保存、加载和管理浏览器登录状态
 */
class PlaywrightAuthService {
    constructor() {
        this.authStatesDir = path.join(__dirname, '../auth-states');
    }

    /**
     * 保存登录状态
     * @param {string} domain - 域名（如 example.com）
     * @param {Function} loginFn - 登录函数，接收 page 参数
     * @returns {Promise<string>} 保存的文件路径
     */
    async saveAuthState(domain, loginFn) {
        const browser = await chromium.launch({ headless: false });
        const context = await browser.newContext();
        const page = await context.newPage();

        try {
            console.log(`🔐 开始登录 ${domain}...`);

            // 执行登录操作
            await loginFn(page);

            // 等待登录完成
            await page.waitForTimeout(2000);

            // 确保目录存在
            await fs.mkdir(this.authStatesDir, { recursive: true });

            // 保存登录状态
            const authStatePath = path.join(this.authStatesDir, `${domain}.json`);
            await context.storageState({ path: authStatePath });

            console.log(`✅ 登录状态已保存: ${authStatePath}`);
            return authStatePath;
        } catch (error) {
            console.error(`❌ 保存登录状态失败: ${error.message}`);
            throw error;
        } finally {
            await browser.close();
        }
    }

    /**
     * 加载登录状态
     * @param {string} domain - 域名
     * @returns {Promise<string>} 登录状态文件路径
     */
    async loadAuthState(domain) {
        const authStatePath = path.join(this.authStatesDir, `${domain}.json`);

        try {
            await fs.access(authStatePath);
            return authStatePath;
        } catch {
            throw new Error(`未找到 ${domain} 的登录状态，请先保存`);
        }
    }

    /**
     * 删除登录状态
     * @param {string} domain - 域名
     */
    async deleteAuthState(domain) {
        const authStatePath = path.join(this.authStatesDir, `${domain}.json`);

        try {
            await fs.unlink(authStatePath);
            console.log(`🗑️  已删除登录状态: ${domain}`);
        } catch (error) {
            console.error(`删除登录状态失败: ${error.message}`);
            throw error;
        }
    }

    /**
     * 列出所有已保存的登录状态
     * @returns {Promise<Array<string>>} 域名列表
     */
    async listAuthStates() {
        try {
            const files = await fs.readdir(this.authStatesDir);
            return files
                .filter(f => f.endsWith('.json'))
                .map(f => f.replace('.json', ''));
        } catch {
            return [];
        }
    }
}

export default PlaywrightAuthService;
