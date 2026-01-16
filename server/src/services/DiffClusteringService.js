import sharp from 'sharp'

/**
 * DiffClusteringService - 差异聚类服务
 * 职能：将图像对比产生的成千上万个离散差异像素点，聚合成人类可理解的、具有业务意义的矩形区域。
 * 算法：采用类 DBSCAN 的连通区域增长算法。
 */
class DiffClusteringService {
    /**
     * 构造函数：初始化聚类算法参数
     * @param {Object} options - 可选的算法微调参数
     */
    constructor(options = {}) {
        this.options = {
            minRegionSize: options.minRegionSize || 100,      // 最小有效区域：小于 100 像素的微小噪点将被过滤
            neighborhoodRadius: options.neighborhoodRadius || 10, // 邻域半径：在该像素距离内的差异点会被视为同一区域
            maxRegions: options.maxRegions || 20,           // 最终产出的最大区域数，防止报告过载
            padding: options.padding || 5,                 // 矩形框向外扩张的内边距，使视觉效果更舒适
            ...options
        }
    }

    /**
     * 核心预处理：从差异图片文件中提取所有“红色”差异像素坐标
     * @param {string} diffImagePath - 由 pixelmatch 生成的差异图绝对路径
     * @returns {Promise<Array>} 返回差异像素坐标集合 [{x, y}, ...]
     */
    async extractDiffPixels(diffImagePath) {
        try {
            // 使用 sharp 库以 raw 原始数据格式读取图片，性能最优
            const image = sharp(diffImagePath)
            const { data, info } = await image.raw().toBuffer({ resolveWithObject: true })

            const diffPixels = []
            const { width, height, channels } = info

            // 算法：全图像素扫描（O(N) 复杂度）
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const idx = (y * width + x) * channels
                    const r = data[idx]
                    const g = data[idx + 1]
                    const b = data[idx + 2]

                    /**
                     * 红色差异检测逻辑：
                     * Pixelmatch 工具在标记差异时会将像素染成鲜红色 [255, 0, 0]。
                     * 我们通过高红色通道和较低的绿/蓝通道来精准锁定这些标记。
                     */
                    if (r > 200 && g < 100 && b < 100) {
                        diffPixels.push({ x, y })
                    }
                }
            }

