import path from 'path';
import { fileURLToPath } from 'url';

// 处理 ESM 模块下的路径变量
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * DIRS - 物理存储目录定义
 * 修正：确保路径指向 server/data 目录
 */
export const DIRS = {
    UPLOADS: path.join(__dirname, '../../data/uploads'),           // 用户上传的设计稿/素材
    REPORTS: path.join(__dirname, '../../data/reports'),           // 生成的比对报告图
    BATCH_SCREENSHOTS: path.join(__dirname, '../../data/screenshots/batch'), // 批量走查截图
};

/**
 * URL_PREFIXES - Web 访问路径前缀
 */
export const URL_PREFIXES = {
    UPLOADS: '/uploads',
    REPORTS: '/reports',
    BATCH_SCREENSHOTS: '/api/batch/screenshots',
};

/**
 * 职责：确保系统运行所需的物理磁盘目录均已建立
 */
export const ensureAllDirs = (fs: any) => {
    Object.values(DIRS).forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
};

/**
 * 职责：根据文件类型获取完整的物理存储路径
 */
export const getPhysicalPath = (type: keyof typeof DIRS, filename: string) => {
    return path.join(DIRS[type], filename);
};

/**
 * 职责：归一化：将本地物理磁盘路径转换为 Web 前端可直接访问的公开 URL
 */
export const normalizeToPublicUrl = (filePath: string): string => {
    if (!filePath) return filePath;
    const filename = path.basename(filePath);
    const normalized = filePath.replace(/\\/g, '/');

    if (normalized.includes('reports')) return `${URL_PREFIXES.REPORTS}/${filename}`;
    if (normalized.includes('batch')) return `${URL_PREFIXES.BATCH_SCREENSHOTS}/${filename}`;
    return `${URL_PREFIXES.UPLOADS}/${filename}`;
};

/**
 * 职责：解析设计稿来源
 * 兼容：上传的文件 (以 /uploads/ 开头) 或开发者本地的绝对路径
 */
export const resolveDesignPath = (source?: string): string => {
    if (!source) return '';
    if (source.startsWith('/uploads/')) {
        return path.join(DIRS.UPLOADS, path.basename(source));
    }
    return source;
};
