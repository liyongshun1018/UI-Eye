import sharp from 'sharp'

/**
 * 差异聚类服务
 * 将散落的差异像素聚合成有意义的矩形区域
 * 使用连通区域算法（简化版 DBSCAN）
 */
class DiffClusteringService {
    /**
     * 构造函数
     * @param {Object} options - 配置选项
     */
    constructor(options = {}) {
        this.options = {
            minRegionSize: options.minRegionSize || 100, // 最小区域大小（像素数）
            neighborhoodRadius: options.neighborhoodRadius || 10, // 邻域半径
            maxRegions: options.maxRegions || 20, // 最大区域数
            padding: options.padding || 5, // 区域边界扩展像素
            ...options
        }
    }

    /**
     * 从差异图中提取差异像素坐标
     * @param {string} diffImagePath - 差异图路径
     * @returns {Promise<Array>} 差异像素坐标数组 [{x, y}]
     */
    async extractDiffPixels(diffImagePath) {
        try {
            const image = sharp(diffImagePath)
            const { data, info } = await image.raw().toBuffer({ resolveWithObject: true })

            const diffPixels = []
            const { width, height, channels } = info

            // 遍历所有像素，找出红色标记的差异点
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const idx = (y * width + x) * channels
                    const r = data[idx]
                    const g = data[idx + 1]
                    const b = data[idx + 2]

                    // 检测红色差异标记（Pixelmatch 使用红色标记差异）
                    // 红色通道高，绿色和蓝色通道低
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
     * 聚类差异像素为区域（优化版）
     * @param {Array} diffPixels - 差异像素数组
     * @returns {Array} 聚类后的区域 [{x, y, width, height, pixelCount}]\n     */
    clusterDiffRegions(diffPixels) {
        if (!diffPixels || diffPixels.length === 0) {
            return []
        }

        // 创建空间索引以加速邻域查找
        const pixelMap = new Map()
        for (const pixel of diffPixels) {
            const key = `${pixel.x},${pixel.y}`
            pixelMap.set(key, pixel)
        }

        const visited = new Set()
        const clusters = []

        // 对每个未访问的像素进行区域增长
        for (const pixel of diffPixels) {
            const key = `${pixel.x},${pixel.y}`
            if (visited.has(key)) continue

            const cluster = this.growRegionOptimized(pixel, pixelMap, visited)

            // 过滤掉太小的区域
            if (cluster.length >= this.options.minRegionSize) {
                clusters.push(cluster)
            }
        }

        // 转换为矩形边界框
        const regions = clusters
            .map(cluster => this.getBoundingBox(cluster))
            .sort((a, b) => b.pixelCount - a.pixelCount) // 按大小排序
            .slice(0, this.options.maxRegions) // 限制最大区域数

        return regions
    }

    /**
     * 区域增长算法（优化版，使用空间索引）
     * @param {Object} seed - 种子像素 {x, y}
     * @param {Map} pixelMap - 像素空间索引
     * @param {Set} visited - 已访问像素集合
     * @returns {Array} 聚类像素数组
     */
    growRegionOptimized(seed, pixelMap, visited) {
        const cluster = []
        const queue = [seed]
        const radius = this.options.neighborhoodRadius

        while (queue.length > 0) {
            const pixel = queue.shift()
            const key = `${pixel.x},${pixel.y}`

            if (visited.has(key)) continue

            visited.add(key)
            cluster.push(pixel)

            // 只检查邻域内的像素（使用空间索引）
            for (let dx = -radius; dx <= radius; dx++) {
                for (let dy = -radius; dy <= radius; dy++) {
                    const neighborX = pixel.x + dx
                    const neighborY = pixel.y + dy
                    const neighborKey = `${neighborX},${neighborY}`

                    if (visited.has(neighborKey)) continue
                    if (!pixelMap.has(neighborKey)) continue

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
     * 计算聚类的包围盒
     * @param {Array} cluster - 聚类像素数组
     * @returns {Object} 包围盒 {x, y, width, height, pixelCount}
     */
    getBoundingBox(cluster) {
        const xs = cluster.map(p => p.x)
        const ys = cluster.map(p => p.y)

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
     * 完整的差异区域分析流程
     * @param {string} diffImagePath - 差异图路径
     * @returns {Promise<Array>} 差异区域数组
     */
    async analyzeDiffRegions(diffImagePath) {
        try {
            // 1. 提取差异像素
            const diffPixels = await this.extractDiffPixels(diffImagePath)
            console.log(`[聚类] 提取到 ${diffPixels.length} 个差异像素`)

            if (diffPixels.length === 0) {
                return []
            }

            // 2. 聚类为区域
            let regions = this.clusterDiffRegions(diffPixels)

            // 3. 智能区域合并（减少碎片化）
            regions = this.mergeNearbyRegions(regions)

            // 4. 获取图片尺寸用于优先级计算
            const sharp = (await import('sharp')).default
            const { width, height } = await sharp(diffImagePath).metadata()

            // 5. 计算优先级和评分
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

            // 6. 按优先级排序
            regions.sort((a, b) => b.score - a.score)

            // 7. 智能过滤（保留重要区域）
            regions = this.filterRegions(regions)
            console.log(`[聚类] 完成，最终 ${regions.length} 个区域`)

            // 8. 重新分配 ID
            regions = regions.map((region, index) => ({
                ...region,
                id: index + 1
            }))

            return regions
        } catch (error) {
            console.error('差异区域分析失败:', error)
            return []
        }
    }

    /**
     * 合并相邻区域
     * @param {Array} regions - 区域列表
     * @param {number} maxDistance - 最大合并距离
     * @returns {Array} 合并后的区域
     */
    mergeNearbyRegions(regions, maxDistance = 50) {
        if (regions.length <= 1) return regions

        const merged = []
        const used = new Set()

        for (let i = 0; i < regions.length; i++) {
            if (used.has(i)) continue

            let current = { ...regions[i] }

            // 查找可合并的区域
            for (let j = i + 1; j < regions.length; j++) {
                if (used.has(j)) continue

                const distance = this.calculateRegionDistance(current, regions[j])

                if (distance < maxDistance) {
                    // 合并两个区域
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
     * 计算两个区域之间的距离
     * @param {Object} r1 - 区域1
     * @param {Object} r2 - 区域2
     * @returns {number} 距离
     */
    calculateRegionDistance(r1, r2) {
        // 计算两个矩形的最短距离
        const dx = Math.max(0, Math.max(r1.x - (r2.x + r2.width), r2.x - (r1.x + r1.width)))
        const dy = Math.max(0, Math.max(r1.y - (r2.y + r2.height), r2.y - (r1.y + r1.height)))
        return Math.sqrt(dx * dx + dy * dy)
    }

    /**
     * 合并两个区域
     * @param {Object} r1 - 区域1
     * @param {Object} r2 - 区域2
     * @returns {Object} 合并后的区域
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
     * 计算区域优先级评分
     * @param {Object} region - 区域
     * @param {number} imageHeight - 图片高度
     * @param {number} totalPixels - 总像素数
     * @returns {number} 评分 (0-100)
     */
    calculatePriorityScore(region, imageHeight, totalPixels) {
        // 1. 位置分数（0-30）- 页面上方更重要
        const positionScore = (1 - region.y / imageHeight) * 30

        // 2. 尺寸分数（0-40）- 大区域更重要
        const area = region.width * region.height
        const sizeScore = Math.min((area / totalPixels) * 1000, 40)

        // 3. 密度分数（0-30）- 密集差异更重要
        const density = region.pixelCount / area
        const densityScore = density * 30

        return positionScore + sizeScore + densityScore
    }

    /**
     * 获取优先级等级
     * @param {number} score - 评分
     * @returns {string} 优先级等级
     */
    getPriorityLevel(score) {
        if (score >= 90) return 'critical'
        if (score >= 70) return 'high'
        if (score >= 50) return 'medium'
        return 'low'
    }

    /**
     * 智能过滤区域
     * @param {Array} regions - 区域列表
     * @returns {Array} 过滤后的区域
     */
    filterRegions(regions) {
        // 1. 移除过小区域（面积 < 100px²）
        let filtered = regions.filter(r => r.width * r.height >= 100)

        // 2. 保留所有 critical 和 high 优先级
        const important = filtered.filter(r => r.priority === 'critical' || r.priority === 'high')

        // 3. 从 medium 和 low 中选择前几个
        const others = filtered.filter(r => r.priority === 'medium' || r.priority === 'low')
            .slice(0, Math.max(5, 15 - important.length))

        // 4. 合并并限制最大数量
        filtered = [...important, ...others].slice(0, 15)

        return filtered
    }

    /**
     * 分类区域类型
     * @param {Object} region - 区域信息
     * @returns {string} 区域类型
     */
    classifyRegion(region) {
        const area = region.width * region.height
        const aspectRatio = region.width / region.height

        // 根据形状和大小分类
        if (aspectRatio > 3 || aspectRatio < 0.33) {
            return 'layout' // 布局差异（长条形）
        } else if (area > 10000) {
            return 'major' // 主要差异（大区域）
        } else if (area > 1000) {
            return 'medium' // 中等差异
        } else {
            return 'minor' // 细微差异
        }
    }

    /**
     * 生成区域描述
     * @param {Object} region - 区域信息
     * @param {number} index - 区域编号
     * @param {string} priority - 优先级
     * @returns {string} 描述文本
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
     * 在差异图上绘制区域标注
     * @param {string} diffImagePath - 差异图路径
     * @param {Array} regions - 差异区域数组
     * @param {string} outputPath - 输出路径
     * @returns {Promise<string>} 标注后的图片路径
     */
    async drawRegionAnnotations(diffImagePath, regions, outputPath) {
        try {
            const image = sharp(diffImagePath)
            const { width, height } = await image.metadata()

            // 创建 SVG 叠加层
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

            const svg = `
        <svg width="${width}" height="${height}">
          ${svgOverlays}
        </svg>
      `

            // 叠加 SVG 到图片上
            await image
                .composite([{
                    input: Buffer.from(svg),
                    top: 0,
                    left: 0
                }])
                .toFile(outputPath)

            return outputPath
        } catch (error) {
            console.error('绘制区域标注失败:', error)
            throw error
        }
    }

    /**
     * 获取区域颜色
     * @param {string} type - 区域类型
     * @returns {string} 颜色值
     */
    getRegionColor(type) {
        const colors = {
            layout: '#FF6B6B',   // 红色 - 布局差异
            major: '#FF8C42',    // 橙色 - 主要差异
            medium: '#FFD93D',   // 黄色 - 中等差异
            minor: '#6BCF7F'     // 绿色 - 细微差异
        }
        return colors[type] || '#6366F1'
    }
}

export default DiffClusteringService