            return diffPixels
        } catch (error) {
            console.error('提取差异像素失败:', error)
            return []
        }
    }

    /**
     * 核心逻辑：将散乱像素聚类为矩形区域
     * 使用了空间索引加速技术。
     * @param {Array} diffPixels - 差异像素数组
     * @returns {Array} 聚类并排序后的区域列表
     */
    clusterDiffRegions(diffPixels) {
        if (!diffPixels || diffPixels.length === 0) {
            return []
        }

        /** 
         * 空间索引加速：
         * 使用 Map 构建坐标到像素的映射，使邻域查找的时间复杂度从 O(N) 降低到近乎 O(1)
         */
        const pixelMap = new Map()
        for (const pixel of diffPixels) {
            const key = `${pixel.x},${pixel.y}`
            pixelMap.set(key, pixel)
        }

        const visited = new Set() // 记录已划归区域的像素
        const clusters = []

        // 算法：深度优先/广度优先区域增长
        for (const pixel of diffPixels) {
            const key = `${pixel.x},${pixel.y}`
            if (visited.has(key)) continue

            // 发起一个新区域的增长探测
            const cluster = this.growRegionOptimized(pixel, pixelMap, visited)

            // 质量控制：仅保留面积达到阈值的有效区域
            if (cluster.length >= this.options.minRegionSize) {
                clusters.push(cluster)
            }
        }

        // 结果转换：将像素集合转换为带坐标和尺寸的矩形对象
        const regions = clusters
            .map(cluster => this.getBoundingBox(cluster))
            .sort((a, b) => b.pixelCount - a.pixelCount) // 优先级：按面积从大到小排序
            .slice(0, this.options.maxRegions) // 截断：仅保留前 N 个最重要的区域

        return regions
    }

    /**
     * 区域增长算法的具体实现
     * @param {Object} seed - 种子像素起点
     * @param {Map} pixelMap - 空间索引映射表
     * @param {Set} visited - 全局访问记录
     * @returns {Array} 属于该连通域的所有像素集合
     */
    growRegionOptimized(seed, pixelMap, visited) {
        const cluster = []
        const queue = [seed] // 使用队列实现 BFS
        const radius = this.options.neighborhoodRadius

        while (queue.length > 0) {
            const pixel = queue.shift()
            const key = `${pixel.x},${pixel.y}`

            if (visited.has(key)) continue

            visited.add(key)
            cluster.push(pixel)

            // 探测当前像素周围的邻域
            for (let dx = -radius; dx <= radius; dx++) {
                for (let dy = -radius; dy <= radius; dy++) {
                    const neighborX = pixel.x + dx
                    const neighborY = pixel.y + dy
                    const neighborKey = `${neighborX},${neighborY}`

                    if (visited.has(neighborKey)) continue
                    if (!pixelMap.has(neighborKey)) continue

                    // 距离检测：仅将半径圆圈内的像素吸收入本区域
                    const distance = Math.sqrt(dx * dx + dy * dy)
                    if (distance <= radius) {
                        queue.push(pixelMap.get(neighborKey))
                    }
                }
            }
        }

        return cluster
    }

    /**
     * 计算聚类的包围盒（Bounding Box）
     * @param {Array} cluster - 属于该区域的像素像素数组
     * @returns {Object} 带有冗余外边距的包围盒数据
     */
    getBoundingBox(cluster) {
        const xs = cluster.map(p => p.x)
        const ys = cluster.map(p => p.y)

        // 计算最小外接矩形，并应用 padding 使标注框不那么局促
        const minX = Math.max(0, Math.min(...xs) - this.options.padding)
        const minY = Math.max(0, Math.min(...ys) - this.options.padding)
        const maxX = Math.max(...xs) + this.options.padding
        const maxY = Math.max(...ys) + this.options.padding

        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
            pixelCount: cluster.length
        }
    }

    /**
     * 核心流程：全自动化执行差异区域分析
     * @param {string} diffImagePath - 待分析的差异图片路径
     * @returns {Promise<Array>} 返回结构化的差异发现结果
     */
    async analyzeDiffRegions(diffImagePath) {
        try {
            // 1. 物理提取：识别所有红色差异像素
            const diffPixels = await this.extractDiffPixels(diffImagePath)
            console.log(`[聚类引擎] 原始差异像素提取总量: ${diffPixels.length}`)

            if (diffPixels.length === 0) {
                return []
            }

            // 2. 空间聚合：基于邻域半径将散点聚集成块
            let regions = this.clusterDiffRegions(diffPixels)

            // 3. 语义合并：将视觉上非常接近（如文字行与行之间）的碎片区域合并为大块
            regions = this.mergeNearbyRegions(regions)

            // 4. 读取元数据：用于计算区域在页面中的相对位置
            const sharp = (await import('sharp')).default
            const { width, height } = await sharp(diffImagePath).metadata()

            // 5. 评价赋能：根据位置、面积、密度为每个区域打分，并生成自然语言描述
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

            // 6. 决策排序：按“重要程度”评分降序排列
            regions.sort((a, b) => b.score - a.score)

            // 7. 智能噪点过滤：移除掉虽然存在差异但业务影响极小的区域
            regions = this.filterRegions(regions)
            console.log(`[聚类引擎] 智能筛选完成，确认 ${regions.length} 个关键差异区域`)

            // 8. 全局编号：重新分配人类友好的 ID
            regions = regions.map((region, index) => ({
                ...region,
                id: index + 1
            }))

            return regions
        } catch (error) {
            console.error('差异区域语义分析链路崩溃:', error)
            return []
        }
    }

    /**
     * 辅助算法：合并物理上极其接近的区域
     * 解决问题：防止一段文字因为行间距导致被切分成多个极小区域
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

                // 计算两个矩形框之间的欧几里得距离
                const distance = this.calculateRegionDistance(current, regions[j])

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
     * 计算两个矩形区域之间的最短真实距离
     */
    calculateRegionDistance(r1, r2) {
        // dx/dy 处理重叠或相离的情况
        const dx = Math.max(0, Math.max(r1.x - (r2.x + r2.width), r2.x - (r1.x + r1.width)))
        const dy = Math.max(0, Math.max(r1.y - (r2.y + r2.height), r2.y - (r1.y + r1.height)))
        return Math.sqrt(dx * dx + dy * dy)
    }

    /**
     * 将两个矩形区域合并为一个包裹它们的大矩形
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
     * 领域模型：优先级评分矩阵计算
     * 评估维度：
     * 1. 垂直位置（30%）：Web 页面首屏/上方权重极高
     * 2. 绝对面积（40%）：面积越大，视觉冲击越大
     * 3. 像素密度（30%）：红点分布越密集，说明差异越扎实，非抗锯齿噪点
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
     * 评分到等级映射
     */
    getPriorityLevel(score) {
        if (score >= 90) return 'critical' // 毁灭性差异
        if (score >= 70) return 'high'     // 显著差异
        if (score >= 50) return 'medium'   // 一般差异
        return 'low'                       // 细微差异
    }

    /**
     * 专家模式：智能过滤低价值差异
     */
    filterRegions(regions) {
        // 面积筛选：移除物理面积过小的极小点
        let filtered = regions.filter(r => r.width * r.height >= 100)

        // 策略：必须展示所有 '关键' 和 '重要' 级别的发现
        const important = filtered.filter(r => r.priority === 'critical' || r.priority === 'high')

        // 策略：对于低评分项，仅挑选最有代表性的几个进行展示，防止用户产生“视觉疲劳”
        const others = filtered.filter(r => r.priority === 'medium' || r.priority === 'low')
            .slice(0, Math.max(5, 15 - important.length))

        filtered = [...important, ...others].slice(0, 15)
        return filtered
    }

    /**
     * 特征提取：识别区域的物理类型
     */
    classifyRegion(region) {
        const area = region.width * region.height
        const aspectRatio = region.width / region.height

        if (aspectRatio > 3 || aspectRatio < 0.33) {
            return 'layout' // 典型的布局/间距差异
        } else if (area > 10000) {
            return 'major'  // 大规模组件/图片缺失
        } else if (area > 1000) {
            return 'medium' // 中型交互元素差异
        } else {
            return 'minor'  // 细微图标/文字像素偏移
        }
    }

    /**
     * 智能生成总结性描述（用于辅助生成测试报告标题）
     */
    generateDescription(region, index, priority = 'medium') {
        const typeLabels = {
            layout: '布局差异',
            major: '主要差异',
            medium: '中等差异',
            minor: '细微差异'
        }

        const priorityLabels = {
            critical: '关键',
            high: '重要',
            medium: '一般',
            low: '次要'
        }

        const typeLabel = typeLabels[region.type] || '差异'
        const priorityLabel = priorityLabels[priority] || ''

        return `${priorityLabel}${typeLabel} #${index} (${region.width}×${region.height}px)`
    }

    /**
     * 视觉呈现：在差异图上通过 SVG 合成绘制红框和数字 ID
     */
    async drawRegionAnnotations(diffImagePath, regions, outputPath) {
        try {
            const image = sharp(diffImagePath)
            const { width, height } = await image.metadata()

            // SVG 矢量绘制逻辑
            const svgOverlays = regions.map((region, index) => {
                const color = this.getRegionColor(region.type)

                return `
          <rect 
            x="${region.x}" 
            y="${region.y}" 
            width="${region.width}" 
            height="${region.height}" 
            fill="none" 
            stroke="${color}" 
            stroke-width="3" 
            stroke-dasharray="5,5"
          />
          <circle 
            cx="${region.x + 15}" 
            cy="${region.y + 15}" 
            r="12" 
            fill="${color}"
          />
          <text 
            x="${region.x + 15}" 
            y="${region.y + 20}" 
            text-anchor="middle" 
            font-size="14" 
            font-weight="bold" 
            fill="white"
          >${region.id}</text>
        `
            }).join('')

            const svg = `<svg width="${width}" height="${height}">${svgOverlays}</svg>`

            // 将 SVG 叠加层压扁合成到图片二进制数据中
            await image
                .composite([{
                    input: Buffer.from(svg),
                    top: 0,
                    left: 0
                }])
                .toFile(outputPath)

            return outputPath
        } catch (error) {
            console.error('绘制差异视觉标注失败:', error)
            throw error
        }
    }

    /**
     * 配色逻辑：根据差异严重等级返回对应的视觉色彩
     */
    getRegionColor(type) {
        const colors = {
            layout: '#FF6B6B',   // 红色 - 核心布局
            major: '#FF8C42',    // 橙色 - 主要结构
            medium: '#FFD93D',   // 黄色 - 中等元素
            minor: '#6BCF7F'     // 绿色 - 次要微调
        }
        return colors[type] || '#6366F1'
    }
}

export default DiffClusteringService
