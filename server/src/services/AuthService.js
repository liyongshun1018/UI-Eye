import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * AuthService - 登录状态管理服务 (Puppeteer 版)
 * 用于保存、加载和管理浏览器登录状态
 */
class AuthService {
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
        const browser = await puppeteer.launch({
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

        try {
            console.log(`🔐 [AuthService] 开始登录 ${domain}...`);

            // 执行登录操作
            await loginFn(page);

            // 等待登录完成，让 Cookie 写入
            await new Promise(resolve => setTimeout(resolve, 2000));

            // 获取 Cookies
            const cookies = await page.cookies();

            // 获取 LocalStorage (可选，部分网站需要)
            const localStorage = await page.evaluate(() => JSON.stringify(window.localStorage));

            // 确保目录存在
            await fs.mkdir(this.authStatesDir, { recursive: true });

            // 保存登录状态
            const authStatePath = path.join(this.authStatesDir, `${domain}.json`);
            const authState = {
                cookies,
                localStorage: JSON.parse(localStorage)
            };

            await fs.writeFile(authStatePath, JSON.stringify(authState, null, 2));

            console.log(`✅ [AuthService] 登录状态已保存: ${authStatePath}`);
            return authStatePath;
        } catch (error) {
            console.error(`❌ [AuthService] 保存登录状态失败: ${error.message}`);
            throw error;
        } finally {
            await browser.close();
        }
    }

    /**
     * 将保存的状态应用到 Puppeteer 页面
     * @param {Page} page - Puppeteer 页面对象
     * @param {string} domain - 域名
     */
    async applyAuthState(page, domain) {
        const authStatePath = path.join(this.authStatesDir, `${domain}.json`);

        try {
            const data = await fs.readFile(authStatePath, 'utf-8');
            const { cookies, localStorage } = JSON.parse(data);

            // 注入 Cookies
            await page.setCookie(...cookies);

            // 注入 LocalStorage
            if (localStorage) {
                await page.evaluateOnNewDocument((storage) => {
                    for (const [key, value] of Object.entries(storage)) {
                        window.localStorage.setItem(key, value);
                    }
                }, localStorage);
            }

            console.log(`🔑 [AuthService] 已成功应用 ${domain} 的登录状态`);
        } catch (error) {
            console.warn(`⚠️ [AuthService] 无法应用 ${domain} 的登录状态: ${error.message}`);
            // 状态不存在不抛出错误，可能只是不需要登录
        }
    }

    /**
     * 加载登录状态路径 (兼容旧接口)
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
     */
    async deleteAuthState(domain) {
        const authStatePath = path.join(this.authStatesDir, `${domain}.json`);
        try {
            await fs.unlink(authStatePath);
            console.log(`🗑️ [AuthService] 已删除登录状态: ${domain}`);
        } catch (error) {
            console.error(`❌ [AuthService] 删除登录状态失败: ${error.message}`);
            throw error;
        }
    }

    /**
     * 列出所有已保存的登录状态
     */
    async listAuthStates() {
        try {
            await fs.mkdir(this.authStatesDir, { recursive: true });
            const files = await fs.readdir(this.authStatesDir);
            return files
                .filter(f => f.endsWith('.json'))
                .map(f => f.replace('.json', ''));
        } catch {
            return [];
        }
    }
}

export default AuthService;
