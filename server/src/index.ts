import http from 'http';
import app from './app.js';
import { getDatabase } from './db/connection.js';
import { initializeTables } from './db/schema.js';
import wsServer from './infrastructure/ws/WSServer.js';
import { ConfigService } from './infrastructure/config/ConfigService.js';

/**
 * UI-Eye 服务引导程序
 * 职责：按照：读取配置 -> 初始化数据库 -> 绑定通信通道 -> 开启服务器 的顺序启动应用
 */
async function bootstrap() {
    try {
        // 1. 获取全局配置
        const config = ConfigService.getConfig();
        const port = config.PORT;

        console.log('🚀 UI-Eye 后端基座启动中...');

        // 2. 初始化持久层：连接 SQLite 并同步最新的表结构 (Schema)
        const db = getDatabase();
        initializeTables(db);

        // 3. 建立原生 HTTP 服务器实例
        // 目的：为了将 Express (HTTP) 与 WebSocket 服务器挂载在同一个监听端口上
        const server = http.createServer(app);

        // 4. 初始化跨时空通讯：WebSocket 服务器
        // 职责：实现后端任务执行进度 (截图/比对/AI 等) 的准实时推送
        wsServer.initialize(server);

        // 5. 开启端口监听
        server.listen(port, () => {
            console.log(`
  ✅ ==========================================
  UI-Eye Server 启动成功！
  访问地址: http://localhost:${port}
  运行环境: ${config.NODE_ENV}
  调试模式: ${ConfigService.isDevelopment ? '开启' : '关闭'}
  ==============================================
            `);
        });

    } catch (error: any) {
        console.error('❌ 引导程序启动失败，发生致命错误:', error.message);
        process.exit(1); // 发生初始化报错即中止进程
    }
}

// 唤醒引导程序
bootstrap();
