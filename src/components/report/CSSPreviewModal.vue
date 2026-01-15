<template>
  <div v-if="show" class="preview-modal-overlay" @click.self="close">
    <div class="preview-modal-content card glass glass-dark">
      <div class="modal-header">
        <div class="header-info">
          <h3 class="modal-title">效果预览</h3>
          <span class="preview-badge">所见即所得 (WYSIWYG)</span>
        </div>
        <button class="close-btn" @click="close">×</button>
      </div>

      <div class="preview-body">
        <div class="preview-info-bar">
          <div class="url-badge">
            <span class="icon">🔗</span>
            <span class="url-text">{{ url }}</span>
          </div>
          <div class="fix-badge">
            <span class="icon">✨</span>
            <span>已应用修复样式</span>
          </div>
        </div>

        <!-- 错误提示 -->
        <div v-if="hasLoadError && !showCodeDiff" class="preview-error">
          <div class="error-icon">⚠️</div>
          <h4>预览加载受限</h4>
          <p>目标网站的安全策略（CORS/CSP）阻止了部分资源加载。</p>
          <p class="error-hint">这是 iframe 预览方案的固有限制，不影响实际的 CSS 修复效果。</p>
          <div class="error-actions">
            <button class="btn btn-primary" @click="toggleCodeDiff">
              <span class="icon">📝</span> 查看 CSS 代码对比
            </button>
            <button class="btn btn-secondary" @click="hasLoadError = false">
              <span class="icon">🔄</span> 仍然尝试预览
            </button>
          </div>
        </div>

        <!-- CSS 代码对比视图 -->
        <div v-else-if="showCodeDiff" class="code-diff-view">
          <div class="diff-header">
            <h4>CSS 修复代码对比</h4>
            <button class="btn-text" @click="toggleCodeDiff">
              <span class="icon">👁️</span> 返回预览
            </button>
          </div>
          <div class="diff-content">
            <div class="code-block">
              <div class="code-label">修复后的 CSS</div>
              <pre><code>{{ css || '/* 无修复建议 */' }}</code></pre>
            </div>
          </div>
          <div class="diff-footer">
            <button class="btn btn-secondary btn-sm" @click="copyCSS">
              <span class="icon">📋</span> 复制代码
            </button>
          </div>
        </div>

        <!-- iframe 预览容器 -->
        <div v-else class="iframe-container" :class="{ loading: isIframeLoading }">
          <div v-if="isIframeLoading" class="iframe-loading-overlay">
            <div class="spinner spin">⚙️</div>
            <p>正在注入样式并生成预览...</p>
          </div>
          <iframe
            ref="iframeRef"
            :src="proxyUrl"
            class="preview-iframe"
            @load="onIframeLoad"
          ></iframe>
        </div>
      </div>

      <div class="modal-footer">
        <div class="footer-hint">
          <span class="hint-icon">💡</span>
          <span>提示：预览环境已禁用页面内跳转。如资源加载失败，请检查原站跨域策略。</span>
        </div>
        <button class="btn btn-primary" @click="close">完成查看</button>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * CSSPreviewModal.vue - CSS 效果即时预览弹窗
 * 核心逻辑：通过后端代理加载目标网页，并实时注入 AI 建议的 CSS 修复代码。
 */
import { ref, computed, watch } from 'vue'
import { useDialog } from '@/composables/useDialog'

const { showSuccess, showError } = useDialog()

const props = defineProps({
  show: Boolean,
  url: String,
  css: String
})

const emit = defineEmits(['update:show'])

const isIframeLoading = ref(true)
const iframeRef = ref(null)
const hasLoadError = ref(false)
const showCodeDiff = ref(false)
const loadTimeout = ref(null)

/**
 * 构造后端代理 URL
 * 编码 URL 和 CSS，通过后端 ProxyEndpoint 动态渲染注入后的 HTML
 */
const proxyUrl = computed(() => {
  if (!props.url) return ''
  const baseUrl = 'http://localhost:3000/api/proxy-preview'
  const params = new URLSearchParams()
  params.append('url', props.url)
  if (props.css) {
    params.append('css', props.css)
  }
  return `${baseUrl}?${params.toString()}`
})

const close = () => {
  emit('update:show', false)
  // 清理定时器
  if (loadTimeout.value) {
    clearTimeout(loadTimeout.value)
  }
}

const onIframeLoad = () => {
  isIframeLoading.value = false
  if (loadTimeout.value) {
    clearTimeout(loadTimeout.value)
  }
  
  // 延迟检测 iframe 内容是否加载成功
  setTimeout(() => {
    checkIframeContent()
  }, 1000)
}

/**
 * 检测 iframe 内容是否正常加载
 * 通过尝试访问 iframe 的 document 来判断是否存在跨域限制
 */
const checkIframeContent = () => {
  try {
    const iframe = iframeRef.value
    if (!iframe) return
    
    // 尝试访问 iframe 的 document
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
    
    // 如果能访问但 body 为空或高度为 0，可能是加载失败
    if (iframeDoc && (!iframeDoc.body || iframeDoc.body.offsetHeight < 50)) {
      hasLoadError.value = true
    }
  } catch (e) {
    // 跨域错误会抛出异常，这是正常的（说明页面已加载）
    // 只有在完全无法访问时才认为是错误
    console.log('[预览] iframe 跨域保护已生效（正常）')
  }
}

