import sharp from 'sharp';
import { DiffRegion } from '../models/Report.js';

/**
 * 视觉聚类算法配置
 */
export interface ClusteringOptions {
    minRegionSize?: number;      // 触发聚类的最小像素点数 (过滤微小噪点)
    neighborhoodRadius?: number; // 像素搜索半径 (决定聚类的紧密度)
    maxRegions?: number;         // 报告中显示的最大差异区数量
    padding?: number;            // 标注框的冗余边距
}

/**
 * VisualClusteringService - 视觉语义化分析服务
 * 职责：将成千上万的散乱差异像素点转化为“人类可理解的”逻辑差异块
 * 核心：基于区域生长 (Region Growing) 算法实现空间聚类
 */
export class VisualClusteringService {
    private options: Required<ClusteringOptions>;

    constructor(options: ClusteringOptions = {}) {
        this.options = {
            minRegionSize: options.minRegionSize || 20, // 降低门槛，支持捕获更细微的文字/图标变化
            neighborhoodRadius: options.neighborhoodRadius || 2, // 极致缩小半径，只有紧挨着的像素才会被聚类
            maxRegions: options.maxRegions || 50, // 增加上限，支持碎片化显示
            padding: options.padding || 2,
        };
    }

    /**
     * 区域分析主入口
     */
    async analyzeDiffRegions(diffImagePath: string): Promise<DiffRegion[]> {
        try {
            const diffData = await this.extractDiffPixels(diffImagePath);
            if (diffData.pixels.length === 0) return [];

            // 执行多级聚类
            let regions = this.clusterDiffRegions(diffData);

            // 只有当两个框距离极近 (8px) 且合并后密度不至于坍坏时才允许自动合并
            regions = this.mergeNearbyRegions(regions, 8);

            const image = sharp(diffImagePath);
            const metadata = await image.metadata();
            const width = metadata.width || 0;
            const height = metadata.height || 0;

            const scoredRegions = regions.map((region, index) => {
                const score = this.calculatePriorityScore(region, height, width * height);
                const priority = this.getPriorityLevel(score);

                return {
                    ...region,
                    id: index + 1,
                    score: Math.round(score),
                    priority,
                    type: this.classifyRegion(region),
                    description: this.generateDescription(region, index + 1, priority)
                } as DiffRegion;
            });

            scoredRegions.sort((a, b) => b.score - a.score);
            return this.filterRegions(scoredRegions).map((r, i) => ({ ...r, id: i + 1 }));
        } catch (error) {
            console.error('[领域算法] 区域分析异常:', error);
            return [];
        }
    }

    private async extractDiffPixels(diffImagePath: string) {
        const image = sharp(diffImagePath);
        const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
        const { width, height, channels } = info;
        const pixels: { x: number; y: number; id: number }[] = [];

        // 严格探测：只捕捉 ODiff 特有的高饱和度“纯红”差异点 (#FF0000)
        // 这样可以有效排除 dimmed 原图中可能存在的红色干扰
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * channels;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];

