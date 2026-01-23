import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import puppeteer from 'puppeteer'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '../../')

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m'
}

/**
 * Doctor 诊断报告生成器
 */
async function runDoctor() {
    console.log(`\n${colors.bright}${colors.cyan}🏥 UI-Eye 系统健康诊断中 (Doctor Mode)${colors.reset}\n`)

    let criticalCount = 0
    let warningCount = 0

    // 1. Node.js 版本校验
    const nodeVersion = process.versions.node
    const majorVersion = parseInt(nodeVersion.split('.')[0])
    if (majorVersion < 18) {
        report('CRITICAL', 'Node.js 版本', `当前 v${nodeVersion}`, '需要 v18.0.0 或更高版本。请前往 nodejs.org 升级')
        criticalCount++
    } else {
        report('PASS', 'Node.js 版本', `v${nodeVersion}`)
    }

    // 2. 核心配置文件 .env 校验
    const envPath = path.join(rootDir, '.env')
    const serverEnvPath = path.join(rootDir, 'server/.env')
    if (!fs.existsSync(envPath) && !fs.existsSync(serverEnvPath)) {
        report('WARNING', '配置文件', '.env 未找到', 'AI 对称功能可能失效。请从 .env.example 复制并配置。')
        warningCount++
    } else {
        report('PASS', '配置文件', '.env 已就绪')
    }

    // 3. 存储集群目录校验 (权限与完整性)
    const dataDirs = [
        'server/data/uploads',
        'server/data/reports',
        'server/db'
    ]
    for (const d of dataDirs) {
        const fullPath = path.join(rootDir, d)
        try {
            if (!fs.existsSync(fullPath)) {
                fs.mkdirSync(fullPath, { recursive: true })
                report('FIXED', '目录结构', `已自动创建 ${d}`)
            } else {
                fs.accessSync(fullPath, fs.constants.W_OK)
                report('PASS', '目录权限', `${d} 可写`)
            }
        } catch (e) {
            report('CRITICAL', '目录权限', `${d} 无写入权限`, '请尝试 chmod -R 777 server/data')
            criticalCount++
        }
    }

    // 4. 浏览器内核检测 (重头戏)
    console.log(`${colors.yellow}🔍 正在探测浏览器内核联通性 (可能需要 2-5s)...${colors.reset}`)
    try {
        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox']
        })
        const version = await browser.version()
        await browser.close()
        report('PASS', '浏览器内核', `Chromium 已就绪 (${version})`)
    } catch (e) {
        report('CRITICAL', '浏览器内核', '无法启动或未找到 Chromium', '执行: npx puppeteer browsers install')
        criticalCount++
    }

    // 5. 端口热度检测 (3000 & 5173)
    const ports = [3000, 5173]
    for (const port of ports) {
        try {
            // 使用 lsof 简易判定命令
            const out = execSync(`lsof -i :${port}`).toString()
            if (out.length > 0) {
                report('WARNING', '端口独占', `${port} 端口已被占用`, '建议执行: npm run dev:all 之前先清空占用进程')
                warningCount++
            }
        } catch (e) {
            // 命令执行报错通常意味着端口未被占用 (lsof 返回非0)
            report('PASS', '端口状态', `${port} 端口空闲`)
        }
    }

    // 总结报告
    console.log(`\n${colors.bright}----------------------------------------${colors.reset}`)
    if (criticalCount === 0) {
        console.log(`${colors.green}✅ 诊断通过！你的电脑环境可以顺畅运行 UI-Eye。${colors.reset}`)
        if (warningCount > 0) {
            console.log(`${colors.yellow}💡 注意：仍有 ${warningCount} 个非致命建议，请视情况处理。${colors.reset}`)
        }
    } else {
        console.log(`${colors.red}❌ 诊断失败！检测到 ${criticalCount} 个足以中断运行的致命问题。${colors.reset}`)
        console.log(`${colors.yellow}👉 请根据上方 [修复建议] 进行操作后重新运行。${colors.reset}`)
    }
    console.log(`${colors.bright}----------------------------------------\n${colors.reset}`)
}

function report(status, label, detail, hint = '') {
    const statusMap = {
        'PASS': `${colors.green}[通过]${colors.reset}`,
        'CRITICAL': `${colors.red}[致命]${colors.reset}`,
        'WARNING': `${colors.yellow}[警告]${colors.reset}`,
        'FIXED': `${colors.cyan}[已修复]${colors.reset}`
    }

    console.log(`${statusMap[status]} ${colors.bright}${label.padEnd(12)}${colors.reset} : ${detail}`)
    if (hint) {
        console.log(`       ${colors.yellow}↳ 修复建议: ${hint}${colors.reset}`)
    }
}

runDoctor().catch(e => {
    console.error(`\n${colors.red} Doctor 自身发生崩溃: ${e.message}${colors.reset}`)
})
