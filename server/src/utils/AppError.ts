/**
 * AppError - 业务逻辑异常基类
 * 职责：专门用于捕获“可预期”的业务错误（如：图片格式不对、报告不存在、AI 密钥失效）
 * 优势：通过标记 isOperational，我们可以放心地将该错误的 message 返回给前端，而不用担心暴露后端系统隐私
 */
class AppError extends Error {
    public statusCode: number;     // HTTP 状态码
    public status: string;         // 错误标识 (fail | error)
    public isOperational: boolean; // 是否为可预测的业务异常

    /**
     * @param message 给人看的错误提示文案 (中文)
     * @param statusCode 对应的 HTTP 状态码 (如 400, 404, 500)
     */
    constructor(message: string, statusCode: number = 500) {
        super(message);
        this.statusCode = statusCode;
        // 自动判定标识：4xx 系列为业务失败 (fail)，5xx 及以上为系统错误 (error)
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;

        // 捕捉堆栈轨迹，方便开发者在本地调试时定位抛出位置
        Error.captureStackTrace(this, this.constructor);
    }
}

export default AppError;
