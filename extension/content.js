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

// 核心资产：Canvas 局部像素裁剪与全页拼接算法
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "CROP_IMAGE") {
        // 收到背景脚本传回的全屏截图，开始按矩形坐标进行精细裁剪
        cropImage(request.fullScreenshot, request.rect, request.dpr).then(croppedBase64 => {
            sendResponse({ status: "success", croppedBase64 });
        });
        return true; // 异步响应标志
    } else if (request.action === "CAPTURE_FULL_PAGE") {
        // 启动全页滚动截图
        captureFullPage().then(fullPageImage => {
            sendResponse({ status: "success", fullPageImage, url: window.location.href });
        }).catch(err => {
            sendResponse({ status: "error", error: err.message });
        });
        return true;
    }
});

/**
 * 通用消息发送包装器，支持 Promise 和错误检测
 */
async function sendMessageAsync(message) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, (response) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }
            resolve(response);
        });
    });
}

/**
 * 辅助函数：临时隐藏/恢复页面上的固定定位元素
 * 目的：防止 Sticky/Fixed 元素在长图截取时每一帧都重复出现
 */
function toggleFixedElements(hide) {
    const selector = 'fixed, sticky'; // 用于日志
    const elements = document.querySelectorAll('*');
    elements.forEach(el => {
        const style = window.getComputedStyle(el);
        if (style.position === 'fixed' || style.position === 'sticky') {
            if (hide) {
                // 仅对可见元素操作，存储原始 display
                if (style.display !== 'none') {
                    el.setAttribute('data-ui-eye-original-display', el.style.display);
                    el.style.display = 'none';
                }
            } else {
                // 恢复原始 display
                if (el.hasAttribute('data-ui-eye-original-display')) {
                    el.style.display = el.getAttribute('data-ui-eye-original-display');
                    el.removeAttribute('data-ui-eye-original-display');
                }
            }
        }
    });
}

/**
 * 全页截图核心流程控制 (深度优化版)
 * 采用“动态步长校准”算法，解决空白缝隙与重复遮挡问题
 */
async function captureFullPage() {
    return new Promise(async (resolve, reject) => {
        try {
            const originalScrollPos = window.scrollY;
            const fullHeight = Math.max(
                document.documentElement.scrollHeight,
                document.body.scrollHeight,
                document.documentElement.offsetHeight
            );
            const logicalWidth = window.innerWidth;

            // 1. 预处理：隐藏固定定位元素
            toggleFixedElements(true);

            // 2. 辅助函数：带重试的快照获取
            const captureWithRetry = async (frameIndex, maxRetries = 3) => {
                for (let i = 0; i < maxRetries; i++) {
                    try {
                        const response = await sendMessageAsync({ type: "CAPTURE_VISIBLE_PART" });
                        if (response && response.dataUrl) return response.dataUrl;
                    } catch (e) {
                        console.warn(`[UI-Eye] 帧 ${frameIndex} 尝试 ${i + 1} 异常:`, e);
                    }
                    await new Promise(r => setTimeout(r, 400 * (i + 1)));
                }
                return null;
            };

            // 3. 校准阶段：获取第一帧并测算【物理像素高度】与【逻辑缩放比】
            const firstFrameBase64 = await captureWithRetry(0);
            if (!firstFrameBase64) throw new Error("校准帧获取失败");

            const captureAttrs = await new Promise((res) => {
                const img = new Image();
                img.onload = () => {
                    const ratio = img.width / logicalWidth;
                    // 核心：基于实际图片像素推导逻辑上的采集高度
                    const logicalCaptureHeight = img.height / ratio;
                    res({ ratio, logicalCaptureHeight });
                };
                img.src = firstFrameBase64;
            });

            const { ratio, logicalCaptureHeight } = captureAttrs;
            // 步长留出 5% 的重叠区域，确保拼接处无缝衔接
            const overlap = 20; // 20px 重叠余裕
            const scrollStep = logicalCaptureHeight - (overlap / ratio);

            console.log(`[UI-Eye] 校准完成: 采集高度=${logicalCaptureHeight}, 步长=${scrollStep}, 比率=${ratio}`);

            const canvas = document.createElement('canvas');
            canvas.width = logicalWidth * ratio;
            canvas.height = fullHeight * ratio;
            const ctx = canvas.getContext('2d');

            let currentScrollY = 0;
            let frameIdx = 0;

            // 4. 采集循环
            while (currentScrollY < fullHeight) {
                window.scrollTo(0, currentScrollY);
                // 针对移动端模拟器，增加微小延迟确保渲染就绪
                await new Promise(r => setTimeout(r, 400));

                const base64 = await captureWithRetry(frameIdx + 1);
                if (!base64) break;

                await new Promise((resolveDraw) => {
                    const img = new Image();
                    img.onload = () => {
                        const actualScrollY = window.scrollY;
                        // 计算源图裁剪位置：如果滚动不到位（触底），需要从图片底部向上采样
                        const sourceY = Math.max(0, (currentScrollY - actualScrollY) * ratio);

                        let drawHeight = logicalCaptureHeight;
                        if (currentScrollY + logicalCaptureHeight > fullHeight) {
                            drawHeight = fullHeight - currentScrollY;
                        }

                        ctx.drawImage(
                            img,
                            0, sourceY,
                            img.width, drawHeight * ratio,
                            0, currentScrollY * ratio,
                            img.width, drawHeight * ratio
                        );
                        resolveDraw();
                    };
                    img.src = base64;
                });

                currentScrollY += scrollStep;
                frameIdx++;
                if (frameIdx > 150) break; // 安全熔断
            }

            // 5. 收尾：恢复现场
            toggleFixedElements(false);
            window.scrollTo(0, originalScrollPos);

            resolve(canvas.toDataURL('image/png'));
        } catch (err) {
            console.error("[UI-Eye] 级联捕获崩溃:", err);
            toggleFixedElements(false);
            reject(err);
        }
    });
}

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
