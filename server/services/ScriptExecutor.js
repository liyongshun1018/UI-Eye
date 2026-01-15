import vm from 'vm';

/**
 * 脚本执行器
 * 负责在沙盒中安全地执行 Playwright 交互脚本
 */
class ScriptExecutor {
    /**
     * 执行脚本
     * @param {Object} page - Playwright page 对象
     * @param {string} code - 脚本代码
     * @param {Object} context - 额外的上下文数据
     */
    async execute(page, code, context = {}) {
        console.log('🚀 开始执行交互脚本...');

        // 创建沙盒上下文
        // 我们只暴露必要的对象和方法，确保安全性
        const sandbox = {
            page,
            context,
            console,
            delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
            // 可以根据需要暴露更多常用的辅助函数
        };

        try {
            // 使用 vm 模块创建一个受限的环境执行代码
            // 注意：由于我们需要执行异步代码（await page.click...），
            // 我们需要将代码封装在一个异步函数中执行。

            const wrappedCode = `
                (async () => {
                    try {
                        ${code}
                    } catch (err) {
                        throw err;
                    }
                })()
            `;

            const script = new vm.Script(wrappedCode);
            const contextProxy = vm.createContext(sandbox);

            // 执行异步脚本并等待完成
            await script.runInContext(contextProxy, {
                timeout: 30000, // 每个脚本最长执行 30 秒
            });

            console.log('✅ 脚本执行完成');
            return { success: true };
        } catch (error) {
            console.error('❌ 脚本执行失败:', error.message);
            return {
                success: false,
                error: error.message,
                stack: error.stack
            };
        }
    }
}

export default new ScriptExecutor();
