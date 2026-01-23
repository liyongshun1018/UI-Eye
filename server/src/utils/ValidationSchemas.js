import { z } from 'zod';

/**
 * 核心对比任务校验模型 (对应 /api/compare 接口)
 * 采用 Schema-based 验证，确保输入数据结构的合法性
 */
export const compareSchema = z.object({
    // 待测页面的目标 URL
    url: z.string({ required_error: 'URL 是必填项' }),
    // 设计稿来源标识（通常是 uploads 目录下的文件名）
    designSource: z.string({ required_error: '设计稿来源是必填项' }),
    // 任务备注描述（可选）
    description: z.any().optional(),
    // 视口宽度配置（如 1920）
    viewportWidth: z.any().optional(),
    // 视口高度配置（如 1080）
    viewportHeight: z.any().optional(),
    // 像素匹配阈值 (0-1)
    threshold: z.any().optional(),
    // 是否开启差异聚类分析
    enableClustering: z.any().optional(),
}).passthrough(); // 特性：允许额外字段透传，确保对未来扩展或非标准请求的兼容性

/**
 * 浏览器插件导出校验模型 (对应 /api/extension/export 接口)
 * 专门用于接收插件端捕获的 Base64 原始数据
 */
export const extensionExportSchema = z.object({
    // 实测网页的 Base64 编码图
    actualImage: z.string({ required_error: '缺少实测图数据' }),
    // 比对基准设计稿的 Base64 编码图
    designImage: z.string({ required_error: '缺少设计稿数据' }),
    // AI 诊断的 Markdown 文本结论
    diagnosis: z.any().optional(),
    // 原始采集的元素 CSS 样式快照
    styles: z.any().optional(),
    // 元素元信息（TagName, URL, XPath 等）
    elementInfo: z.any().optional(),
}).passthrough(); // 允许扩展字段，方便记录更多的环境埋点数据

/**
 * 高阶函数：生成 Express 校验中间件
 * 业务逻辑：在进入 Controller 之前拦截请求，执行强类型校验与数据清洗
 * @param {z.ZodSchema} schema - 待绑定的校验模型
 */
export const validate = (schema) => (req, res, next) => {
    try {
        // 执行解析，若失败会直接抛出 ZodError
        const validatedData = schema.parse(req.body);

        // 将经过清洗（Stripped 或 Passthrough）后的数据重新赋值给 body，供后续业务消费
        req.body = validatedData;
        next();
    } catch (error) {
        // 处理 Zod 专属错误格式
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                message: '输入参数验证失败',
                // 将深层嵌套的 path 扁平化展示给前端
                errors: error.errors.map(e => ({
                    path: e.path.join('.'),
                    message: e.message
                }))
            });
        }
        // 非法其他异常，透传给全局错误处理中间件
        next(error);
    }
};
