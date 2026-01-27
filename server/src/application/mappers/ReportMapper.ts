import { Report } from '../../domain/models/Report.js';
import { ReportDTO } from '../dtos/ReportDTO.js';

/**
 * ReportMapper - 审计报告数据转换器
 * 职责：负责领域模型 (Domain Model) 与 数据传输对象 (DTO) 之间的双向映射
 * 意义：通过该层可以灵活控制哪些字段可以暴露给前端，哪些敏感字段 (如本地绝对路径) 必须隐藏
 */
export class ReportMapper {
    /**
     * 将 Report 实体转换为面向前端展示的 DTO
     * @param report 领域实体
     * @returns 格式化后的 DTO 对象
     */
    static toDTO(report: Report): ReportDTO {
        return {
            id: report.id,
            timestamp: report.timestamp,
            // 策略：前端不需要完整的配置对象，只需几个关键字段
            url: report.config.url,
            config: {
                url: report.config.url
            },
            status: report.status,
            similarity: report.similarity || 0,
            diffPixels: report.diffPixels || 0,
            totalPixels: report.totalPixels || 0,
            // 路径脱敏：仅返回 Web 可访问的相对路径前缀
            images: {
                design: report.images?.design || '',
                actual: report.images?.actual || '',
                diff: report.images?.diff || ''
            },
            // 透传分析建议与区域
            diffRegions: report.diffRegions || [],
            fixes: report.fixes || [],
            error: report.error,
            progress: report.progress || 0,
            stepText: report.stepText || ''
        };
    }

    /**
     * 批量转换 DTO 列表
     */
    static toDTOList(reports: Report[]): ReportDTO[] {
        return reports.map(report => this.toDTO(report));
    }
}
