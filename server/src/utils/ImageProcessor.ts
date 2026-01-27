import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PNG } from 'pngjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * ImageProcessor - 图像处理基础设施类
 * 
 * 职责：
 * 1. 图像规格化：补白对齐。
 * 2. 图像持久化：保存差异图、缩略图生成。
 * 3. 图像编码转换：提供内存 Buffer 与格式化对象之间的转换。
 */
export class ImageProcessor {
    /**
     * 规格化处理：利用 Sharp 进行画布扩展
     * 将图片补白到目标尺寸，不进行拉伸，确保比对像素坐标的一致性
     */
    static async normalizeImage(imagePath: string, targetWidth: number, targetHeight: number): Promise<Buffer> {
        try {
            const metadata = await sharp(imagePath).metadata();
            const extendBottom = targetHeight - (metadata.height || 0);
            const extendRight = targetWidth - (metadata.width || 0);

            return await sharp(imagePath)
                .extend({
                    top: 0,
                    left: 0,
                    bottom: Math.max(0, extendBottom),
                    right: Math.max(0, extendRight),
                    background: { r: 0, g: 0, b: 0, alpha: 0 }
                })
                .png()
                .toBuffer();
        } catch (error: any) {
            throw new Error(`图像规格化失败: ${error.message}`);
        }
    }

    /**
     * 获取图片元数据 (宽高)
     */
    static async getImageMetadata(imagePath: string) {
        return await sharp(imagePath).metadata();
    }

    /**
     * 生成缩略图：将大容量图压缩为 400px WebP
     */
    static async generateThumbnail(fullPath: string): Promise<string | null> {
        try {
            const thumbFilename = path.basename(fullPath).replace(/\.(png|jpg|jpeg)$/, '-thumb.webp');
            const thumbPath = path.join(path.dirname(fullPath), thumbFilename);

            await sharp(fullPath)
                .resize(400, null, { withoutEnlargement: true })
                .webp({ quality: 80 })
                .toFile(thumbPath);

            const isReport = thumbPath.includes('reports');
            return isReport ? `/reports/${thumbFilename}` : `/uploads/${thumbFilename}`;
        } catch (error: any) {
            console.warn('[图像处理] 缩略图引擎异常 (非阻塞):', error.message);
            return null;
        }
    }

    /**
     * 将 PNG 对象保存到磁盘
     */
    static async savePngToDisk(png: any, filepath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            png.pack()
                .pipe(fs.createWriteStream(filepath))
                .on('finish', resolve)
                .on('error', reject);
        });
    }

    /**
     * 获取数据存储根路径 (server/data)
     */
    static getDataDir(subDir: string = ''): string {
        const rootDir = path.resolve(__dirname, '../../data');
        const fullPath = path.join(rootDir, subDir);
        if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
        }
        return fullPath;
    }
}
