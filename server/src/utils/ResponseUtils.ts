import { Response } from 'express';

/**
 * ResponseUtils - 标准响应封装工具类
 * 职责：统一后端 API 的返回数据结构，确保不论成功或失败，前端均能以一致的逻辑处理响应
 */
class ResponseUtils {
    /**
     * 成功响应用例
     * @param res Express 响应对象
     * @param data 负载数据 (Object | Array | null)
     * @param message 友好提示文案
     * @param status HTTP 状态码 (默认 200)
     */
    static success(res: Response, data: any = null, message: string = '操作成功', status: number = 200) {
        return res.status(status).json({
            success: true,
            message,
            data
        });
    }

    /**
     * 错误响应用例
     * @param res Express 响应对象
     * @param message 错误简述
     * @param status HTTP 状态码 (默认 500)
     * @param details 详细的错误堆栈或 Zod 校验明细 (可选)
     */
    static error(res: Response, message: string = '服务器内部繁忙', status: number = 500, details: any = null) {
        const response: any = {
            success: false,
            message
        };
        if (details) {
            response.details = details;
        }
        return res.status(status).json(response);
    }
}

export default ResponseUtils;
