import { ref } from 'vue';

interface WSMessage {
    type: string;
    taskId?: number;
    data?: any;
    timestamp: number;
}

// 全局单例 WebSocket 连接
let globalWs: WebSocket | null = null;
let globalConnected = ref(false);
let globalLastMessage = ref<WSMessage | null>(null);
let retryCount = 0;
const MAX_RETRIES = 5;
let reconnectTimer: NodeJS.Timeout | null = null;

const connect = (url: string) => {
    if (globalWs) {
        // 如果已经有连接且状态正常，直接返回
        if (globalWs.readyState === WebSocket.OPEN || globalWs.readyState === WebSocket.CONNECTING) {
            console.log('WebSocket 已连接或正在连接中，跳过重复连接');
            return;
        }
        globalWs.close();
    }

    console.log(`正在连接 WebSocket: ${url}`);
    const socket = new WebSocket(url);

    socket.onopen = () => {
        console.log('✅ WebSocket 已连接');
        globalConnected.value = true;
        retryCount = 0;
    };

    socket.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            globalLastMessage.value = message;
            console.log('📨 收到 WebSocket 消息:', message);
        } catch (error) {
            console.error('❌ 解析 WebSocket 消息失败:', error);
        }
    };

    socket.onclose = (event) => {
        console.log('🔌 WebSocket 已断开');
        globalConnected.value = false;

        // 自动重连逻辑
        if (!event.wasClean && retryCount < MAX_RETRIES) {
            const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
            console.log(`将在 ${delay}ms 后尝试重连 (${retryCount + 1}/${MAX_RETRIES})...`);

            if (reconnectTimer) clearTimeout(reconnectTimer);
            reconnectTimer = setTimeout(() => {
                retryCount++;
                connect(url);
            }, delay);
        }
    };

    socket.onerror = (error) => {
        console.error('❌ WebSocket 发生错误:', error);
    };

    globalWs = socket;
};

/**
 * WebSocket 连接和消息处理 Hook（单例模式）
 * @param url WebSocket 服务器地址
 */
export function useWebSocket(url: string = `ws://${window.location.hostname}:3000`) {
    // 如果还没有连接，则创建连接
    if (!globalWs || globalWs.readyState === WebSocket.CLOSED) {
        connect(url);
    }

    const sendMessage = (data: any) => {
        if (globalWs && globalConnected.value) {
            globalWs.send(JSON.stringify(data));
        } else {
            console.warn('⚠️ WebSocket 未连接，无法发送消息');
        }
    };

    return {
        connected: globalConnected,
        lastMessage: globalLastMessage,
        sendMessage,
        reconnect: () => connect(url)
    };
}
