import { WebSocketServer } from 'ws';

/**
 * WebSocket 服务器管理器
 */
class WSServer {
    constructor() {
        this.wss = null;
        this.clients = new Set();
    }

    /**
     * 初始化 WebSocket 服务器
     * @param {Object} server - HTTP 服务器实例
     */
    init(server) {
        this.wss = new WebSocketServer({ server });

        this.wss.on('connection', (ws) => {
            console.log('WebSocket 客户端已连接');
            this.clients.add(ws);

            ws.on('close', () => {
                console.log('WebSocket 客户端已断开');
                this.clients.delete(ws);
            });

            ws.on('error', (error) => {
                console.error('WebSocket 错误:', error);
                this.clients.delete(ws);
            });

            // 发送欢迎消息或当前状态（可选）
            ws.send(JSON.stringify({ type: 'connected', message: '已连接到 UI-Eye 实时服务' }));
        });

        console.log('WebSocket 服务已初始化并在 HTTP 端口运行');
    }

    /**
     * 广播消息给所有连线的客户端
     * @param {Object} data - 要发送的数据对象
     */
    broadcast(data) {
        if (!this.wss) return;

        const message = JSON.stringify(data);
        this.clients.forEach((client) => {
            if (client.readyState === 1) { // 1 = OPEN
                client.send(message);
            }
        });
    }

    /**
     * 向特定任务 ID 广播（可选优化）
     * 目前简单起见使用全量广播
     */
    broadcastTaskUpdate(taskId, type, data) {
        this.broadcast({
            taskId,
            type,
            data,
            timestamp: Date.now()
        });
    }
}

// 单例模式
const wsServer = new WSServer();
export default wsServer;
