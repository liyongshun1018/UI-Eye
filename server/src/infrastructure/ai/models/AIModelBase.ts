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

        return `你是一位拥有世界级审美的资深前端 UI/UX 视觉审计专家，专门负责检测设计稿与线上页面的微小偏差。
请深度对比 [设计稿]、[实测截图] 以及 [差异高亮图]，并基于以下数据进行“像素级”诊断：

**1. 核心量化指标**
   - 整体相似度: ${compareResult.similarity}%
   - 差异像素: ${compareResult.diffPixels}
   - 系统检测到的差异区域: ${regionsJson}

**2. 💥 重大变革：审计策略 (Auditing Strategy)**

> [!IMPORTANT]
> **不要被系统检测到的差异区域 (regions) 所局限。** 
> 即使系统只返回了一个巨大的差异区域，你也必须对该区域进行“二次深度扫描”，找出其中每一个具体的不一致组件。
> **目标：** 一个差异区域 (Region) 应该被拆解为多个具体的修复建议项。

   **2.1 自顶向下扫描逻辑：**
   1. **布局框架 (Layout)**: 整体容器宽度、Flex 换行、Grid 网格、导航栏高度。
   2. **组件一致性 (Components)**: 按钮圆角尺寸、图标大小、输入框边框色。
   3. **细腻质感 (Aesthetics)**: 投影模糊半径、背景渐变方向、元素透明度 (Opacity)。
   4. **文字排版 (Typography)**: 字距 (letter-spacing)、行高 (line-height)、字体粗细。

**3. 深度诊断维度**

   - **根因推断 (Root Cause)**: 必须指出是 CSS 中的哪个具体属性 (如 \`box-sizing\`, \`flex-shrink\`, \`font-family\`) 导致了偏差。
   - **视觉设计原则**: 评估是否违反了“亲密性 (Proximity)”、“视觉平衡 (Visual Balance)”或“节奏感”。
   - **用户感知影响**: 该偏差是否会导致用户在视觉上觉得页面“廉价”、“乱槽槽”或“不可信”。

**4. 输出约束 (Output Rules)**

   - **格式：** 必须返回严格的 JSON 数组。
   - **细粒度要求：** 对于大型差异区域，必须拆分为多个对象。
   - **CSS 修复代码：** 必须提供可直接使用的代码，例如：\`margin: 12px 0; border-radius: 8px;\`。
   - **选择器 (Selector)：** 尽可能写出逻辑严密的 CSS 选择器 (如 \`.card-item .btn-primary\`)。

**5. 期望的回复结构示例**

\`\`\`json
[
  {
    "regionId": 1,
    "priority": "critical",
    "type": "layout",
    "reasoning": "由于设计稿使用了 1440px 容器而实测页面为流式布局，导致顶部 Banner 在大屏下被拉伸，比例失调。",
    "description": "顶栏 Banner 高度从 400px 变为了 520px，导致首屏内容显示不全。",
    "designPrinciple": "Hierarchy (视觉层级) 遭到破环",
    "selector": ".hero-banner",
    "currentCSS": "height: auto; width: 100%;",
    "suggestedCSS": "max-width: 1440px; margin: 0 auto; aspect-ratio: 16 / 9;",
    "fixDifficulty": "medium",
    "estimatedTime": "15min"
  },
  {
    "regionId": 1, 
    "priority": "high",
    "type": "color",
    "reasoning": "实测截图背景色比设计稿更亮，可能是因为父级容器重叠了多个背景层。 ",
    "description": "背景颜色偏差：设计稿 #F8FAFC vs 线上 #FFFFFF。",
    "selector": ".main-content",
    "currentCSS": "background: #fff;",
    "suggestedCSS": "background: var(--slate-50, #f8fafc);",
    "fixDifficulty": "simple",
    "estimatedTime": "2min"
  }
]
\`\`\`

**6. 最后的严令**
- **严禁** 返回单个包含所有内容的模糊项。
- **严禁** 在 JSON 外部包裹 Markdown 代码块。
- **务必** 捕捉那些只有顶尖设计师才能发现的 1 - 2 像素对齐偏差。`;
    }

    /**
     * 基础设施:标准格式化日志记录
     * 支持字符串、对象和多行内容的打印
     */
    protected log(message: string | object, level: 'info' | 'warn' | 'error' = 'info'): void {
        const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
        const prefix = `[${timestamp}] [AI供应商:${this.name}]`;

        // 如果是对象,格式化为 JSON
        const content = typeof message === 'object'
            ? JSON.stringify(message, null, 2)
            : message;

        switch (level) {
            case 'error':
                console.error(prefix, content);
                break;
            case 'warn':
                console.warn(prefix, content);
                break;
            default:
                console.log(prefix, content);
        }
    }

    /**
     * 辅助方法:打印分隔线,用于区分不同的日志块
     */
    protected logSeparator(title?: string): void {
        const line = '='.repeat(80);
        if (title) {
            const padding = Math.floor((80 - title.length - 2) / 2);
            const paddedTitle = '='.repeat(padding) + ` ${title} ` + '='.repeat(padding);
            console.log(`\n${paddedTitle}\n`);
        } else {
            console.log(`\n${line}\n`);
        }
    }
}
