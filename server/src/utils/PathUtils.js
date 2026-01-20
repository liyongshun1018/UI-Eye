import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 确保所有必要的目录都存在
 */
export const ensureAllDirs = () => {
    Object.values(DIRS).forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
};

/**
 * DATA_ROOT 指向 server/data 目录
 * 所有的持久化数据都应存储在此目录下
 */
const DATA_ROOT = path.join(__dirname, '../../data');

export const DIRS = {
    UPLOADS: path.join(DATA_ROOT, 'uploads'),
    REPORTS: path.join(DATA_ROOT, 'reports'),
    BATCH_SCREENSHOTS: path.join(DATA_ROOT, 'screenshots/batch'),
    AUTH_STATES: path.join(DATA_ROOT, 'auth-states'),
    SCRIPTS: path.join(DATA_ROOT, 'scripts'),
    TEMP: path.join(DATA_ROOT, 'temp')
};

export const URL_PREFIXES = {
    UPLOADS: '/uploads/',
    REPORTS: '/reports/',
    BATCH_SCREENSHOTS: '/api/batch/screenshots/'
};

/**
 * 获取文件的物理绝对路径
 * @param {string} type - 目录类型 (UPLOADS/REPORTS/BATCH_SCREENSHOTS/...)
 * @param {string} filename - 文件名
 * @returns {string} 绝对路径
 */
export const getPhysicalPath = (type, filename) => {
    const dir = DIRS[type.toUpperCase()];
    if (!dir) throw new Error(`Unknown directory type: ${type}`);
    return path.join(dir, filename);
};

/**
 * 获取文件的公开访问 URL
 * @param {string} type - 目录类型
 * @param {string} filename - 文件名
 * @returns {string} 访问 URL
 */
export const getPublicUrl = (type, filename) => {
    const prefix = URL_PREFIXES[type.toUpperCase()];
    if (!prefix) throw new Error(`Unknown URL prefix type: ${type}`);
    return `${prefix}${filename}`;
};

/**
 * 解析各种来源的设计稿路径，返回物理路径
 * @param {string} designSource - 来源（可能是文件名、URL 或路径）
 * @returns {string} 物理路径
 */
export const resolveDesignPath = (designSource) => {
    if (!designSource) return null;

    // 如果已经是绝对路径
    if (path.isAbsolute(designSource)) return designSource;

    // 如果是以 /uploads/ 开头的 web 路径
    if (designSource.startsWith('/uploads/')) {
        return path.join(DIRS.UPLOADS, path.basename(designSource));
    }

    // 如果只是文件名
    return path.join(DIRS.UPLOADS, designSource);
};

/**
 * 核心工具：规范化图片路径用于前端显示
 * 业务逻辑：将后端的物理绝对路径（如 /Users/xxx/data/uploads/abc.png）
 * 安全地转换为前端通过 Vite 代理或静态服务可访问的 Web URL。
 * @param {string} filePath - 原始路径（物理或逻辑路径）
 * @returns {string|null} 转换后的 Web 访问路径
 */
export const normalizeToPublicUrl = (filePath) => {
    if (!filePath) return null;

    // 1. 如果已经是完整的外部 HTTP/HTTPS 链接，直接保持原样返回
    if (filePath.startsWith('http')) return filePath;

    const filename = path.basename(filePath);

    // 2. 特征工程：根据路径中包含的“特征目录名”来自动识别并匹配其所属的 Web Prefix
    if (filePath.includes('reports')) return getPublicUrl('REPORTS', filename);
    if (filePath.includes('screenshots/batch')) return getPublicUrl('BATCH_SCREENSHOTS', filename);
    if (filePath.includes('uploads')) return getPublicUrl('UPLOADS', filename);

    // 3. 容错回退逻辑：
    // 如果是绝对路径但未匹配到上述已知目录，则维持原样（可能涉及后端内部私有处理）
    // 如果是相对路径，出于安全和通用性考虑，默认按“上传目录”的前缀进行渲染
    return path.isAbsolute(filePath) ? filePath : getPublicUrl('UPLOADS', filename);
};
