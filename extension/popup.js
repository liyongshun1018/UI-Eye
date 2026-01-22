/**
 * UI-Eye Popup Logic (组件化查验与平台深度联动版)
 * 核心任务：管理插件 UI 交互状态，执行 AI 诊断请求，并支持一键镜像至管端。
 */

// 全局临时状态容器
let currentData = {
    actualImage: null,    // 实测截图 Base64
    designImage: null,    // 对应设计稿 Base64
    styles: null,         // 采集到的 CSSComputedStyle 快照
    elementInfo: null,    // 元素标签、URL 等上下文
    diagnosisResult: null, // AI 返回的 Markdown 诊断结论
    selectedRatio: 'ratio-phone', // 默认手机比例
    similarity: null      // 视觉相似度分数
};

// --- DOM 核心引用 ---
const diagnoseBtn = document.getElementById('diagnose-btn');       // “开始 AI 视觉查验”按钮
const captureFullBtn = document.getElementById('capture-full-btn'); // “一键捕获当前视口”按钮
const resetBtn = document.getElementById('reset-btn');              // “清空/重置”按钮
const gotoPlatformLink = document.getElementById('goto-platform');  // “进入专业管理平台”外链
const actualPreview = document.getElementById('actual-preview');    // 实测图预览位
const designDropzone = document.getElementById('design-dropzone');  // 设计稿上传/预览位
const designInput = document.getElementById('design-input');        // 隐藏的 File input
const loader = document.getElementById('loader');                   // 加载动效
const resultArea = document.getElementById('result-area');          // 结果展示容器
const resultContent = document.getElementById('result-content');    // Markdown 结果承载位

/**
 * 微型 Markdown 渲染引擎
 * 目的：在插件弹窗这种轻量级环境下，快速转换 AI 返回的结构化文本。
 */
function renderMarkdown(text) {
    if (!text) return '';
    let html = text
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
        .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
        .replace(/^\- (.*$)/gim, '<li>$1</li>')
        .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/\n\n/g, '<p></p>');

    // 自动补全列表标签
    html = html.replace(/(<li>.*<\/li>)/gms, '<ul>$1</ul>');
    return html;
}

// --- 数据持久化管理 (chrome.storage.local) ---
// 业务原因：用户切换标签页或关闭弹窗后，希望已有的截图和诊断仍然存在。

/** 将当前 UI 状态保存至插件本地存储 */
function saveState() {
    chrome.storage.local.set({ 'popupState': currentData });
}

/** 从存储中恢复 UI 状态 */
function loadState() {
    chrome.storage.local.get(['popupState'], (result) => {
        if (result.popupState) {
            currentData = result.popupState;
            // 恢复视图预览
            if (currentData.actualImage) {
                actualPreview.innerHTML = `<img src="${currentData.actualImage}">`;
            }
            if (currentData.designImage) {
                designDropzone.innerHTML = `<img src="${currentData.designImage}">`;
            }
            if (currentData.diagnosisResult) {
                showResult(currentData.diagnosisResult, currentData.similarity);
            }
            // 恢复比例设置
            if (currentData.selectedRatio) {
                applyDeviceRatio(currentData.selectedRatio);
            }
            checkReady();
        }
    });
}

/** 比例切换功能实现 */
const deviceTabs = document.querySelectorAll('.device-tab');
deviceTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const ratio = tab.getAttribute('data-ratio');
        applyDeviceRatio(ratio);
        saveState();
    });
});

function applyDeviceRatio(ratio) {
    currentData.selectedRatio = ratio;
    document.body.className = ratio; // 同步至 body，支持全局布局与滚动逻辑

    // 更新预览区域 Class
    actualPreview.className = `preview-area ${ratio}`;
    designDropzone.className = `preview-area ${ratio}`;

    // 更新 Tab 选中状态
    deviceTabs.forEach(t => {
        if (t.getAttribute('data-ratio') === ratio) {
            t.classList.add('active');
        } else {
            t.classList.remove('active');
        }
    });
}

