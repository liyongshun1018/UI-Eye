import { IScriptRepository } from '../../domain/repositories/IScriptRepository.js';
import { Script } from '../../domain/models/Script.js';

/**
 * ManageScriptsUseCase - 脚本管理用例
 * 职责：提供针对走查脚本的 CRUD (增删改查) 业务逻辑封装
 */
export class ManageScriptsUseCase {
    constructor(private scriptRepo: IScriptRepository) { }

    /**
     * 创建新脚本
     */
    createScript(name: string, code: string, description?: string): string {
        return this.scriptRepo.create({ name, code, description });
    }

    /**
     * 更新脚本内容
     */
    updateScript(id: string, data: Partial<Script>): boolean {
        return this.scriptRepo.update(id, data);
    }

    /**
     * 获取指定脚本详情
     */
    getScript(id: string): Script | null {
        return this.scriptRepo.findById(id);
    }

    /**
     * 获取所有可用脚本列表
     */
    getScripts(): Script[] {
        return this.scriptRepo.findAll();
    }

    /**
     * 物理删除指定脚本
     */
    deleteScript(id: string): boolean {
        return this.scriptRepo.deleteById(id);
    }
}

