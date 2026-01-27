/**
 * 差异区域 (Diff Region) 定义
 * 职责：描述图像中特定位置的视觉异常块
 */
export interface DiffRegion {
    id: number;               // 区域编号 (1, 2, 3...)
    x: number;                // 区域左上角 X 轴像素坐标
    y: number;                // 区域左上角 Y 轴像素坐标
    width: number;            // 区域宽度 (px)
    height: number;           // 区域高度 (px)
    pixelCount: number;       // 该区域包含的异常像素点密度
    score: number;            // 算法计算出的优先级分值 (0-100)
    priority: 'critical' | 'high' | 'medium' | 'low'; // 威胁等级
    type: 'layout' | 'content' | 'major' | 'medium' | 'block'; // 预测的差异类型
    description: string;      // 简要描述 (如: 高优先级建议 #1)
}

/**
 * 报告配置项定义 (ReportConfig)
 * 职责：记录发起比对时的原始业务参数
 */
export interface ReportConfig {
    url: string;              // 待审计的网页地址
    designSource: string;     // 设计稿关联 ID 或 物理路径
    options?: {
        tolerance?: number;   // 像素偏差容差
        viewport?: {
            width: number;
            height: number;
        };
    };
}

/**
 * Report - 审计报告领域实体
 * 职责：反映单次 UI 还原度走查的核心数据状态，是整个系统的核心领域模型
 */
export interface Report {
    id: string;               // 报告主键 (通常为时间戳 ID)
    timestamp: number;        // 创建时间戳
    config: ReportConfig;     // 比对配置快照
    status: 'pending' | 'processing' | 'completed' | 'failed'; // 任务生命周期状态

    // 视觉量化指标
    similarity?: number;      // 整体视觉相似度百分比 (0-100)
    diffPixels?: number;      // 差异像素总数
    totalPixels?: number;     // 画布总像素

    // 图像资产集合
    images?: {
        design: string;       // 设计稿相对路径/URL
        actual: string;       // 实测截图相对路径/URL
        diff: string;         // 差异标注图相对路径/URL
    };

    // 语义化分析结果
    diffRegions?: DiffRegion[]; // 智能识别的差异区块
    fixes?: any[];             // AI 深度诊断后生成的 CSS 修复建议

    error?: string;           // 异常情况下的错误描述
    progress?: number;        // 实时处理进度百分比 (0-100)
    stepText?: string;        // 实时进度步骤文案

    createdAt?: number;       // 数据库记录实际创建时间
    updatedAt?: number;       // 最后一次状态同步时间
}
