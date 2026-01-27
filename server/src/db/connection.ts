import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// 获取当前文件的路径信息
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 数据库连接管理配置
 * 职责：管理 SQLite 数据库生命周期
 */

// 数据库文件存放路径：项目根目录下的 db/ui-eye.db
const DB_PATH = path.join(__dirname, '../../db/ui-eye.db');

// 递归确保数据库所属目录存在
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// 缓存数据库实例，实现单例模式
let db: Database.Database | null = null;

/**
 * 获取数据库实例 (单例)
 * @returns {Database.Database} better-sqlite3 数据库对象
 */
export function getDatabase(): Database.Database {
    if (!db) {
        db = new Database(DB_PATH);
        // 启用 WAL (Write-Ahead Logging) 模式，显著提升并发读写性能
        db.pragma('journal_mode = WAL');
    }
    return db;
}

/**
 * 安全关闭数据库连接
 * 职责：释放文件句柄，防止数据损坏
 */
export function closeDatabase(): void {
    if (db) {
        db.close();
        db = null;
        console.log('[数据库] 连接已安全关闭');
    }
}

/**
 * 注册进程生命周期钩子
 * 确保在程序崩溃或被手动停止时，数据库能够正常持久化
 */
process.on('exit', closeDatabase);
process.on('SIGINT', () => {
    closeDatabase();
    process.exit(0);
});

export default {
    getDatabase,
    closeDatabase
};
