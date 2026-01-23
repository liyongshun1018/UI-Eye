import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * AuthService - 账户登录态持久化服务
 * 
 * 核心设计目标：
 * 解决 Puppeteer 在无头模式下由于浏览器上下文重置导致的“登录失效”问题。
 * 通过捕获特定域名的 Cookie 与 LocalStorage 快照，并在新页面启动前进行“协议注入”，
 * 从而绕过重复登录验证。
 */
class AuthService {
    /**
     * 服务初始化：定义状态存储集群路径
     */
    constructor() {
        // 固定存储在 data/auth-states 目录下，按域名 .json 命名
        this.authStatesDir = path.join(__dirname, '../auth-states');
    }

    /**
     * 第一阶段：登录快照采集
     * 逻辑：启动可视化浏览器 -> 引导用户登录 -> 提取 Cookie/LocalStorage 三元组 -> 结构化持久化
     * 
     * @param {string} domain - 域名标识（如 'example.com'）
     * @param {Function} loginFn - 自动化登录脚本回调
     * @returns {Promise<string>} 物理快照路径
     */
    async saveAuthState(domain, loginFn) {
        // 采集阶段强制 headless: false 以便在必要时进行人工打码或验证码处理
        const browser = await puppeteer.launch({
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

        try {
            console.log(`🔐 [鉴权服务] 正在开启授权窗口: ${domain}...`);

            // 执行外部注入的登录流水线（点击、输入、提交）
            await loginFn(page);

            // 策略延迟：等待异步请求完成且服务端 Cookie 响应写回浏览器堆栈
            await new Promise(resolve => setTimeout(resolve, 2000));

            // 1. 提取标准化 Cookie 数组（用于会话凭证）
            const cookies = await page.cookies();

            // 2. 提取本地存储快照（用于部分基于 JWT 或 Token 的前端持久化方案）
            const localStorage = await page.evaluate(() => JSON.stringify(window.localStorage));

            // 3. 结果归档
            await fs.mkdir(this.authStatesDir, { recursive: true });
            const authStatePath = path.join(this.authStatesDir, `${domain}.json`);
            const authState = {
                cookies,
                localStorage: JSON.parse(localStorage)
            };

            await fs.writeFile(authStatePath, JSON.stringify(authState, null, 2));

            console.log(`✅ [鉴权服务] 登录序列快照已封存: ${authStatePath}`);
            return authStatePath;
        } catch (error) {
            console.error(`❌ [鉴权服务] 采集流程中断: ${error.message}`);
            throw error;
        } finally {
            await browser.close();
        }
    }

    /**
     * 第二阶段：状态反序列化注入
     * 逻辑：在浏览器导航至目标 URL 前，预先装载预设的 Cookie 与 LocalStorage，实现“免登”效果。
     * 
     * @param {Page} page - Puppeteer 活跃页面实例
     * @param {string} domain - 匹配的域名快照
     */
    async applyAuthState(page, domain) {
        const authStatePath = path.join(this.authStatesDir, `${domain}.json`);

        try {
            const data = await fs.readFile(authStatePath, 'utf-8');
            const { cookies, localStorage } = JSON.parse(data);

            // 高优先级注入：将 Cookie 写入网络战
            await page.setCookie(...cookies);

            // 生命周期挂钩：利用 evaluateOnNewDocument 在 DOM 加载前预置缓存数据，防止前端代码检查不到 Token
            if (localStorage) {
                await page.evaluateOnNewDocument((storage) => {
                    for (const [key, value] of Object.entries(storage)) {
                        window.localStorage.setItem(key, value);
                    }
                }, localStorage);
            }

            console.log(`🔑 [鉴权服务] ${domain} 身份令牌已载入，预对齐完成`);
        } catch (error) {
            console.warn(`⚠️ [鉴权服务] 跳过身份注入 (未发现有效快照): ${error.message}`);
        }
    }

    /**
     * 联通性检查：验证特定域名的凭证是否存在
     */
    async loadAuthState(domain) {
        const authStatePath = path.join(this.authStatesDir, `${domain}.json`);
        try {
            await fs.access(authStatePath);
            return authStatePath;
        } catch {
            throw new Error(`未找到 ${domain} 的凭据，请先执行登录采集程序`);
        }
    }

    /**
     * 凭据清理
     */
    async deleteAuthState(domain) {
        const authStatePath = path.join(this.authStatesDir, `${domain}.json`);
        try {
            await fs.unlink(authStatePath);
            console.log(`🗑️ [鉴权服务] 已注销域 ${domain} 的本地缓存`);
        } catch (error) {
            console.error(`❌ [鉴权服务] 清理失败: ${error.message}`);
            throw error;
        }
    }

    /**
     * 快照列表检索
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
