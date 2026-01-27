/**
 * AI 模型配置接口定义
 */
export interface AIModelConfig {
    name: string;        // 供应商名称 (如: SiliconFlow, Qwen)
    endpoint: string;    // API 访问基地址
    apiKey: string;      // 认证密钥
    modelName: string;   // 具体模型版本
    environment?: string; // 运行环境标识
}

/**
 * AI 模型抽象基类
 * 职责：定义所有视觉分析模型的通用接口和行为基准
 * 设计模式：模板方法模式，规范了 analyze 和 diagnose 的执行预期
 */
export abstract class AIModelBase {
    protected name: string;
    protected endpoint: string;
    protected apiKey: string;
    protected modelName: string;
    protected environment?: string;

    constructor(config: AIModelConfig) {
        this.name = config.name;
        this.endpoint = config.endpoint;
        this.apiKey = config.apiKey;
        this.modelName = config.modelName;
        this.environment = config.environment;
    }

    /**
     * 核心业务：分析 UI 差异
     * @param images 图片物理路径集合 (design, actual, diff)
     * @param compareResult 像素比对量化指标
     * @returns 修复建议数组
     */
    abstract analyze(images: { design: string; actual: string; diff: string }, compareResult: any): Promise<any[]>;

    /**
     * 单点业务：实时视觉诊断
     * @param actualBase64 实测图 Base64 编码
     * @param designBase64 设计稿 Base64 编码
     * @param styles 实时计算样式
     * @param info 元素位置元数据
     * @returns 诊断文本报告
     */
    abstract diagnose(actualBase64: string, designBase64: string, styles: any, info: any, similarity?: number): Promise<string>;

    /**
     * 策略治理：验证 API 凭证有效性
     * 防止在密钥未配置时发起无效的网络请求
     */
    public isConfigValid(): boolean {
        const placeholders = ['your-qwen-token', 'your-siliconflow-key-here'];
        return !!(
            this.endpoint &&
            this.apiKey &&
            !placeholders.includes(this.apiKey)
        );
    }

    /**
     * 元数据：获取当前模型状态快照
     */
    public getInfo() {
        return {
            name: this.name,
            modelName: this.modelName,
            environment: this.environment,
            isValid: this.isConfigValid()
        };
    }

    /**
     * 领域辅助：构建结构化 Prompt
     * 将像素级的“冷数据”转化为 AI 可理解的“对比上下文”
     */
    protected buildPrompt(compareResult: any): string {
        const regionsJson = JSON.stringify(compareResult.diffRegions || [], null, 2);

        return `你是一个顶级的前端 UI 视觉审计与业务分析专家。请对比提供的 [设计稿]、[实测截图] 以及 [差异高亮图]，并参考以下量化指标：
    
    1. 总体指标：
       - 视觉相似度：${compareResult.similarity}%
       - 差异像素点：${compareResult.diffPixels}
    
    2. 发现的差异区域 (Diff Regions):
    ${regionsJson}
    
    3. 核心分析任务：
       - **技术诊断**：针对每一个差异区域的 ID，分析颜色、字体、间距等 CSS 层面的偏差。
       - **业务审计**：识别是否存在功能缺失（例如设计稿有按钮但实测图没有）、文字内容错误（例如文案不一致）或逻辑漏洞。
       - **一一对应**：你的输出必须与 Region ID 精准关联。
    
    4. 输出约束：
       - 必须返回 JSON 数组。
       - **建议类型**：type 字段可取值 "color|font|spacing|layout|content|feature|other"。
       - **纠偏建议**：
         - 对于技术问题，提供 currentCSS 和 suggestedCSS。
         - 对于业务/功能问题，可以在 advice 字段提供纯文字版的改进建议，此时 CSS 字段可留空。
       - **[严禁]**：禁止产出无效的重复样式建议。
    
    JSON 格式示例：
    [
      {
        "regionId": 1, 
        "priority": "critical|high|medium|low",
        "type": "feature", // 业务/功能缺失
        "description": "Region #1 发现功能缺失：设计稿包含‘分享链接’按钮，但在实测页面中未找到。",
        "advice": "请检查该模块的业务逻辑开关或权限设置，确保该交互组件已被加载。",
        "selector": ".share-container",
        "currentCSS": "",
        "suggestedCSS": "",
        "impact": "用户无法分享内容，严重影响业务转化"
      }
    ]`;
    }

    /**
     * 基础设施：标准格式化日志记录
     */
    protected log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
        const prefix = `[AI供应商:${this.name}]`;
        switch (level) {
            case 'error': console.error(prefix, message); break;
            case 'warn': console.warn(prefix, message); break;
            default: console.log(prefix, message);
        }
    }
}
