import CaptureService from '../services/CaptureService.js'
import CompareService from '../services/CompareService.js'
import AIAnalyzerService from '../services/AIAnalyzerService.js'
import ReportRepository from '../repositories/ReportRepository.js'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import { DIRS, resolveDesignPath, normalizeToPublicUrl } from '../utils/PathUtils.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * CompareController - 对比任务核心控制器
 * 职责：
 * 1. 接收 Web 端或插件端发起的 HTTP 请求。
 * 2. 调度截图、像素对比、AI 分析等核心服务。
 * 3. 管理报告的持久化与生命周期。
 * 设计模式：采用构造函数依赖注入，方便单元测试与服务替换。
 */
class CompareController {
    /**
     * 架构设计：依赖注入
     * @param {CaptureService} captureService - 负责网页截图采集
     * @param {CompareService} compareService - 负责像素级图像分析
     * @param {AIAnalyzerService} aiService - 负责调用大模型进行视觉诊断
     * @param {ReportRepository} reportRepo - 负责报告数据的数据库存取
     */
    constructor(captureService, compareService, aiService, reportRepo) {
        this.captureService = captureService || new CaptureService()
        this.compareService = compareService || new CompareService()
        this.aiService = aiService || new AIAnalyzerService()
        this.reportRepo = reportRepo || new ReportRepository()
    }

    /**
     * 业务入口：启动全新的网页对比任务
     * 逻辑：立即创建一个“处理中”状态的报告 ID 返回给前端，然后开启后台异步链路
     */
    async startCompare(req, res) {
        // 请求体已由全局 validate(compareSchema) 中间件进行了白名单清洗
        const config = req.body

        // 生成任务唯一标识（使用时间戳确保顺序性）
        const reportId = Date.now().toString()

        // 1. 同步预创记录：确保前端在查询时不会得到 404，而是能看到加载中状态
        this.reportRepo.create({
            id: reportId,
            config,
            status: 'processing',
            timestamp: Date.now()
        })

        // 2. 异步处理流水线：不阻塞 HTTP 响应，提高吞吐量
        this.processCompareTask(reportId, config).catch(error => {
            console.error('[核心控制器] 异步对比链崩塌:', error)
            // 失败回退：将错误状态写入数据库，供前端轮询时捕获
            this.reportRepo.update(reportId, {
                status: 'failed',
                error: error.message
            })
        })

        // 3. 返回凭证：告知前端“任务已排队，请通过此 ID 继续跟进”
        res.json({
            success: true,
            data: { reportId }
        })
    }

    /**
     * 后台异步调度中心
     * 特性：代理委派给 CompareTaskService 以执行原子操作
     */
    async processCompareTask(reportId, config) {
        // 动态导入以解决可能的循环依赖风险
        const CompareTaskService = (await import('../services/CompareTaskService.js')).default;

        try {
            await CompareTaskService.execute({
                ...config,
                id: reportId // 关键：确保后台任务使用的 ID 与前端持有的凭证一致
            }, {
                onProgress: (data) => {
                    // 进度日志审计：通过 WebSocket 或 Repository Update 实时外溢进度
                    console.log(`[任务调度层] ID: ${reportId} -> ${data.progress}% [${data.stepText}]`);
                }
            });
            console.log(`\n✅ 对比链条执行完毕: ${reportId}`);
        } catch (error) {
            console.error('\n❌ 任务委派处理异常:', error);
            throw error;
        }
    }

    /**
     * 管理接口：根据 ID 获取报告详情
     */
    async getReport(req, res) {
        const { id } = req.params
        const report = this.reportRepo.findById(id)

        if (!report) {
            return res.status(404).json({
                success: false,
                message: '对比报告由于 ID 错误或已被清理，无法找到'
            })
        }

        res.json({
            success: true,
            data: report
        })
    }