                // 极高纯度红色判断
                if (r > 240 && g < 40 && b < 40) {
                    pixels.push({ x, y, id: y * width + x });
                }
            }
        }
        return { pixels, width, height };
    }

    private clusterDiffRegions(diffData: any) {
        const { pixels, width, height } = diffData;
        const pixelMap = new Map();
        for (const p of pixels) pixelMap.set(p.id, p);

        const visited = new Set<number>();
        const clusters = [];

        for (const p of pixels) {
            if (visited.has(p.id)) continue;
            const cluster = this.growRegion(p, pixelMap, visited, width, height);

            // 过滤极小的噪点
            if (cluster.length >= this.options.minRegionSize) {
                clusters.push(cluster);
            }
        }

        return clusters.map(c => this.getBoundingBox(c, width, height));
    }

    private growRegion(seed: any, pixelMap: Map<number, any>, visited: Set<number>, width: number, height: number) {
        const cluster = [];
        const queue = [seed];
        let head = 0;
        const radius = this.options.neighborhoodRadius;
        visited.add(seed.id);

        while (head < queue.length) {
            const p = queue[head++];
            cluster.push(p);

            for (let dx = -radius; dx <= radius; dx++) {
                for (let dy = -radius; dy <= radius; dy++) {
                    if (dx === 0 && dy === 0) continue;
                    const nx = p.x + dx;
                    const ny = p.y + dy;
                    if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

                    const nid = ny * width + nx;
                    if (visited.has(nid)) continue;

                    const neighbor = pixelMap.get(nid);
                    if (neighbor && (dx * dx + dy * dy <= radius * radius)) {
                        visited.add(nid);
                        queue.push(neighbor);
                    }
                }
            }
        }
        return cluster;
    }

    /**
     * 构建包围框 (Bounding Box)
     */
    private getBoundingBox(cluster: any[], width: number, height: number) {
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        for (const p of cluster) {
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
        }

        const x = Math.max(0, minX - this.options.padding);
        const y = Math.max(0, minY - this.options.padding);
        const w = Math.min(width - x, maxX - minX + this.options.padding * 2);
        const h = Math.min(height - y, maxY - minY + this.options.padding * 2);

        return { x, y, width: w, height: h, pixelCount: cluster.length };
    }

    /**
     * 实现：带密度保护的区域合并
     * 逻辑：禁止将两个遥远的点错误合包，即使它们在合并距离内，如果合并后密度大幅下降则拒绝。
     */
    private mergeNearbyRegions(regions: any[], maxDist = 8) {
        if (regions.length <= 1) return regions;

        let currentRegions = [...regions];
        let hasMerged = true;

        while (hasMerged) {
            hasMerged = false;
            const nextRound: any[] = [];
            const mergedIndices = new Set<number>();

            for (let i = 0; i < currentRegions.length; i++) {
                if (mergedIndices.has(i)) continue;
                let current = { ...currentRegions[i] };

                for (let j = i + 1; j < currentRegions.length; j++) {
                    if (mergedIndices.has(j)) continue;

                    const target = currentRegions[j];
                    const dist = this.calcDist(current, target);

                    // 距离检测 + 密度保护
                    if (dist < maxDist) {
                        const mergedBox = this.merge(current, target);

                        const areaBefore = (current.width * current.height) + (target.width * target.height);
                        const areaAfter = mergedBox.width * mergedBox.height;

                        // 核心密度防线：合并后的“稀疏度”不能超过阈值
                        const densityAfter = mergedBox.pixelCount / areaAfter;

                        // 如果合并产生的“空白面积”远大于原始有效面积，则拒绝合并成巨型方框
                        if (densityAfter > 0.05 || areaAfter < areaBefore * 1.5) {
                            current = mergedBox;
                            mergedIndices.add(j);
                            hasMerged = true;
                        }
                    }
                }
                nextRound.push(current);
                mergedIndices.add(i);
            }
            currentRegions = nextRound;
        }
        return currentRegions;
    }

    private calcDist(r1: any, r2: any) {
        const dx = Math.max(0, r1.x - (r2.x + r2.width), r2.x - (r1.x + r1.width));
        const dy = Math.max(0, r1.y - (r2.y + r2.height), r2.y - (r1.y + r1.height));
        return Math.sqrt(dx * dx + dy * dy);
    }

    private merge(r1: any, r2: any) {
        const minX = Math.min(r1.x, r2.x);
        const minY = Math.min(r1.y, r2.y);
        const maxX = Math.max(r1.x + r1.width, r2.x + r2.width);
        const maxY = Math.max(r1.y + r1.height, r2.y + r2.height);
        return { x: minX, y: minY, width: maxX - minX, height: maxY - minY, pixelCount: r1.pixelCount + r2.pixelCount };
    }

    /**
     * 权重精算：
     * - 高处 (头部) 的差异比低处 (尾部) 更危险
     * - 面积巨大的区块通常是布局级错误
     */
    private calculatePriorityScore(region: any, imgH: number, totalP: number) {
        const posScore = (1 - region.y / imgH) * 50; // 位置加权 (顶部差异分高)
        const area = region.width * region.height;
        const sizeScore = Math.min((area / totalP) * 1000, 30); // 面积加权
        const densityScore = (region.pixelCount / area) * 20; // 密度加权
        return posScore + sizeScore + densityScore;
    }

    private getPriorityLevel(score: number): any {
        if (score >= 90) return 'critical';
        if (score >= 70) return 'high';
        if (score >= 50) return 'medium';
        return 'low';
    }

    private classifyRegion(region: any) {
        const ratio = region.width / region.height;
        if (ratio > 4 || ratio < 0.25) return 'layout'; // 扁平或极窄的通常是线或布局间距问题
        if (region.width * region.height > 10000) return 'block'; // 大面积差异视为组件块丢失
        return 'content';
    }

    private generateDescription(region: any, id: number, priority: string) {
        const types: any = { content: '内容', layout: '布局', block: '模块' };
        return `${priority}优先级建议 #${id}: 发现${types[this.classifyRegion(region)] || '视觉'}差异 (${region.width}x${region.height})`;
    }

    private filterRegions(regions: any[]) {
        return regions.slice(0, this.options.maxRegions);
    }

    /**
     * 实现：在差异图上叠加 SVG 标注框，生成可视化增强报告
     */
    async drawRegionAnnotations(diffImgPath: string, regions: DiffRegion[], outputPath: string) {
        const image = sharp(diffImgPath);
        const { width, height } = await image.metadata();
        // 构建内联 SVG 作为蒙层
        const svg = `
            <svg width="${width}" height="${height}">
                ${regions.map(r => `
                    <rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" fill="none" stroke="red" stroke-width="2" />
                    <text x="${r.x}" y="${r.y - 5}" fill="red" font-size="12" font-weight="bold">${r.id}</text>
                `).join('')}
            </svg>
        `;
        await image.composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).toFile(outputPath);
    }
}
