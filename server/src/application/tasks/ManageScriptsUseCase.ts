import { IScriptRepository } from '../../domain/repositories/IScriptRepository.js';
import { Script } from '../../domain/models/Script.js';

export class ManageScriptsUseCase {
    constructor(private scriptRepo: IScriptRepository) { }

    createScript(name: string, code: string, description?: string): string {
        return this.scriptRepo.create({ name, code, description });
    }

    updateScript(id: string, data: Partial<Script>): boolean {
        return this.scriptRepo.update(id, data);
    }

    getScript(id: string): Script | null {
        return this.scriptRepo.findById(id);
    }

    getScripts(): Script[] {
        return this.scriptRepo.findAll();
    }

    deleteScript(id: string): boolean {
        return this.scriptRepo.deleteById(id);
    }
}