/**
 * 设置加载超时检测
 * 如果 10 秒后仍未加载完成，显示错误提示
 */
const startLoadTimeout = () => {
  if (loadTimeout.value) {
    clearTimeout(loadTimeout.value)
  }
  
  loadTimeout.value = setTimeout(() => {
    if (isIframeLoading.value) {
      hasLoadError.value = true
      isIframeLoading.value = false
    }
  }, 10000) // 10 秒超时
}

/**
 * 切换到代码对比视图
 */
const toggleCodeDiff = () => {
  showCodeDiff.value = !showCodeDiff.value
}

/**
 * 复制 CSS 代码到剪贴板
 */
const copyCSS = async () => {
  if (!props.css) return
  
  try {
    await navigator.clipboard.writeText(props.css)
    showSuccess('CSS 代码已复制到剪贴板')
  } catch (err) {
    console.error('复制失败:', err)
    showError('复制失败，请手动选择代码复制')
  }
}

// 当弹窗重新打开时，重置所有状态
watch(() => props.show, (newVal) => {
  if (newVal) {
    isIframeLoading.value = true
    hasLoadError.value = false
    showCodeDiff.value = false
    startLoadTimeout()
  } else {
    if (loadTimeout.value) {
      clearTimeout(loadTimeout.value)
    }
  }
})
</script>

<style scoped>
.preview-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: var(--spacing-lg);
}

.preview-modal-content {
  width: 100%;
  max-width: 1000px;
  height: 90vh;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  animation: modal-enter 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes modal-enter {
  from { opacity: 0; transform: scale(0.9) translateY(20px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.modal-header {
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.modal-title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  margin: 0;
}

.preview-badge {
  background: var(--accent-primary);
  color: white;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 28px;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: color 0.2s;
}

.close-btn:hover {
  color: #EF4444;
}

.preview-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: var(--spacing-md);
  background: #0f172a; /* 深色背景模拟手机环境 */
}

.preview-info-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-sm);
  padding: 0 var(--spacing-xs);
}

.url-badge, .fix-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-tertiary);
  max-width: 60%;
}

.url-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fix-badge {
  color: #10B981;
  font-weight: 600;
}

.iframe-container {
  flex: 1;
  position: relative;
  background: white;
  border-radius: var(--radius-md);
  overflow: hidden;
  margin: 0 auto;
  /* 模拟 iPhone 13 比例 */
  width: 390px;
  max-width: 100%;
  min-height: 600px; /* 确保有足够的高度 */
  border: 4px solid #334155;
}

.iframe-loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.preview-iframe {
  width: 100%;
  height: 100%;
  border: none;
}

.modal-footer {
  padding: var(--spacing-md) var(--spacing-lg);
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f8fafc;
}

.footer-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-tertiary);
}

.hint-icon {
  font-size: 16px;
}

/* 错误提示样式 */
.preview-error {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl);
  background: white;
  border-radius: var(--radius-md);
  text-align: center;
  margin: 0 auto;
  max-width: 500px;
}

.error-icon {
  font-size: 48px;
  margin-bottom: var(--spacing-md);
}

.preview-error h4 {
  font-size: var(--font-size-lg);
  color: #DC2626;
  margin: 0 0 var(--spacing-sm) 0;
}

.preview-error p {
  color: var(--text-secondary);
  margin: 0 0 var(--spacing-xs) 0;
  line-height: 1.6;
}

.error-hint {
  font-size: 13px;
  color: var(--text-tertiary);
  font-style: italic;
}

.error-actions {
  display: flex;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-lg);
}

/* 代码对比视图样式 */
.code-diff-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: var(--radius-md);
  overflow: hidden;
}

.diff-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md);
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-secondary);
}

.diff-header h4 {
  margin: 0;
  font-size: var(--font-size-md);
  color: var(--text-primary);
}

.btn-text {
  background: none;
  border: none;
  color: var(--accent-primary);
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  transition: background 0.2s;
}

.btn-text:hover {
  background: rgba(99, 102, 241, 0.1);
}

.diff-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-md);
}

.diff-content .code-block {
  background: #f8fafc;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: var(--spacing-md);
}

.diff-content .code-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-tertiary);
  margin-bottom: var(--spacing-xs);
  text-transform: uppercase;
}

.diff-content pre {
  margin: 0;
  overflow-x: auto;
}

.diff-content code {
  font-family: 'Courier New', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-primary);
  white-space: pre-wrap;
  word-break: break-word;
}

.diff-footer {
  padding: var(--spacing-md);
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 640px) {
  .modal-footer {
    flex-direction: column;
    gap: var(--spacing-md);
  }
  
  .error-actions {
    flex-direction: column;
    width: 100%;
  }
  
  .error-actions button {
    width: 100%;
  }
}
</style>
