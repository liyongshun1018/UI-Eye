/**
 * AppError - 应用自定义异常基类
 * 
 * 设计意图：
 * 专门用于区分“可预期的业务逻辑错误”（如参数验证失败、未找到报告）
 * 与“不可预期的系统崩溃”（如数据库连接断开、内存溢出）。
 * 
 * 只有具备 isOperational 属性的错误才会被全局中间件安全地暴露给前端。
 */
class AppError extends Error {
    /**
     * @param {string} message - 给人看的错误提示文案
     * @param {number} statusCode - HTTP 标准状态码
     */
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        // 根据状态码自动判定 status 标识 (4xx 为失败，5xx 为系统错误)
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        // 关键标志：标记为已感知的业务操作异常
        this.isOperational = true;

        // 捕捉堆栈轨迹，方便在开发环境下定位抛出错误的精确行号
        Error.captureStackTrace(this, this.constructor);
    }
}

export default AppError;
