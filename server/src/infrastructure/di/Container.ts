import { SqliteReportRepository } from '../repositories/SqliteReportRepository.js';
import { SqliteBatchTaskRepository } from '../repositories/SqliteBatchTaskRepository.js';
import { SqliteScriptRepository } from '../repositories/SqliteScriptRepository.js';
import { PuppeteerCaptureAdapter } from '../adapters/PuppeteerCaptureAdapter.js';
import { ODiffAdapter } from '../adapters/ODiffAdapter.js';
import { AIAnalyzerAdapter } from '../adapters/AIAnalyzerAdapter.js';
import { RunCompareUseCase } from '../../application/tasks/RunCompareUseCase.js';
import { ManageBatchTasksUseCase } from '../../application/tasks/ManageBatchTasksUseCase.js';
import { ManageScriptsUseCase } from '../../application/tasks/ManageScriptsUseCase.js';
import { VisualClusteringService } from '../../domain/services/VisualClusteringService.js';

/**
 * Container - 极简依赖注入容器
 * 职责：控制反转 (IoC)，统一管理对象的单例生命周期
 * 核心设计：通过单例映射表实现懒加载实例化，消除系统各处的“硬编码依赖”
 */
export class Container {
    // 存储已实例化的对象，避免重复创建
    private static instances: Map<string, any> = new Map();

    // --- 基础设施层 (Infrastructure) ---

    static getReportRepository() {
        return this.get('ReportRepo', () => new SqliteReportRepository());
    }

    static getBatchTaskRepository() {
        return this.get('BatchTaskRepo', () => new SqliteBatchTaskRepository());
    }

    static getScriptRepository() {
        return this.get('ScriptRepo', () => new SqliteScriptRepository());
    }

    static getCaptureAdapter() {
        return this.get('CaptureAdapter', () => new PuppeteerCaptureAdapter());
    }

    static getCompareEngine() {
        return this.get('CompareEngine', () => new ODiffAdapter());
    }

    static getAIProvider() {
        return this.get('AIProvider', () => new AIAnalyzerAdapter());
    }

    // --- 领域服务层 (Domain Services) ---

    static getVisualClusteringService() {
        return this.get('VisualClustering', () => new VisualClusteringService());
    }

    // --- 应用层用例 (Application Tasks) ---

    static getRunCompareUseCase() {
        return this.get('RunCompareUseCase', () => new RunCompareUseCase(
            this.getReportRepository(),
            this.getCaptureAdapter(),
            this.getCompareEngine(),
            this.getAIProvider(),
            this.getVisualClusteringService()
        ));
    }

    static getManageBatchTasksUseCase() {
        return this.get('ManageBatchTasksUseCase', () => new ManageBatchTasksUseCase(
            this.getBatchTaskRepository(),
            this.getRunCompareUseCase()
        ));
    }

    static getManageScriptsUseCase() {
        return this.get('ManageScriptsUseCase', () => new ManageScriptsUseCase(
            this.getScriptRepository()
        ));
    }

    /**
     * 内部单例获取逻辑
     * @param key 实例唯一键
     * @param factory 创建实例的工厂函数
     */
    public static get<T>(key: string, factory: () => T): T {
        if (!this.instances.has(key)) {
            this.instances.set(key, factory());
        }
        return this.instances.get(key);
    }
}
