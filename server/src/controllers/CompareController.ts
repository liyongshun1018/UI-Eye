import { Request, Response } from 'express';
import { Container } from '../infrastructure/di/Container.js';
import { ReportMapper } from '../application/mappers/ReportMapper.js';
import ResponseUtils from '../utils/ResponseUtils.js';
import fs from 'fs';
import path from 'path';
import { DIRS, normalizeToPublicUrl } from '../utils/PathUtils.js';

/**
 * CompareController - 视觉对比核心业务控制器
 * 职责：展示层 (Interfaces) 的入口，负责解析 HTTP 请求并调用 Application 层用例
 */
export class CompareController {
    // 依赖注入：通过 Container 获取核心用例与适配器单例
    private runCompareUseCase = Container.getRunCompareUseCase();
    private reportRepo = Container.getReportRepository();
    private aiAdapter = Container.getAIProvider();

    /**
     * 启动比对任务
     * 逻辑：立即持久化任务占位符，由于截图/AI比对是耗时任务，采用异步非阻塞模式执行
     */
    async startCompare(req: Request, res: Response) {
        const config = req.body;
        const reportId = Date.now().toString();

        // 1. 在数据库中建立初版任务记录 (状态为处理中)
        this.reportRepo.create({
            id: reportId,
            config,
            status: 'processing',
            timestamp: Date.now()
        });

        // 2. 发起异步流：截图 -> 像素比对 -> AI 分析
        // 注意：此处不使用 await 阻塞请求，而是立即向前端返回 reportId
        this.runCompareUseCase.execute(reportId, config).catch(err => {
            console.error('[控制器] 视觉对比链路中断:', err);
        });

        return ResponseUtils.success(res, { reportId }, '对比任务已加入队列');
    }

    /**
     * 获取单一报告详情
     * 亮点：引入了 Mapper 进行 DTO 转换，隐藏了底层 Report 实体的磁盘物理路径，仅向前端暴露必要的描述信息
     */
    async getReport(req: Request, res: Response) {
        const { id } = req.params;
        const report = this.reportRepo.findById(id as string);

        if (!report) return ResponseUtils.error(res, '报告已过期或不存在', 404);

        // 执行领域模型 -> 外部 DTO 的转换过程
        return ResponseUtils.success(res, ReportMapper.toDTO(report));
    }

    /**
     * 逻辑删除报告
     */
    async deleteReport(req: Request, res: Response) {
        const { id } = req.params;
        const deleted = this.reportRepo.deleteById(id as string);
        if (deleted === 0) return ResponseUtils.error(res, '报告未找到，无法执行删除', 404);
        return ResponseUtils.success(res, null, '报告记录已清除');
    }

    /**
     * 分页查询报告列表
     */
    async getReportList(req: Request, res: Response) {
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;

        const reports = this.reportRepo.findAll(limit, offset);

        // 批量转换 DTO 列表
        return ResponseUtils.success(res, ReportMapper.toDTOList(reports));
    }

    /**
     * 插件专项：实时视觉诊断
     * 场景：用户在插件中选定元素，AI 针对选定的 Base64 图片进行实时诊断
     */
    async diagnoseExtension(req: Request, res: Response) {
        const { actualImage, designImage, styles, elementInfo } = req.body;

        let similarity: number | undefined;

        try {
            // 插件实时点选时，常需要知道当前元素的还原度。
            // 逻辑：将 Base64 落地为临时文件 -> 调用核心对比引擎 -> 获取相似度
            if (actualImage && designImage && actualImage.startsWith('data:image') && designImage.startsWith('data:image')) {
                const timestamp = Date.now();
                const tempActualPath = path.join(DIRS.REPORTS, `temp-diag-actual-${timestamp}.png`);
                const tempDesignPath = path.join(DIRS.REPORTS, `temp-diag-design-${timestamp}.png`);

                // 转换 Base64 为文件
                const actualData = actualImage.split(';base64,').pop();
                const designData = designImage.split(';base64,').pop();

                if (actualData && designData) {
                    fs.writeFileSync(tempActualPath, Buffer.from(actualData, 'base64'));
                    fs.writeFileSync(tempDesignPath, Buffer.from(designData, 'base64'));

                    // 执行快速比对
                    const compareEngine = Container.getCompareEngine();
                    const compareResult = await compareEngine.compare(tempDesignPath, tempActualPath);
                    similarity = compareResult.similarity;

                    // 异步清理临时文件
                    setTimeout(() => {
                        if (fs.existsSync(tempActualPath)) fs.unlinkSync(tempActualPath);
                        if (fs.existsSync(tempDesignPath)) fs.unlinkSync(tempDesignPath);
                    }, 1000);
                }
            }
        } catch (error) {
            console.error('[CompareController] 实时诊断比对失败，降级为纯 AI 模式:', error);
        }

        const diagnosis = await this.aiAdapter.diagnoseVision(actualImage, designImage, styles, elementInfo, similarity);
        return ResponseUtils.success(res, { diagnosis, similarity });
    }

