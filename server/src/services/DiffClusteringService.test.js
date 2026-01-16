import { describe, it, expect } from 'vitest'
import DiffClusteringService from './DiffClusteringService'

describe('DiffClusteringService', () => {
    const service = new DiffClusteringService({
        minRegionSize: 1, // 降低门槛以便测试
        neighborhoodRadius: 5,
        padding: 5
    })

    it('should group adjacent pixels into regions', () => {
        const mockPixels = [
            { x: 10, y: 10 },
            { x: 11, y: 10 },
            { x: 50, y: 50 }
        ]

        // 调用类方法
        const regions = service.clusterDiffRegions(mockPixels)

        // 期望：(10,10)和(11,10)相邻被合并，(50,50)独立
        expect(regions.length).toBe(2)
    })

    it('should calculate correct bounding box with padding', () => {
        const mockPixels = [
            { x: 10, y: 10 }
        ]
        const regions = service.clusterDiffRegions(mockPixels)
        const region = regions[0]

        // padding 为 5
        // minX = Math.max(0, 10 - 5) = 5
        // maxX = 10 + 5 = 15
        // width = 15 - 5 = 10
        expect(region.x).toBe(5)
        expect(region.width).toBe(10)
    })
})
