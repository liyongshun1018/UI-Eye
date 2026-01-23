import AppError from './AppError.js';

/**
 * 全局错误处理中间件
 * 特性：核心异常出口，确保所有 Controller 抛出的错误都能以统一的 JSON 格式返回给前端。
 * 遵循 Express 错误处理中间件规范 (err, req, res, next)
 */
const globalErrorHandler = (err, req, res, next) => {
    // 默认状态码为 500 (服务器内部错误)
    err.statusCode = err.statusCode || 500;
    // 默认状态标识
    err.status = err.status || 'error';

    // 开发环境增强：记录详细的服务器端日志，包含方法、路径及完整堆栈
    if (process.env.NODE_ENV !== 'production') {
        console.error(`[全局异常捕捉] ${req.method} ${req.url}:`, {
            message: err.message,
            stack: err.stack,
            statusCode: err.statusCode
        });
    }

    // 核心：返回标准化的 API 响应结构
    res.status(err.statusCode).json({
        success: false,
        status: err.status,
        message: err.message || '服务器内部错误',

        /**
         * 调试信息控制逻辑：
         * 1. 非生产环境 (Development)
         * 2. 且该错误不是预期的业务错误 (isOperational 为假，意味着是代码崩溃或未捕获异常)
         * 则返回 stack 堆栈信息，帮助开发者快速定位代码行数
         */
        ...(process.env.NODE_ENV !== 'production' && !err.isOperational ? { stack: err.stack } : {})
    });
};

/**
 * 高阶函数辅助器：catchAsync
 * 目的：消除 Controller 中重复的 try-catch 样板代码
 * 逻辑：接收一个异步函数，执行并 catch 其 Promise 错误，自动调用 next(err) 进入全局中间件
 * @param {Function} fn - 需要包装的异步 Controller 函数
 */
export const catchAsync = (fn) => {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
};

export default globalErrorHandler;
