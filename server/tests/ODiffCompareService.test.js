import { describe, it, expect, vi } from 'vitest';
import ODiffCompareService from '../server/services/ODiffCompareService.js';
import path from 'path';
import fs from 'fs';

// 模拟 odiff-bin
vi.mock('odiff-bin', () => ({
    compare: vi.fn().mockResolvedValue({
        match: false,
        reason: 'pixel-diff',
        diffCount: 100,
        diffPercentage: 0.05
    })
}));

describe('ODiffCompareService', () => {
    const service = new ODiffCompareService();
    const mockBase = '/path/to/base.png';
    const mockCompare = '/path/to/compare.png';

    it('应该能正确计算相似度', async () => {
        const result = await service.compare(mockBase, mockCompare);

        // 100 - (0.05 * 100) = 95
        expect(result.similarity).toBe(95);
        expect(result.diffPixels).toBe(100);
        expect(result.match).toBe(false);
    });

    it('当图片完全匹配时相似度应为 100', async () => {
        const { compare } = await import('odiff-bin');
        compare.mockResolvedValueOnce({
            match: true,
            diffCount: 0,
            diffPercentage: 0
        });

        const result = await service.compare(mockBase, mockCompare);
        expect(result.similarity).toBe(100);
        expect(result.match).toBe(true);
    });

    it('应该能正确生成差异图路径', async () => {
        const result = await service.compare(mockBase, mockCompare);
        expect(result.diffImage.path).toContain('-diff-odiff.png');
    });
});