/** 彻底清空当前会话：用于开始全新的 UI 对比任务 */
resetBtn.addEventListener('click', () => {
    if (confirm("确定要清空当前的截图和诊断结果吗？")) {
        // 1. 立即清除 UI（提供即时反馈）
        actualPreview.innerHTML = `<span class="upload-placeholder" style="font-size: 11px;">按 'S' 键<br>或由网页截取</span>`;
        designDropzone.innerHTML = `<span class="upload-placeholder" style="font-size: 11px;">拖拽设计稿<br>至此处</span>`;
        if (resultArea) resultArea.style.display = 'none';

        // 2. 发送消息清除 Background 中的截屏缓存
        chrome.runtime.sendMessage({ type: "CLEAR_CACHE" }, () => {
            // 3. 清除 Persistent Storage 并刷新
            chrome.storage.local.remove(['popupState'], () => {
                location.reload();
            });
        });
    }
});

// --- 数据持久化管理 (chrome.storage.local) ---
// 业务原因：用户切换标签页或关闭弹窗后，希望已有的截图和诊断仍然存在。

/**
 * 重点：导出并深度检查
 * 1. 通过 AJAX (fetch) 将本地 Base64 数据及 AI 诊断推送至后端 3000 端口。
 * 2. 接收后端生成的 reportId。
 * 3. 自动开启新标签页跳转至管理平台的详情展示页。
 */
gotoPlatformLink.addEventListener('click', async (e) => {
    e.preventDefault();
    if (!currentData.actualImage || !currentData.designImage) {
        alert("请先完成截图和设计稿上传。");
        return;
    }

    const originalText = gotoPlatformLink.innerText;
    gotoPlatformLink.innerText = "⏳ 正在同步至平台...";

    try {
        // 直接使用原始图像数据发送至平台，由后端 CompareService 执行 1:1 无损补齐对齐
        // 这样可以彻底避免因高度不同导致的纵向拉伸失真
        console.log('[UI-Eye] 正在向平台同步原始比例数据...');

        const response = await fetch("http://localhost:3000/api/extension/export", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                actualImage: currentData.actualImage,
                designImage: currentData.designImage,
                diagnosis: currentData.diagnosisResult,
                styles: currentData.styles,
                elementInfo: currentData.elementInfo
            })
        });

        const result = await response.json();
        if (result.success && result.data.reportId) {
            // 关键：打开 Web 管理平台的新标签页，实现闭环。
            chrome.tabs.create({ url: `http://localhost:5173/report/${result.data.reportId}` });
        } else {
            alert("同步失败: " + result.message);
        }
    } catch (err) {
        console.error("Export Error:", err);
        alert("无法同步至平台，请检查后端 3000 端口（npm run server）是否在线。");
    } finally {
        gotoPlatformLink.innerText = originalText;
    }
});

// 入口：初始化恢复状态
loadState();

// 亮点优化：面板弹起即视为“工作中”，图标立即转蓝高亮
chrome.runtime.sendMessage({ type: "SET_INSPECTION_STATUS", active: true });

/**
 * 通信桥接：获取之前在页面中通过 S 键触发的划域捕获结果
 */
chrome.runtime.sendMessage({ type: "GET_LAST_CAPTURE" }, (response) => {
    if (response && response.data) {
        updateActualPreview(response.data);
    }
});

/**
 * 传统模式：一键捕获当前完整页面（支持全页滚动截图）
 * 使用 content script 配合实现真正的全页截图
 */
captureFullBtn.addEventListener('click', async () => {
    captureFullBtn.disabled = true;
    captureFullBtn.innerHTML = "⏳ 正在全页截图...";

    try {
        // 获取当前活动标签页
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        // 向 content script 发送全页截图请求
        chrome.tabs.sendMessage(tab.id, { action: "CAPTURE_FULL_PAGE" }, (response) => {
            if (chrome.runtime.lastError) {
                alert("截图失败: 请刷新页面后重试");
                captureFullBtn.disabled = false;
                captureFullBtn.innerHTML = "📸 一键截屏";
                return;
            }

            if (response && response.status === "success") {
                // 构造虚拟捕获数据包
                const mockData = {
                    croppedImage: response.fullPageImage,
                    styles: { tagName: "BODY (Full Page)" },
                    url: response.url
                };

                updateActualPreview(mockData);
                // 同步至 Background 缓存，确保全局一致
                chrome.runtime.sendMessage({ type: "SYNC_CACHE", data: mockData });
            } else {
                alert("截图失败: " + (response?.error || "未知错误"));
            }

            captureFullBtn.disabled = false;
            captureFullBtn.innerHTML = "📸 一键截屏";
        });

    } catch (err) {
        alert("截屏失败: " + err.message);
        captureFullBtn.disabled = false;
        captureFullBtn.innerHTML = "📸 一键截屏";
    }
});

