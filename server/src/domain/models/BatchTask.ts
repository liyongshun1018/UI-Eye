/**
 * BatchTask - 批量审计任务领域实体
 * 职责：管理大规模多链接自动比对任务的状态聚合与业务元数据
 */
export interface BatchTask {
    id: number;               // 数据库自增 ID
    name: string;             // 任务标题 (用户自定义)
    urls: string[];           // 待审计的网站地址集合
    domain?: string;          // 可选域名白名单限制
    status: 'pending' | 'running' | 'completed' | 'failed' | 'partial_success'; // 批处理执行状态

    // 进度与结果统计
    total: number;            // 总页数
    success: number;          // 成功页数
    failed: number;           // 失败页数
    progress: number;         // 实时整体百分比进度
    duration?: number;        // 累计执行耗时 (秒)
    stepText?: string;        // 当前执行阶段描述

    // 视觉聚合指标
    avgSimilarity?: number;    // 全站平均还原度分数
    totalDiffCount?: number;   // 全站累计汇总差异点总数

    // 关联配置
    designMode?: 'single' | 'matching'; // 设计稿模式
    designSource?: string;              // 设计稿来源 (single 模式下使用)
    compareConfig?: any;                // 批处理通用的比对阈值参数
    aiModel?: string;                   // 指定的 AI 分析引擎
    scriptId?: string;                  // 关联的交互脚本 ID

    // 时间审计
    createdAt: number;        // 创建时间
    startedAt?: number;       // 开始执行时间
    completedAt?: number;     // 整体归档时间
}
