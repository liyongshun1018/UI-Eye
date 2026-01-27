/**
 * BatchTaskItem - 批量任务子项实体
 * 职责：描述批量任务中每一个具体的 URL 审计项的状态与结果摘要
 */
export interface BatchTaskItem {
    id: number;              // 数据库自增 ID
    taskId: number;          // 所属批量任务的 ID
    url: string;             // 具体的审计目标地址
    designSource?: string;   // 关联的设计稿来源
    status: 'pending' | 'running' | 'completed' | 'failed'; // 子项执行状态
    reportId?: string;       // 关联的底层 Report 记录 ID (生成后挂载)
    similarity?: number;     // 视觉还原度相似分
    diffCount?: number;      // 差异区域数量
    error?: string;          // 异常错误描述
}

