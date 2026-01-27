/**
 * ReportDTO - 审计报告数据传输对象
 * 职责：定义与前端交互的标准契约协议
 */
export interface ReportDTO {
    id: string;               // 任务 ID
    timestamp: number;        // 创建时间
    url: string;              // 待比对的页面目标地址
    config: {                 // 冗余配置项 (保持前端兼容性)
        url: string;
    };
    status: string;           // 当前状态: processing, completed, failed
    similarity: number;       // 视觉还原度相似分
    diffPixels: number;       // 差异像素总数
    totalPixels: number;      // 页面总面积 (像素)
    images: {
        design: string;       // 设计稿相对 URL
        actual: string;       // 实测截图相对 URL
        diff: string;         // 差异标注图相对 URL
    };
    diffRegions: any[];       // 智能识别的差异区域列表
    fixes: any[];             // AI 提供的 CSS 修复建议数组
    error?: string;           // 容错信息
    progress: number;         // 实时进度百分比
    stepText: string;         // 详情步骤描述 (如: AI 分析中...)
}
