import { ref, onMounted, onUnmounted } from 'vue';

interface WSMessage {
    type: string;
    taskId?: number;
    data?: any;
    timestamp: number;
}

/**
 * WebSocket 连接和消息处理 Hook
 * @param url WebSocket 服务器地址
 */
export function useWebSocket(url: string = `ws://${window.location.hostname}:3000`) {
    const ws = ref<WebSocket | null>(null);
    const connected = ref(false);
    const lastMessage = ref<WSMessage | null>(null);
    const retryCount = ref(0);
    const MAX_RETRIES = 5;

    const connect = () => {
        if (ws.value) {
            ws.value.close();
        }

        console.log(`正在连接 WebSocket: ${url}`);
        const socket = new WebSocket(url);

        socket.onopen = () => {
            console.log('✅ WebSocket 已连接');
            connected.value = true;
            retryCount.value = 0;
        };

        socket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                lastMessage.value = message;
                console.log('📨 收到 WebSocket 消息:', message);
            } catch (error) {
                console.error('❌ 解析 WebSocket 消息失败:', error);
            }
        };

        socket.onclose = (event) => {
            console.log('🔌 WebSocket 已断开');
            connected.value = false;

            // 自动重连逻辑
            if (!event.wasClean && retryCount.value < MAX_RETRIES) {
                const delay = Math.min(1000 * Math.pow(2, retryCount.value), 30000);
                console.log(`将在 ${delay}ms 后尝试重连 (${retryCount.value + 1}/${MAX_RETRIES})...`);
                setTimeout(() => {
                    retryCount.value++;
                    connect();
                }, delay);
            }
        };

        socket.onerror = (error) => {
            console.error('❌ WebSocket 发生错误:', error);
        };

        ws.value = socket;
    };

    const sendMessage = (data: any) => {
        if (ws.value && connected.value) {
            ws.value.send(JSON.stringify(data));
        } else {
            console.warn('⚠️ WebSocket 未连接，无法发送消息');
        }
    };

    onMounted(() => {
        connect();
    });

    onUnmounted(() => {
        if (ws.value) {
            ws.value.close(1000, '组件卸载');
        }
    });

    return {
        connected,
        lastMessage,
        sendMessage,
        reconnect: connect
    };
}
