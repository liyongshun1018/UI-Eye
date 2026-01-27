import { Script } from '../models/Script.js';

/**
 * IScriptRepository - 脚本仓储接口
 * 职责：定义与自动化预处理脚本相关的持久化操作协议
 */
export interface IScriptRepository {
    /** 存储新脚本并返回其 ID */
    create(script: Partial<Script>): string;

    /** 更新指定脚本的逻辑或描述 */
    update(id: string, data: Partial<Script>): boolean;

    /** 根据 ID 取回脚本实体 */
    findById(id: string): Script | null;

    /** 取回系统内全量脚本 */
    findAll(): Script[];

    /** 销毁指定脚本 */
    deleteById(id: string): boolean;
}

