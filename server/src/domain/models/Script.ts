/**
 * Script - 自动化预处理脚本领域实体
 * 职责：定义存储在系统中的自定义 JavaScript 代码片段，用于在截图前处理登录、清除弹窗等前置行为
 */
export interface Script {
    id: string;               // 脚本唯一标识 (UUID 或 时间戳 ID)
    name: string;             // 脚本名称 (如: 百度搜索自动登录)
    code: string;             // JavaScript 源代码正文
    description?: string;     // 脚本用途详细描述
    createdAt: number;        // 创建时间戳
    updatedAt: number;        // 最后修改时间
}
