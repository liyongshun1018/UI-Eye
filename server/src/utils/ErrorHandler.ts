import { Request, Response, NextFunction } from 'express';
import AppError from './AppError.js';

/**
 * 全局错误处理中间件
 * 职责：作为 Express 最后一道防线，统筹格式化所有异常输出
 */
const globalErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    // 设置默认状态码与标识
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    // 开发环境记录详细堆栈
    if (process.env.NODE_ENV !== 'production') {
        console.error(`[🔥 全局异常捕捉] ${req.method} ${req.url}:`, {
            message: err.message,
            stack: err.stack,
            statusCode: err.statusCode
        });
    }

    // 格式化输出给前端
    res.status(err.statusCode).json({
        success: false,                // 统一标记为失败
        status: err.status,            // 错误等级 (fail/error)
        message: err.message || '服务器内部繁忙，请稍后重试',
        // 生产环境下隐藏堆栈，避免源码泄露
        ...(process.env.NODE_ENV !== 'production' && !err.isOperational ? { stack: err.stack } : {})
    });
};

/**
 * catchAsync - 异步函数捕获装饰器
 * 职责：消除 Controller/Route 层的 promise.catch 嵌套，自动将异常传导给全局中间件
 */
export const catchAsync = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        fn(req, res, next).catch(next);
    };
};

export default globalErrorHandler;
