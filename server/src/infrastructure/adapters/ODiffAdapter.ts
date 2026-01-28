import { compare } from 'odiff-bin';
import path from 'path';
import sharp from 'sharp';
import fs from 'fs';
import { ICompareEngine, CompareOptions, CompareResult } from '../../domain/services/ICompareEngine.js';
import { DIRS, normalizeToPublicUrl } from '../../utils/PathUtils.js';

/**
 * ODiffAdapter - 基于 Rust 核心的高性能像素对比适配器
 * 职责：作为 ICompareEngine 的实现类，通过 odiff-bin 库执行图像差异精扫任务
 * 特性：相比本地 pixelmatch 具有极高的运行效率和内存管理优势
 */
export class ODiffAdapter implements ICompareEngine {
    /**
     * 执行像素对比
     * @param baseImg 设计稿图片物理路径
     * @param actualImg 页面实测图物理路径
     * @param options 对比参数配置 (阈值、抗锯齿等)
     * @returns 结构化的对比结果元数据
     */
    async compare(baseImg: string, actualImg: string, options: CompareOptions = {}): Promise<CompareResult> {
        // 1. 定义产物路径
        const timestamp = Date.now();
        const diffFileName = `diff-odiff-${timestamp}.png`;
        const diffPath = path.join(DIRS.REPORTS, diffFileName);

        // 临时对齐图路径 (如果尺寸不一，需要临时生成对齐后的底图)
        const alignedBaseDir = path.join(DIRS.REPORTS, 'temp');
        if (!fs.existsSync(alignedBaseDir)) fs.mkdirSync(alignedBaseDir, { recursive: true });

        const alignedBaseImg = path.join(alignedBaseDir, `aligned-base-${timestamp}.png`);
        const alignedActualImg = path.join(alignedBaseDir, `aligned-actual-${timestamp}.png`);

        try {
            console.log('[ODiff引擎] 正在执行尺寸对齐预处理...');

            // 2. 尺寸对齐逻辑 (解决用户反馈的高度不一致导致的差异遗漏问题)
            const baseMeta = await sharp(baseImg).metadata();
            const actualMeta = await sharp(actualImg).metadata();

            const maxWidth = Math.max(baseMeta.width || 0, actualMeta.width || 0);
            const maxHeight = Math.max(baseMeta.height || 0, actualMeta.height || 0);

            // 只有当尺寸确实不一致时才进行重绘扩展
            const isBaseSizeMatch = baseMeta.width === maxWidth && baseMeta.height === maxHeight;
            const isActualSizeMatch = actualMeta.width === maxWidth && actualMeta.height === maxHeight;

            const finalBase = isBaseSizeMatch ? baseImg : alignedBaseImg;
            const finalActual = isActualSizeMatch ? actualImg : alignedActualImg;

            if (!isBaseSizeMatch) {
                // 使用不透明背景进行填充，确保 ODiff 能识别出“缺失区域”的差异
                // 默认使用黑色 { r: 0, g: 0, b: 0, alpha: 1 } 以便与常见的白底页面产生最大差异
                await sharp(baseImg)
                    .extend({
                        bottom: maxHeight - (baseMeta.height || 0),
                        right: maxWidth - (baseMeta.width || 0),
                        background: { r: 0, g: 0, b: 0, alpha: 1 }
                    })
                    .toFile(alignedBaseImg);
            }

            if (!isActualSizeMatch) {
                await sharp(actualImg)
                    .extend({
                        bottom: maxHeight - (actualMeta.height || 0),
                        right: maxWidth - (actualMeta.width || 0),
                        background: { r: 0, g: 0, b: 0, alpha: 1 }
                    })
                    .toFile(alignedActualImg);
            }

            // 3. 准备 ODiff 专用忽略区域格式 (x1, y1, x2, y2)
            const ignoreRegions = (options.ignoreRegions || [])
                .filter(r => r && typeof r.x === 'number' && r.width > 0 && r.height > 0)
                .map(r => ({
                    x1: Math.floor(r.x),
                    y1: Math.floor(r.y),
                    x2: Math.floor(r.x + r.width),
                    y2: Math.floor(r.y + r.height)
                }));

            // 4. 调用 native binary 进行比对
            // 这里的 odiffOptions 初始对象必须绝对干净，不包含任何可选键
            const odiffOptions: any = {
                threshold: options.tolerance ?? (options.threshold || 0.1),
                antialiasing: options.includeAA === false,
                failOnLayoutDiff: false
            };

            // 只有当 ignoreRegions 确实存在有效数据时，才在对象上定义该属性
            // 这种动态属性追加方式比 { ignoreRegions: length > 0 ? regions : undefined } 更稳健，
            // 因为 Object.entries(odiffOptions) 将完全不包含该键，从而防止被外部库误解析。
            if (ignoreRegions && ignoreRegions.length > 0) {
                odiffOptions.ignoreRegions = ignoreRegions;
                console.log(`[ODiff引擎] 正在执行核心比对... (已激活掩模: ${ignoreRegions.length} 个区域)`);
            } else {
                console.log('[ODiff引擎] 正在执行全量图像比对... (未检测到掩模区域)');
            }

            const result = await compare(finalBase, finalActual, diffPath, odiffOptions);

            // 5. 清理临时生成的对齐文件 (如有)
            if (!isBaseSizeMatch && fs.existsSync(alignedBaseImg)) fs.unlinkSync(alignedBaseImg);
            if (!isActualSizeMatch && fs.existsSync(alignedActualImg)) fs.unlinkSync(alignedActualImg);

            // 5. 计算还原度
            const res = result as any;
            const similarity = res.match ? 100 : (100 - res.diffPercentage);

            return {
                similarity: Math.max(0, parseFloat(similarity.toFixed(2))),
                diffPixels: res.diffCount,
                totalPixels: maxWidth * maxHeight,
                diffImage: {
                    path: diffPath,
                    url: normalizeToPublicUrl(diffPath)
                }
            };
        } catch (error: any) {
            console.error('[ODiff引擎] 比对过程崩塌:', error.message);
            throw error;
        }
    }
}
