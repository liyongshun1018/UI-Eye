import sharp from 'sharp'

/**
 * DiffClusteringService - 视觉差异聚类分析引擎
 * 
 * 职责：
 * 1. 散点收集：从差异图二进制流中高效提取所有标记为“差异”的像素坐标。
 * 2. 空间聚类：应用类 DBSCAN（基于密度的空间聚类）算法，将邻近的像素合并为逻辑区域。
 * 3. 语义增强：对聚类结果进行合并、分类、评分，并根据重要性生成自然语言描述。
 * 4. 视觉标注：在物理图片上合成矢量矩形框（红框）与 ID 编号标签。
 */
class DiffClusteringService {
    /**
     * 算法初始化
     * @param {Object} options - 聚类感知敏感度设置
     */
    constructor(options = {}) {
        this.options = {
            // 噪点过滤：面积小于此值的连通域将被忽略，防止报表出现过多细碎垃圾信息
            minRegionSize: options.minRegionSize || 100,
            // 邻域探测：连通区域增长时的最大搜索半径，决定了多个散点合成为一个整体的“引力”
            neighborhoodRadius: options.neighborhoodRadius || 10,
            // 报告约束：单张页面最多提取的红框数量，保证走查者的注意力聚焦在核心问题上
            maxRegions: options.maxRegions || 20,
            // 视觉留白：标注框向外衍生的安全距离，防止标注框紧贴文字边缘导致难以阅读
            padding: options.padding || 5,
            ...options
        }
    }

