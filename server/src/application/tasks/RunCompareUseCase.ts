import { IReportRepository } from '../../domain/repositories/IReportRepository.js';
import { PlaywrightCaptureAdapter } from '../../infrastructure/adapters/PlaywrightCaptureAdapter.js';
import { ICompareEngine } from '../../domain/services/ICompareEngine.js';
import { IAIProvider } from '../../domain/services/IAIProvider.js';
import { VisualClusteringService } from '../../domain/services/VisualClusteringService.js';
import { Report, ReportConfig } from '../../domain/models/Report.js';
import { resolveDesignPath, normalizeToPublicUrl } from '../../utils/PathUtils.js';
import fs from 'fs';
import sharp from 'sharp';

/**
 * RunCompareUseCase - 视觉对比执行主用例
 * 职责：作为 Application 层的核心编排器，驱动多个领域的 Service 和基础设施 Adapter 完成一次完整的 UI 审计流水线
 */
export class RunCompareUseCase {
    constructor(
        private reportRepo: IReportRepository,          // 报告仓储：负责持久化比对结果
        private captureAdapter: PlaywrightCaptureAdapter, // 截图适配器：负责从浏览器渲染页面
        private compareEngine: ICompareEngine,          // 比对引擎：负责像素级精准扫描
        private aiProvider: IAIProvider,                  // AI 服务端：负责理解差异并给出建议
        private visualClustering: VisualClusteringService // 视觉聚类服务：负责将像素差异转化为区域
    ) { }

    /**
     * 执行比对核心流水线
     * 流程：参数初始化 -> 自动适配视口 -> 捕捉截图 -> 像素比对 -> 区域聚类 -> AI 深度诊断 -> 状态回写
     * 
     * @param reportId 预生成的报告 ID
     * @param config 比对任务参数 (包含 URL、设计稿来源等)
     * @returns 最终生成的报告实体
     */
    async execute(
        reportId: string,
        config: ReportConfig,
        onProgress?: (progress: number, stepText: string) => void,
        externalImages?: { designPath: string, actualPath: string }, // 新增：外部图片支持
        scriptCode?: string // 新增：交互脚本支持
    ): Promise<Report> {
        console.log(`[核心流水线] 开始处理任务: ${reportId} -> ${config.url}`);

        try {
            // 步骤 1：启动环境与初始化 (10%)
            let report = this.reportRepo.findById(reportId);
            if (!report) {
                this.reportRepo.create({
                    id: reportId,
                    timestamp: Date.now(),
                    config,
                    status: 'processing'
                });
            }

            this.reportRepo.update(reportId, {
                status: 'processing',
                progress: 10,
                stepText: '🚀 正在初始化比对环境...'
            });
            onProgress?.(10, '🚀 正在初始化比对环境...');

            // 步骤 2：确定视口宽度 (20%)
            // 优先级：用户配置 > 设计稿宽度 > 默认值
            let viewportWidth = config.viewportWidth || 1920;
            const designPath = resolveDesignPath(config.designSource);
            if (designPath && fs.existsSync(designPath)) {
                onProgress?.(20, '🎨 正在分析设计稿规格...');
                // 仅在用户未明确指定视口宽度时，才从设计稿读取
                if (!config.viewportWidth) {
                    const metadata = await sharp(designPath).metadata();
                    if (metadata.width) viewportWidth = metadata.width;
                }
            }

            // 步骤 3：获取实测图 (30% - 50%)
            let actualPath = '';
            let actualUrl = '';

            if (externalImages) {
                // 场景 A：使用已有的外部图片 (插件同步)
                actualPath = externalImages.actualPath;
                this.reportRepo.update(reportId, { progress: 50, stepText: '📸 正在处理同步好的实测图...' });
            } else {
                // 场景 B：驱动浏览器捕捉 (标准流程)
                this.reportRepo.update(reportId, { progress: 30, stepText: '📸 正在驱动检测引擎捕获页面...' });
                const actualResult = await this.captureAdapter.capture(config.url, {
                    width: viewportWidth,
                    fullPage: true,
                    scriptCode: scriptCode
                });
                actualPath = actualResult.path;
                actualUrl = actualResult.url;
            }

            // 步骤 4+：核心算法比对与 AI 诊断 (仅在提供设计稿时执行)
            let compareResult: any = null;
            let diffRegions: any[] = [];
            let fixes: any[] = [];

            if (designPath && fs.existsSync(designPath)) {
                this.reportRepo.update(reportId, { progress: 60, stepText: '⚖️ 正在执行像素级比对算法...' });
                compareResult = await this.compareEngine.compare(designPath, actualPath, {
                    enableClustering: true
                });

                this.reportRepo.update(reportId, { progress: 75, stepText: '🔍 正在进行差异区域聚类分析...' });
                diffRegions = await this.visualClustering.analyzeDiffRegions(compareResult.diffImage.path);

                this.reportRepo.update(reportId, { progress: 85, stepText: '🧠 正在引导 AI 进行视觉偏差诊断...' });
                fixes = await this.aiProvider.analyze(
                    {
                        design: designPath,
                        actual: actualPath,
                        diff: compareResult.diffImage.path
                    },
                    { ...compareResult, diffRegions }
                );
            } else {
                console.log(`[核心流水线] 跳过比对步骤: 未提供有效设计稿 (${config.designSource})`);
                this.reportRepo.update(reportId, { progress: 90, stepText: '📸 已完成截图存证 (跳过比对)' });
            }

            // 步骤 6：报告封装 (100%)
            const finalReport: Partial<Report> = {
                status: 'completed',
                progress: 100,
                stepText: (designPath && fs.existsSync(designPath)) ? '✅ 审计流水线执行完毕' : '✅ 截图存证已完成',
                similarity: compareResult?.similarity || 0,
                diffPixels: compareResult?.diffPixels || 0,
                totalPixels: compareResult?.totalPixels || 0,
                images: {
                    design: config.designSource,
                    actual: actualUrl || normalizeToPublicUrl(actualPath),
                    diff: compareResult?.diffImage?.url || null
                },
                diffRegions,
                fixes,
                updatedAt: Date.now()
            };

            this.reportRepo.update(reportId, finalReport);
            return this.reportRepo.findById(reportId)!;

        } catch (error: any) {
            console.error(`[核心流水线] 异常 [${reportId}]:`, error);
            this.reportRepo.update(reportId, {
                status: 'failed',
                error: error.message || '未知错误',
                progress: 0,
                stepText: '❌ 任务失败'
            });
            throw error;
        }
    }
}
