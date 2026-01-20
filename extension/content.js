/**
 * UI-Eye Interactive Content Script (UX 极致优化版)
 * 核心任务：实现激活式的“查眼”捕获模式。
 * 优化重点：消除了强制蓝框干扰，改为 S 键唤醒。
 */

let lastInspectedElement = null; // 当前光标下的 DOM 元素引用
let isInspectionActive = false; // 捕获模式开关状态

// 1. 实现视觉高亮遮罩层 (蓝框)
const overlay = document.createElement('div');
overlay.id = 'ui-eye-inspection-overlay';
Object.assign(overlay.style, {
    position: 'absolute',
    border: '2px solid #1890ff',
    backgroundColor: 'rgba(24, 144, 255, 0.2)',
    pointerEvents: 'none',
    zIndex: '2147483647',
    display: 'none',
    boxShadow: '0 0 8px rgba(24, 144, 255, 0.5)',
    transition: 'all 0.1s ease-out'
});
document.body.appendChild(overlay);

// 2. 注入操作引导浮窗 (HUD)
const hud = document.createElement('div');
hud.id = 'ui-eye-hud';
Object.assign(hud.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    padding: '10px 16px',
    background: '#1a1a1a',
    color: 'white',
    borderRadius: '8px',
    fontSize: '13px',
    zIndex: '2147483647',
    display: 'none',
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
    fontFamily: 'sans-serif',
    pointerEvents: 'none'
});
hud.innerHTML = `<strong>UI-Eye 截屏模式</strong><br><span style="color: #aaa; font-size: 11px;">点击元素：捕获区域 | ESC：退出</span>`;
document.body.appendChild(hud);

/**
 * 切换查验模式激活状态
 * @param {boolean} active - 激活为 true，取消为 false
 */
function toggleInspection(active) {
    isInspectionActive = active;
    if (!active) {
        overlay.style.display = 'none';
        hud.style.display = 'none';
        document.body.style.cursor = 'default';
        // 同步通知后台：清除高亮
        chrome.runtime.sendMessage({ type: "SET_INSPECTION_STATUS", active: false });
    } else {
        hud.style.display = 'block';
        document.body.style.cursor = 'crosshair'; // 激活模式下鼠标变十字准星
        // 同步通知后台：显示高亮 (ON)
        chrome.runtime.sendMessage({ type: "SET_INSPECTION_STATUS", active: true });
    }
}

// 监听鼠标移动：实时计算并渲染跟随蓝框 (仅在模式激活时工作)
document.addEventListener('mouseover', (e) => {
    if (!isInspectionActive || e.target === overlay) return;

    const rect = e.target.getBoundingClientRect();
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
    overlay.style.top = `${rect.top + window.scrollY}px`;
    overlay.style.left = `${rect.left + window.scrollX}px`;
    overlay.style.display = 'block';

    lastInspectedElement = e.target;
}, true);

// 监听点击捕捉：点击即代表锁定当前选择区域
document.addEventListener('click', (e) => {
    if (isInspectionActive) {
        e.preventDefault();
        e.stopPropagation();
        if (lastInspectedElement) {
            startVisualCapture(lastInspectedElement);
            toggleInspection(false); // 捕获成功后自动收起模式
        }
    }
}, true);

// 全局快捷键监听 (通过 capture: true 提高捕获优先级)
document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();

    // 调试辅助信息
    if (key === 's') {
        console.log("UI-Eye DEBUG: Detected 'S' key press in Content Script. Active status:", isInspectionActive);
    }

    // 按 'S' 键：通过键盘激活/取消捕获准星
    if (key === 's' && !isInspectionActive) {
        // 安全拦截：如果在输入框、文本域或富文本编辑器中正在打字，则不触发插件
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) || document.activeElement.isContentEditable) {
            console.log("UI-Eye: 'S' key ignored because an input element is focused.");
            return;
        }
        toggleInspection(true);
        e.preventDefault(); // 关键：阻止按键在页面上产生默认字符输入或其他副作用
        e.stopPropagation();
    }

    // 按 'ESC' 或再次按 'S'：即刻强制退出捕获状态
    else if ((key === 'escape' || key === 's') && isInspectionActive) {
        toggleInspection(false);
        e.preventDefault();
        e.stopPropagation();
    }
}, true); // 开启第三参数 true，确保在任何业务劫持之前拿下事件

/**
 * 业务逻辑：启动视觉捕获流
 * 包括：元数据提取 -> 背景快照消息通信 -> 局部像素裁剪
 */
function startVisualCapture(el) {
    console.log("UI-Eye: 正在启动组件捕获:", el.tagName);
    const styles = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();

    // 提取关键 CSS 数据，作为 AI 的诊断输入
    const styleData = {
        tagName: el.tagName,
        color: styles.color,
        backgroundColor: styles.backgroundColor,
        fontSize: styles.fontSize,
        fontWeight: styles.fontWeight,
        padding: styles.padding,
        margin: styles.margin,
        borderRadius: styles.borderRadius,
        boxShadow: styles.boxShadow,
        display: styles.display
    };

    // 发送捕获请求至后台脚本 (Background Script)
    chrome.runtime.sendMessage({
        type: "INITIATE_CAPTURE",
        payload: {
            styles: styleData,
            rect: {
                x: rect.left,
                y: rect.top,
                width: rect.width,
                height: rect.height
            },
            dpr: window.devicePixelRatio,
            title: document.title,
            url: window.location.href
        }
    });

    // 视觉反馈：捕获瞬间蓝框闪烁
    overlay.style.borderColor = '#52c41a';
    setTimeout(() => {
        overlay.style.borderColor = '#1890ff';
        overlay.style.display = 'none';
    }, 200);
}

// 核心资产：Canvas 局部像素裁剪算法
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "CROP_IMAGE") {
        // 收到背景脚本传回的全屏截图，开始按矩形坐标进行精细裁剪
        cropImage(request.fullScreenshot, request.rect, request.dpr).then(croppedBase64 => {
            sendResponse({ status: "success", croppedBase64 });
        });
        return true; // 异步响应标志
    }
});

/**
 * 利用 Canvas 技术执行图像局部提取
 * @param {string} base64 - 原始全屏图 Base64
 * @param {object} rect - 目标矩形区域
 * @param {number} dpr - 设备像素比 (用于解决 retina 屏模糊问题)
 */
async function cropImage(base64, rect, dpr) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // 计算渲染像素：逻辑坐标 * DPR
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;

            ctx.drawImage(
                img,
                rect.x * dpr, rect.y * dpr, // 源图坐标轴补偿
                rect.width * dpr, rect.height * dpr, // 源图采样尺寸
                0, 0, // 目标绘制坐标
                rect.width * dpr, rect.height * dpr // 目标绘制尺寸
            );
            resolve(canvas.toDataURL('image/png'));
        };
        img.src = base64;
    });
}