    /**
     * 插件专项：导出插件定制报告
     * 场景：用户在插件中完成截图和AI诊断后，将数据同步至平台生成报告
     */
    async exportExtensionReport(req: Request, res: Response) {
        console.log('[CompareController] 收到插件同步请求');
        const { url, designSource, actualScreenshot, similarity, diffRegions, fixes } = req.body;

        console.log(`[CompareController] 设计稿大小: ${designSource?.length || 0}, 截图大小: ${actualScreenshot?.length || 0}`);

        // 生成报告 ID
        const reportId = `ext-${Date.now()}`;
        console.log(`[CompareController] 生成报告 ID: ${reportId}`);

        // 将 Base64 图片保存为文件，并返回 URL 和本地路径
        const saveBase64ImageWithInfo = (base64Data: string, prefix: string): { url: string, path: string } => {
            if (!base64Data || !base64Data.startsWith('data:image')) {
                console.warn(`[CompareController] 无效的图片数据 (${prefix})，跳过保存`);
                return { url: base64Data, path: '' };
            }

            try {
                // 提取 Base64 数据（移除 data:image/png;base64, 前缀）
                const base64Content = base64Data.split(';base64,').pop() || '';
                const dataBuffer = Buffer.from(base64Content, 'base64');

                // 自动嗅探扩展名
                const extMatch = base64Data.match(/^data:image\/(\w+);base64,/);
                const ext = extMatch ? extMatch[1] : 'png';

                const filename = `${prefix}-${reportId}.${ext}`;
                const filepath = path.join(DIRS.UPLOADS, filename);

                fs.writeFileSync(filepath, dataBuffer);
                console.log(`[CompareController] 图片已保存: ${filepath}`);

                return { url: normalizeToPublicUrl(filepath), path: filepath };
            } catch (err) {
                console.error(`[CompareController] 图片保存失败 (${prefix}):`, err);
                return { url: '', path: '' };
            }
        };

        const designImageResult = saveBase64ImageWithInfo(designSource, 'design');
        const actualImageResult = saveBase64ImageWithInfo(actualScreenshot, 'actual');

        const designImageUrl = designImageResult.url;
        const actualImageUrl = actualImageResult.url;

        console.log(`[CompareController] 设计稿 URL: ${designImageUrl}`);
        console.log(`[CompareController] 截图 URL: ${actualImageUrl}`);

        // 创建报告记录并触发异步比对
        try {
            const reportConfig = {
                url,
                designSource: designImageUrl
            };

            this.reportRepo.create({
                id: reportId,
                config: reportConfig,
                status: 'processing', // 初始化为处理中
                timestamp: Date.now(),
                images: {
                    design: designImageUrl,
                    actual: actualImageUrl,
                    diff: ''
                },
                similarity: 0,
                progress: 50,
                stepText: '📥 数据同步成功，正在启动深度 UI 审计...'
            });

            // 异步执行核心比对流水线 (不阻塞跳转)
            if (designImageResult.path && actualImageResult.path) {
                this.runCompareUseCase.execute(
                    reportId,
                    reportConfig,
                    undefined,
                    {
                        designPath: designImageResult.path,
                        actualPath: actualImageResult.path
                    }
                ).catch(err => {
                    console.error(`[CompareController] 插件报告异步比对失败 [${reportId}]:`, err);
                });
            }

            console.log('[CompareController] 报告记录已创建，异步比对任务已启动');
        } catch (dbErr) {
            console.error('[CompareController] 数据库操作失败:', dbErr);
            throw dbErr;
        }

        return ResponseUtils.success(res, { reportId }, '插件数据同步成功，审计任务已在后台启动');
    }
}
