import { WebSocketServer, WebSocket } from 'ws';
import { Server as HttpServer } from 'http';

/**
 * WSServer - WebSocket 实时通信服务驱动
 * 职责：管理与前端的长连接，负责将后端的后台审计进度、状态变更实时推送到 UI 界面
 */
export class WSServer {
    private wss: WebSocketServer | null = null;
    private clients: Set<WebSocket> = new Set(); // 维护当前活跃的客户端集合

    /**
     * 初始化 WS 服务并绑定到 HTTP 端口
     */
    initialize(server: HttpServer): void {
        this.wss = new WebSocketServer({ server });

        this.wss.on('connection', (ws: WebSocket) => {
            console.log('[WS] 客户端已连接');
            this.clients.add(ws);

            ws.on('close', () => {
                console.log('[WS] 客户端已断开');
                this.clients.delete(ws);
            });

            ws.on('error', (error: Error) => {
                console.error('[WS] 错误:', error);
                this.clients.delete(ws);
            });

            // 发送握手成功负载
            ws.send(JSON.stringify({ type: 'connected', message: '已连接到 UI-Eye 实时服务' }));
        });

        console.log('[WS] 服务已初始化并在 HTTP 端口运行');
    }

    /**
     * 全量广播原始数据
     */
    broadcast(data: any): void {
        if (!this.wss) return;

        const message = JSON.stringify(data);
        this.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }

    /**
     * 业务广播：发送审计任务进度更新负载
     * @param taskId 任务标识
     * @param type 事件类型 (如 task:progress, task:completed)
     * @param data 业务载荷
     */
    broadcastTaskUpdate(taskId: string | number, type: string, data: any): void {
        console.log(`[WS] 广播任务更新: taskId=${taskId}, type=${type}, clients=${this.clients.size}`);
        this.broadcast({
            taskId,
            type,
            data,
            timestamp: Date.now()
        });
    }
}


const wsServer = new WSServer();
export default wsServer;
