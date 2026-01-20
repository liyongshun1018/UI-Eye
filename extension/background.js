/**
 * UI-Eye Background Service (Orchestrator)
 */

let lastCaptureCache = null;

chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "ui-eye-inspector",
        title: "启动 UI-Eye 交互走查面板",
        contexts: ["all"]
    });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "INITIATE_CAPTURE") {
        handleCaptureSequence(sender.tab.id, message.payload);
        sendResponse({ status: "acked" });
    } else if (message.type === "GET_LAST_CAPTURE") {
        sendResponse({ data: lastCaptureCache });
    } else if (message.type === "SYNC_CACHE") {
        // 接收来自 Popup 的主动截屏数据并同步到全局变量
        lastCaptureCache = message.data;
        sendResponse({ status: "synced" });
    } else if (message.type === "SET_INSPECTION_STATUS") {
        // 核心视觉反馈：切换图标颜色 + 显示角标
        // 兼容处理：Sender 可能来自 content_script (带 tab) 或 popup (不带 tab)
        const resolveTabId = async () => {
            if (sender.tab) return sender.tab.id;
            const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
            return tab?.id;
        };

        resolveTabId().then(tabId => {
            if (!tabId) return;
            if (message.active) {
                chrome.action.setIcon({
                    tabId,
                    path: {
                        "16": "icons/icon16_active.png",
                        "48": "icons/icon48_active.png",
                        "128": "icons/icon128_active.png"
                    }
                });
                // 移除遮挡图标的 'ON' 文本，仅保留图标变色作为反馈
                chrome.action.setBadgeText({ text: '', tabId });
            } else {
                chrome.action.setIcon({
                    tabId,
                    path: {
                        "16": "icons/icon16_inactive.png",
                        "48": "icons/icon48_inactive.png",
                        "128": "icons/icon128_inactive.png"
                    }
                });
                chrome.action.setBadgeText({ text: '', tabId });
            }
        });
        sendResponse({ status: "visual_status_updated" });
    }
    return true;
});

/**
 * 协调捕获序列：捕获 -> 发回裁剪 -> 获取局部结果
 */
async function handleCaptureSequence(tabId, payload) {
    try {
        const fullScreenshot = await chrome.tabs.captureVisibleTab(null, { format: "png" });

        chrome.tabs.sendMessage(tabId, {
            action: "CROP_IMAGE",
            fullScreenshot,
            rect: payload.rect,
            dpr: payload.dpr
        }, (response) => {
            if (response && response.status === "success") {
                const finalPackage = {
                    ...payload,
                    croppedImage: response.croppedBase64,
                    timestamp: Date.now()
                };
                lastCaptureCache = finalPackage;
            }
        });
    } catch (err) {
        console.error("Capture Orchestration Error:", err);
    }
}
