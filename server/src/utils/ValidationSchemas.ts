import { z, ZodError, ZodIssue } from 'zod';
import { Request, Response, NextFunction } from 'express';

/**
 * CompareSchema - 视觉比对请求校验规则
 * 职责：强制要求前端传入有效的 URL 和设计稿标识，并对可选参数进行类型约束
 */
export const compareSchema = z.object({
    url: z.string().url('目标地址必须是合法的 URL 格式'),
    designSource: z.string().min(1, '设计稿来源路径不能为空'),
    options: z.object({
        tolerance: z.number().optional().default(0.1),
        viewport: z.object({
            width: z.number(),
            height: z.number()
        }).optional()
    }).optional()
});

/**
 * ExtensionExportSchema - 插件报告导出请求校验规则
 */
export const extensionExportSchema = z.object({
    url: z.string().url(),
    designSource: z.string(),
    actualScreenshot: z.string(),
    diffImage: z.string(),
    similarity: z.number(),
    diffRegions: z.array(z.any()),
    fixes: z.array(z.any()),
    aiModel: z.string().optional()
});

/**
 * validate - 校验中间件工厂函数
 * 职责：作为 Express 中间件，拦截不符合 Schema 的请求并返回标准化错误
 */
export const validate = (schema: z.ZodSchema) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            // 执行异步解析，若校验通过，req.body 会被回填为转换后的干净数据
            req.body = await schema.parseAsync(req.body);
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                // 将 Zod 内部的 issues 列表映射为友好的中文错误反馈
                return res.status(400).json({
                    success: false,
                    message: '请求参数格式校验失败',
                    errors: error.issues.map((e: ZodIssue) => ({
                        path: e.path.join('.'),
                        message: e.message
                    }))
                });
            }
            next(error);
        }
    };
};
