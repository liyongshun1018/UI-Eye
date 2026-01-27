import { WebSocketServer, WebSocket } from 'ws';
import { Server as HttpServer } from 'http';

export class WSServer {
    private wss: WebSocketServer | null = null;
    private clients: Set<WebSocket> = new Set();

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

            ws.send(JSON.stringify({ type: 'connected', message: '已连接到 UI-Eye 实时服务' }));
        });

        console.log('[WS] 服务已初始化并在 HTTP 端口运行');
    }

    broadcast(data: any): void {
        if (!this.wss) return;

        const message = JSON.stringify(data);
        this.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }

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
