import { Script } from '../models/Script.js';

export interface IScriptRepository {
    create(script: Partial<Script>): string;
    update(id: string, data: Partial<Script>): boolean;
    findById(id: string): Script | null;
    findAll(): Script[];
    deleteById(id: string): boolean;
}