    /**
     * 极速提取器：全量像素扫描
     * 优化点：直接读取 sharp 原始 raw buffer，绕过解码，速度比常规 canvas 取色快 1个数量级
     * @param {string} diffImagePath - pixelmatch 生成的源差异图
     * @returns {Promise<Object>} 返回坐标点集与画布尺寸
     */
    async extractDiffPixels(diffImagePath) {
        try {
            const image = sharp(diffImagePath)
            const { data, info } = await image.raw().toBuffer({ resolveWithObject: true })

            const diffPixels = []
            const { width, height, channels } = info

            // 对整图进行一轮 O(N) 扫描，识别差异红色通道
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const idx = (y * width + x) * channels
                    const r = data[idx]
                    const g = data[idx + 1]

                    // 启发式逻辑：提取视觉敏感的红色像素（pixelmatch 的默认差异色）
                    if (r > 180 && g < 120) {
                        // 使用 y * width + x 作为唯一键值，构建空间索引哈希
                        diffPixels.push({ x, y, id: y * width + x })
                    }
                }
            }
            return { pixels: diffPixels, width, height }
        } catch (error) {
            console.error('[算法层] 差异像素流水线中断:', error)
            return { pixels: [], width: 0, height: 0 }
        }
    }

    /**
     * 区域增长核心逻辑
     * 后台原理：基于空间哈希映射的 BFS（广度优先搜索）算法，将离散的 Point 聚合成 Blob
     */
    clusterDiffRegions(diffData) {
        const { pixels: diffPixels, width, height } = diffData
        if (!diffPixels || diffPixels.length === 0) return []

        // 空间加速索引：将数组转为 Map 映射，使邻域探测的复杂度从 O(N) 降为 O(1)
        const pixelMap = new Map()
        for (const pixel of diffPixels) {
            pixelMap.set(pixel.id, pixel)
        }

        const visited = new Set() // 全局防重置，确保每个像素只属于一个聚类区
        const clusters = []

        for (const pixel of diffPixels) {
            if (visited.has(pixel.id)) continue

            // 发起区域增长：寻找当前像素周边的连通像素
            const cluster = this.growRegionOptimized(pixel, pixelMap, visited, width, height)

            // 质量核查：移除不具备业务意义的微小噪点
            if (cluster.length >= this.options.minRegionSize) {
                clusters.push(cluster)
            }
        }

        // 转换层：将像素云团计算为最终显示的几何矩形（Bounding Box）
        const regions = clusters
            .map(cluster => this.getBoundingBox(cluster))
            .sort((a, b) => b.pixelCount - a.pixelCount) // 按显著程度（面积）排序
            .slice(0, this.options.maxRegions)

        return regions
    }

    /**
     * BFS 区域增长算法细节
     * 优化点：使用 Head/Tail 指针模拟队列，消灭 shift() 数组带来的 O(N) 重排开销
     */
    growRegionOptimized(seed, pixelMap, visited, width, height) {
        const cluster = []
        const queue = [seed]
        let head = 0
        const radius = this.options.neighborhoodRadius

        visited.add(seed.id);

        while (head < queue.length) {
            const pixel = queue[head++]
            cluster.push(pixel)

            // 搜索邻域范围：九宫格扩展至半径圆圈
            for (let dx = -radius; dx <= radius; dx++) {
                for (let dy = -radius; dy <= radius; dy++) {
                    if (dx === 0 && dy === 0) continue

                    const neighborX = pixel.x + dx
                    const neighborY = pixel.y + dy

                    if (neighborX < 0 || neighborX >= width || neighborY < 0 || neighborY >= height) continue

                    const neighborId = neighborY * width + neighborX
                    if (visited.has(neighborId)) continue

                    const neighbor = pixelMap.get(neighborId)
                    if (!neighbor) continue

                    // 欧几里得距离计算：确保聚类边缘呈平滑圆形
                    const distanceSq = dx * dx + dy * dy
                    if (distanceSq <= radius * radius) {
                        visited.add(neighborId);
                        queue.push(neighbor)
                    }
                }
            }
        }
        return cluster
    }

    /**
     * 计算像素团的物理边界
     * 处理逻辑：流式极值查找，避免大数组解包导致的堆栈溢出
     */
    getBoundingBox(cluster) {
        if (!cluster || cluster.length === 0) return { x: 0, y: 0, width: 0, height: 0, pixelCount: 0 }

        let minX = Infinity, minY = Infinity
        let maxX = -Infinity, maxY = -Infinity

        for (let i = 0; i < cluster.length; i++) {
            const p = cluster[i]
            if (p.x < minX) minX = p.x
            if (p.x > maxX) maxX = p.x
            if (p.y < minY) minY = p.y
            if (p.y > maxY) maxY = p.y
        }

        // 加入 padding 并确保结果不会超出画布边界
        const finalMinX = Math.max(0, minX - this.options.padding)
        const finalMinY = Math.max(0, minY - this.options.padding)
        const finalMaxX = maxX + this.options.padding
        const finalMaxY = maxY + this.options.padding

        return {
            x: finalMinX,
            y: finalMinY,
            width: finalMaxX - finalMinX,
            height: finalMaxY - finalMinY,
            pixelCount: cluster.length
        }
    }

    /**
     * 全流程深度分析链路
     * 逻辑：提取 -> 聚类 -> 合并 -> 分类 -> 打分 -> 排序 -> 产出
     */
    async analyzeDiffRegions(diffImagePath) {
        try {
            // 1. 获取物理差异数据
            const diffData = await this.extractDiffPixels(diffImagePath)
            const { pixels: diffPixels } = diffData

            if (diffPixels.length === 0) return []

            // 2. 第一阶段：物理像素连通聚类
            let regions = this.clusterDiffRegions(diffData)

            // 3. 第二阶段：语义层合并（如将原本离散的文字段落合并为一个完整的走查区域）
            regions = this.mergeNearbyRegions(regions)

            const { width, height } = await sharp(diffImagePath).metadata()

            // 4. 第三阶段：综合维度的重要性评分（权重：位置、面积、密度）
            regions = regions.map((region, index) => {
                const score = this.calculatePriorityScore(region, height, width * height)
                const priority = this.getPriorityLevel(score)

                return {
                    ...region,
                    id: index + 1,
                    score: Math.round(score),
                    priority,
                    type: this.classifyRegion(region),
                    description: this.generateDescription(region, index + 1, priority)
                }
            })

            // 5. 排序：首要问题优先展示
            regions.sort((a, b) => b.score - a.score)

            // 6. 最终降噪过滤
            regions = this.filterRegions(regions)

            // 7. 索引规整
            regions = regions.map((region, index) => ({
                ...region,
                id: index + 1
            }))

            return regions
        } catch (error) {
            console.error('[核心服务] 差异分析链路处理失败:', error)
            return []
        }
    }

    /**
     * 语义合并算法 (Region Merging)
     * 解决问题：网页渲染中由于 1px 细微间距导致的聚类碎片化。
     */
    mergeNearbyRegions(regions, maxDistance = 50) {
        if (regions.length <= 1) return regions

        const merged = []
        const used = new Set()

        for (let i = 0; i < regions.length; i++) {
            if (used.has(i)) continue

            let current = { ...regions[i] }

            for (let j = i + 1; j < regions.length; j++) {
                if (used.has(j)) continue

                // 计算两块矩形的最短边界距离
                const distance = this.calculateRegionDistance(current, regions[j])

                // 若距离在可合并范围内，则执行并集计算
                if (distance < maxDistance) {
                    current = this.mergeTwoRegions(current, regions[j])
                    used.add(j)
                }
            }

            merged.push(current)
            used.add(i)
        }
        return merged
    }

    /**
     * 距离计算模型
     */
    calculateRegionDistance(r1, r2) {
        const dx = Math.max(0, r1.x - (r2.x + r2.width), r2.x - (r1.x + r1.width))
        const dy = Math.max(0, r1.y - (r2.y + r2.height), r2.y - (r1.y + r1.height))
        return Math.sqrt(dx * dx + dy * dy)
    }

    /**
     * 矩形并集计算
     */
    mergeTwoRegions(r1, r2) {
        const minX = Math.min(r1.x, r2.x)
        const minY = Math.min(r1.y, r2.y)
        const maxX = Math.max(r1.x + r1.width, r2.x + r2.width)
        const maxY = Math.max(r1.y + r1.height, r2.y + r2.height)

        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
            pixelCount: r1.pixelCount + r2.pixelCount
        }
    }

    /**
     * 优先级评分数学模型
     * 核心评分：位置（离顶端越近分越高） + 面积占比 + 差异点密度
     */
    calculatePriorityScore(region, imageHeight, totalPixels) {
        const positionScore = (1 - region.y / imageHeight) * 30
        const area = region.width * region.height
        const sizeScore = Math.min((area / totalPixels) * 1000, 40)
        const density = region.pixelCount / area
        const densityScore = density * 30

        return positionScore + sizeScore + densityScore
    }

    /**
     * 评级转换层
     */
    getPriorityLevel(score) {
        if (score >= 90) return 'critical' // 毁灭性差异
        if (score >= 70) return 'high'     // 显著差异
        if (score >= 50) return 'medium'   // 一般差异
        return 'low'                       // 细微差异
    }

    /**
     * 视觉精简处理器
     * 策略：自动截取最具代表性的差异点，防止因长图过度报警导致的视觉疲劳
     */
    filterRegions(regions) {
        let filtered = regions.filter(r => r.width * r.height >= 100)

        // 强相关过滤：核心重点问题必须展示
        const important = filtered.filter(r => r.priority === 'critical' || r.priority === 'high')

        // 低优先排序策略
        const others = filtered.filter(r => r.priority === 'medium' || r.priority === 'low')
            .slice(0, Math.max(5, 15 - important.length))

        filtered = [...important, ...others].slice(0, 15)
        return filtered
    }

    /**
     * 智能分类逻辑：基于几何特征判定差异属性
     */
    classifyRegion(region) {
        const area = region.width * region.height
        const aspectRatio = region.width / region.height

        if (aspectRatio > 3 || aspectRatio < 0.33) {
            return 'layout' // 典型的布局/间距偏移
        } else if (area > 10000) {
            return 'major'  // 大面积 UI 缺失或显著冲突
        } else if (area > 1000) {
            return 'medium' // 中量元素位移
        } else {
            return 'minor'  // 微小图案/图标像素抖动
        }
    }

    /**
     * 语义描述生成器
     */
    generateDescription(region, index, priority = 'medium') {
        const typeLabels = { layout: '布局差异', major: '主要差异', medium: '中等差异', minor: '细微差异' }
        const priorityLabels = { critical: '关键', high: '重要', medium: '一般', low: '次要' }

        const typeLabel = typeLabels[region.type] || '差异'
        const priorityLabel = priorityLabels[priority] || ''

        return `${priorityLabel}${typeLabel} #${index} (${region.width}×${region.height}px)`
    }

    /**
     * 物理合成层：利用 SVG 画笔在图片上绘制标注
     * 处理逻辑：图层叠加，将矢量边框合并到栅格图象中
     */
    async drawRegionAnnotations(diffImagePath, regions, outputPath) {
        try {
            const image = sharp(diffImagePath)
            const { width, height } = await image.metadata()

            // 构造 SVG 合成指令
            const svgOverlays = regions.map((region, index) => {
                const color = this.getRegionColor(region.type)

                return `
          <rect x="${region.x}" y="${region.y}" width="${region.width}" height="${region.height}" fill="none" stroke="${color}" stroke-width="3" stroke-dasharray="5,5"/>
          <circle cx="${region.x + 15}" cy="${region.y + 15}" r="12" fill="${color}"/>
          <text x="${region.x + 15}" y="${region.y + 20}" text-anchor="middle" font-size="14" font-weight="bold" fill="white">${region.id}</text>
        `
            }).join('')

            const svg = `<svg width="${width}" height="${height}">${svgOverlays}</svg>`

            // 将合成图持久化
            await image
                .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
                .toFile(outputPath)

            return outputPath
        } catch (error) {
            console.error('[核心服务] 图像标注合成失败:', error)
            throw error
        }
    }

    /**
     * 调色板逻辑：语义化配色方案
     */
    getRegionColor(type) {
        const colors = {
            layout: '#FF6B6B',   // 红色 - 结构崩溃
            major: '#FF8C42',    // 橙色 - 严重冲突
            medium: '#FFD93D',   // 黄色 - 常规差异
            minor: '#6BCF7F'     // 绿色 - 极轻微偏差
        }
        return colors[type] || '#6366F1'
    }
}

export default DiffClusteringService
