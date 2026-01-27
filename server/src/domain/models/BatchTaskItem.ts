export interface BatchTaskItem {
    id: number;
    taskId: number;
    url: string;
    designSource?: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    reportId?: string;
    similarity?: number;
    diffCount?: number;
    error?: string;
}