/** 设计稿文件读取逻辑 */
designDropzone.addEventListener('click', () => designInput.click());
designInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            currentData.designImage = e.target.result;
            designDropzone.innerHTML = `<img src="${e.target.result}">`;
            saveState();
            checkReady();
        };
        reader.readAsDataURL(file);
    }
});

// 全局快捷键监听 (增加捕获优先级与调试日志)
document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();

    // 调试辅助：如果您没看到反应，请打开 Console 看看是否有日志
    if (key === 's') {
        console.log("UI-Eye DEBUG: Detected 'S' key press. Active status:", isInspectionActive);
    }

    // 按 'S' 键：通过键盘激活/取消捕获准星
    if (key === 's' && !isInspectionActive) {
        // 如果用户正在输入框中输入，则不响应插件逻辑
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) || document.activeElement.isContentEditable) {
            console.log("UI-Eye: 'S' key ignored due to input focus.");
            return;
        }
        toggleInspection(true);
        e.preventDefault(); // 阻止某些页面默认行为
    }

    // 按 'ESC' 或再次按 'S'：即刻关闭蓝框，恢复正常浏览
    else if ((key === 'escape' || key === 's') && isInspectionActive) {
        toggleInspection(false);
        e.preventDefault();
    }
}, true); // 使用 Capture Phase 确保优先捕获

/** 同步更新 UI 预览位并持久化 */
function updateActualPreview(data) {
    currentData.actualImage = data.croppedImage;
    currentData.styles = data.styles;
    currentData.elementInfo = {
        tagName: data.styles.tagName,
        url: data.url
    };
    actualPreview.innerHTML = `<img src="${data.croppedImage}">`;
    saveState();
    checkReady();
}

/** 动态校验是否具备启动“AI 扫描”的条件（双图就位） */
function checkReady() {
    if (currentData.actualImage && currentData.designImage) {
        diagnoseBtn.disabled = false;
    } else {
        diagnoseBtn.disabled = true;
    }
}

/**
 * 核心：发起 AI 视觉走查诊断
 * 调用后端 3000 进行接口透传，利用 Vision 大模型进行比对分析。
 */
diagnoseBtn.addEventListener('click', async () => {
    diagnoseBtn.disabled = true;
    loader.style.display = 'block';
    resultArea.style.display = 'none';

    try {
        const API_URL = "http://localhost:3000/api/extension/diagnose";
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentData)
        });

        const result = await response.json();

        if (result.success) {
            currentData.diagnosisResult = result.data.diagnosis;
            currentData.similarity = result.data.similarity;
            showResult(result.data.diagnosis, result.data.similarity);
            saveState(); // 将诊断结果也存入 LocalStorage，防丢失
        } else {
            alert("诊断执行异常: " + result.message);
        }
    } catch (err) {
        alert("无法触达后端服务，请确认后端运行状态。");
    } finally {
        diagnoseBtn.disabled = false;
        loader.style.display = 'none';
    }
});

/** 展示诊断结论（渲染 Markdown + 相似度） */
function showResult(text, similarity = null) {
    resultArea.style.display = 'block';

    let similarityHtml = '';
    // 严格检查是否为有效数字，防止 null/undefined 导致渲染消失
    if (typeof similarity === 'number') {
        // 根据分值决定色彩：90+ 极佳(绿), 70+ 一般(橙), 70- 较差(红)
        const color = similarity > 90 ? '#52c41a' : (similarity > 70 ? '#fa8c16' : '#f5222d');
        similarityHtml = `
            <div style="background: ${color}15; border: 1px solid ${color}; border-radius: 8px; padding: 12px; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 2px 8px ${color}10; border-left: 4px solid ${color};">
                <div style="display: flex; flex-direction: column; gap: 2px;">
                    <div style="font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase;">核心指标</div>
                    <div style="font-size: 13px; font-weight: 700; color: ${color};">视觉相似度 (Similarity)</div>
                </div>
                <div style="font-size: 26px; font-weight: 900; color: ${color}; font-family: 'Inter', system-ui;">${similarity}%</div>
            </div>
        `;
    }

    resultContent.innerHTML = similarityHtml + renderMarkdown(text);
}
