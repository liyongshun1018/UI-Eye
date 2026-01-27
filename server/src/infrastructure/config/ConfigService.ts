import { z } from 'zod';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// 处理 ESM 模块下的路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 初始化环境变量加载
dotenv.config({ path: path.join(__dirname, '../../../../.env') });

/**
 * 核心配置 Schema 定义
 * 职责：定义系统所需的所有环境变量及其默认值，执行强类型校验
 */
const configSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().default(3000),

    // 数据库配置
    DB_PATH: z.string().default(path.join(__dirname, '../../../ui-eye.db')),

    // AI 模型配置：Qwen-VL
    QWEN_API_KEY: z.string().optional(),
    QWEN_MODEL_NAME: z.string().default('qwen-vl-max'),

    // AI 模型配置：SiliconFlow
    SILICONFLOW_API_KEY: z.string().optional(),
    SILICONFLOW_MODEL_NAME: z.string().default('Pro/Qwen/Qwen2-VL-72B-Instruct'),

    // 资源存放路径 (修正：指向 server/data 目录)
    UPLOAD_DIR: z.string().default(path.join(__dirname, '../../../data/uploads')),
    REPORT_DIR: z.string().default(path.join(__dirname, '../../../data/reports')),
});

export type Config = z.infer<typeof configSchema>;

/**
 * ConfigService - 全局配置管理服务
 */
export class ConfigService {
    private static config: Config;

    /**
     * 获取经过校验的完整配置对象
     */
    static getConfig(): Config {
        if (!this.config) {
            // 解析 process.env，若缺失则使用 schema 中的默认值
            const result = configSchema.safeParse(process.env);
            if (!result.success) {
                console.error('❌ 环境变量校验失败:', result.error.format());
                throw new Error('配置加载异常');
            }
            this.config = result.data;
        }
        return this.config;
    }

    /**
     * 快捷判断：是否为开发模式
     */
    static get isDevelopment(): boolean {
        return this.getConfig().NODE_ENV === 'development';
    }

    /**
     * 获取 AI 模型的具体供应商配置
     */
    static getAIModelConfig(provider: 'qwen' | 'siliconflow'): any {
        const config = this.getConfig();
        if (provider === 'qwen') {
            return {
                name: 'Qwen',
                apiKey: config.QWEN_API_KEY,
                modelName: config.QWEN_MODEL_NAME,
                endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'
            };
        } else {
            return {
                name: 'SiliconFlow',
                apiKey: config.SILICONFLOW_API_KEY,
                modelName: config.SILICONFLOW_MODEL_NAME,
                endpoint: 'https://api.siliconflow.cn/v1/chat/completions'
            };
        }
    }
}