    /**
     * 管理接口：物理删除报告记录
     */
    async deleteReport(req, res) {
        const { id } = req.params
        const deletedCount = this.reportRepo.delete(id)

        if (deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: '未找到相应报告，删除操作已撤回'
            })
        }

        res.json({
            success: true,
            message: '报告及其关联元数据已从系统移除'
        })
    }

    /**
     * 管理接口：分页获取历史报告列表
     */
    async getReportList(req, res) {
        // 参数归一化：处理翻页标识
        const limit = parseInt(req.query.limit) || 50
        const offset = parseInt(req.query.offset) || 0

        const reports = this.reportRepo.findAll({ limit, offset })

        res.json({
            success: true,
            data: reports
        })
    }

    /**
     * 专用接口：插件端数据的“一键推送”与同步
     * 设计哲学：将插件端捕获的 Base64 原始镜像持久化并生成结构化报告。
     */
    async exportExtensionReport(req, res) {
        const { actualImage, designImage, diagnosis, styles, elementInfo } = req.body

        const reportId = `ext-${Date.now()}`
        console.log(`[插件桥接] 正在同步端上数据流: ${reportId}`)

        /**
         * 磁盘持久化助手：将插件传来的 Base64 字节流还原为物理 PNG 文件
         */
        const saveBase64ToDisk = (base64, prefix) => {
            // 清洗 DataURL 头部的 Meta 信息
            const base64CleanData = base64.replace(/^data:image\/\w+;base64,/, "")
            const buffer = Buffer.from(base64CleanData, 'base64')
            const fileName = `${prefix}-${reportId}.png`
            const filePath = path.join(DIRS.UPLOADS, fileName)
            fs.writeFileSync(filePath, buffer)
            return fileName
        }

        // 1. 物理化：写入设计稿与实测图
        const actualFileName = saveBase64ToDisk(actualImage, 'actual')
        const designFileName = saveBase64ToDisk(designImage, 'design')
        const actualPath = path.join(DIRS.UPLOADS, actualFileName)
        const designPath = path.join(DIRS.UPLOADS, designFileName)

        // 2. 深度对比：即便是由插件触发，后端也要执行一次像素精算以生成差异高亮图
        console.log(`[插件桥接] 启动异步像素级精算链路...`)
        const compareResult = await this.compareService.compare(designPath, actualPath, {
            enableClustering: true // 开启智能聚类，让导出的报告也支持“红框定位”
        })

        // 3. 数据建模：构造标准报告对象，确保 Web 端能解析显示的连贯性
        const reportData = {
            id: reportId,
            status: 'completed',
            timestamp: Date.now(),
            similarity: compareResult.similarity,
            diffPixels: compareResult.diffPixels,
            totalPixels: compareResult.totalPixels,
            config: {
                url: elementInfo?.url || '来自浏览器插件',
                designSource: designFileName
            },
            images: {
                // 路径转换：将物理磁盘路径转为前端可直接通过浏览器访问的 Web URL
                actual: normalizeToPublicUrl(actualPath),
                design: normalizeToPublicUrl(designPath),
                diff: compareResult.diffImage?.annotatedUrl || compareResult.diffImage?.url
            },
            diffRegions: compareResult.diffRegions || [],
            // 降级适配：将非结构化诊断结论转为系统标准的 Fixes 建议数组
            fixes: [{
                priority: 'medium',
                type: 'layout',
                selector: elementInfo?.tagName || 'UI 元素',
                currentCSS: '',
                suggestedCSS: '',
                suggestion: diagnosis || '已成功导出，等待 AI 深度反馈'
            }],
            elementInfo: styles // 持久化原始样式快照供审查
        }

        // 4. 入库备案
        this.reportRepo.create(reportData)

        res.json({
            success: true,
            data: { reportId },
            message: '报告已成功镜像至 Web 后台，您可以前往详情页查看高亮差异'
        })
    }

    /**
     * 实时接口：插件端的即时 AI 视觉诊断（Vision-driven）
     * 逻辑：接收两张 Base64 图像，由于不需要长期存档，仅做实时分析返回
     */
    async diagnoseExtension(req, res) {
        const { actualImage, designImage, styles, elementInfo } = req.body

        // 强制防御：实测图与设计图缺一不可
        if (!actualImage || !designImage) {
            return res.status(400).json({
                success: false,
                message: '诊断失败：必须同时上传实测与基准图像'
            })
        }

        console.log(`[实时诊断] 目标: ${elementInfo?.tagName || '未知元素'} 来源: ${elementInfo?.url || '未知路径'}`)

        // 内部助手：快速零存整取
        const saveTempImg = (base64, tag) => {
            const buffer = Buffer.from(base64.replace(/^data:image\/\w+;base64,/, ""), 'base64')
            const tempPath = path.join(DIRS.UPLOADS, `temp-${tag}-${Date.now()}.png`)
            fs.writeFileSync(tempPath, buffer)
            return tempPath
        }

        const tempActual = saveTempImg(actualImage, 'actual')
        const tempDesign = saveTempImg(designImage, 'design')

        // 高并发优化：利用 Promise.all 同步执行 AI 解析与数学相似度计算（耗时取决于 AI 响应）
        const [diagnosis, compareResult] = await Promise.all([
            this.aiService.diagnoseVision(actualImage, designImage, styles, elementInfo),
            this.compareService.compare(tempDesign, tempActual, { enableClustering: false })
        ])

        // 响应结果
        res.json({
            success: true,
            data: {
                diagnosis,
                similarity: compareResult.similarity
            },
            message: '视觉多模态分析与数学比对已协同完成'
        })
    }
}

export default CompareController
