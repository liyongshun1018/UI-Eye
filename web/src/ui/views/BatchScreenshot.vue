<template>
  <div class="batch-screenshot-dashboard">
    <!-- 顶部状态导航 -->
    <header class="dashboard-header animate-in">
      <div class="header-content">
        <div class="title-section">
          <div class="icon-glow">🎯</div>
          <div class="text-stack">
            <h1>创建批量对比任务</h1>
            <p>自动化视觉对账·全链路监测中心</p>
          </div>
        </div>
        <button class="btn-glass-back" @click="goBack">
          <span>←</span> 返回列表
        </button>
      </div>
    </header>

    <div class="dashboard-grid">
      <!-- 左侧：核心任务配置 -->
      <main class="main-config animate-in" style="animation-delay: 0.1s">
        <div class="glass-card">
          <div class="card-header">
            <span class="step-badge">01</span>
            <h3>任务核心定义</h3>
          </div>
          
          <div class="form-body">
            <!-- 任务名称 -->
            <div class="input-modern-group">
              <label>任务标识名 <span class="required">*</span></label>
              <div class="input-wrapper">
                <input
                  v-model="form.name"
                  type="text"
                  placeholder="例如：2024 Spring Release 首页巡检"
                  required
                />
                <div class="input-outline"></div>
              </div>
            </div>

            <!-- URL 列表 -->
            <div class="input-modern-group">
              <div class="label-row">
                <label>待测 URL 矩阵 <span class="required">*</span></label>
                <div class="badge-blue">{{ urlCount }} / 200 URLs</div>
              </div>
              <div class="textarea-premium-container">
                <textarea
                  v-model="urlText"
                  placeholder="输入 URL，每行一个（支持 http/https）..."
                  rows="12"
                  required
                ></textarea>
                <div class="textarea-actions">
                  <button type="button" class="btn-mini-action" @click="handleImport">
                    📥 快速文件导入
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 扩展功能区：设计稿配置 -->
        <div class="form-sections-stack">
          <div class="glass-card section-card">
            <div class="card-header">
              <span class="step-badge">03</span>
              <h3>设计稿配置</h3>
            </div>
            <div class="card-body-premium">
              <DesignUpload v-model="designUpload" :urls="parsedUrls" />
            </div>
          </div>
        </div>
      </main>

      <!-- 右侧：环境与辅助参数 -->
      <aside class="side-config animate-in" style="animation-delay: 0.2s">
        <div class="glass-card">
          <div class="card-header">
            <span class="step-badge">02</span>
            <h3>环境与协议</h3>
          </div>
          
          <div class="side-form-body">
            <!-- 脚本选择 -->
            <div class="input-modern-group">
              <label>交互前置脚本</label>
              <div class="premium-select-wrapper">
                <select v-model="form.scriptId" class="premium-select">
                  <option :value="null">⚡ 极速截图（无脚本）</option>
                  <option v-for="script in availableScripts" :key="script.id" :value="script.id">
                    📜 {{ script.name }}
                  </option>
                </select>
                <div class="select-chevron"></div>
              </div>
              <p class="field-hint">选择将在截图前自动执行的 Puppeteer 脚本。</p>
            </div>

            <!-- 域名校验 -->
            <div class="input-modern-group">
              <label>关联登录态域</label>
              <div class="input-wrapper">
                <input
                  v-model="form.domain"
                  type="text"
                  placeholder="baidu.com"
                />
              </div>
              <p class="field-hint">如果页面需登录，将尝试复用该域名的 Cookie。</p>
            </div>

            <!-- 截图选项 -->
            <div class="config-block mt-md">
              <label class="config-label-small">截图选项</label>
              <div class="switches-column-modern">
                <label class="modern-switch">
                  <input 
                    v-model="form.options.fullPage" 
                    type="checkbox" 
                    class="hidden-checkbox"
                  />
                  <span class="switch-ui"></span>
                  <span class="switch-label">全页滚动截图</span>
                </label>
                <label class="modern-switch mt-xs">
                  <input 
                    v-model="form.options.headless" 
                    type="checkbox" 
                    class="hidden-checkbox"
                  />
                  <span class="switch-ui"></span>
                  <span class="switch-label">隐藏渲染窗口</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- 对比配置 -->
        <div class="glass-card">
          <div class="card-header">
            <span class="step-badge">04</span>
            <h3>对比配置</h3>
          </div>
          <div class="card-body-premium">
            <CompareConfig v-model="compareConfig" />
          </div>
        </div>

        <!-- 智慧统计 -->
        <div class="glass-card summary-card" v-if="urlCount > 0">
          <h4>任务预估概览</h4>
          <div class="summary-stat">
            <span>总计任务单元:</span>
            <strong>{{ urlCount }} Nodes</strong>
          </div>
          <div class="summary-stat">
            <span>预期耗时:</span>
            <strong>~{{ Math.ceil(urlCount * 1.5) }} min</strong>
          </div>
          <div class="summary-stat">
            <span>对比模式:</span>
            <strong>{{ designUpload.designSource ? '全量像素比对' : '仅视觉存证' }}</strong>
          </div>
        </div>
      </aside>
    </div>

    <!-- 悬浮提交栏 -->
    <footer class="sticky-footer glass">
      <div class="footer-container">
        <div class="footer-meta">
          <p v-if="urlCount === 0" class="text-warning">⚠️ 请至少输入一个待测 URL 以解锁创建</p>
          <p v-else class="text-success">✅ 配置验证通过，可以启动巡检任务</p>
        </div>
        <div class="footer-btns">
          <button class="btn-cancel-glass" @click="goBack">放弃更改</button>
          <button 
            type="submit" 
            class="btn-submit-hero" 
            @click="handleSubmit"
            :disabled="submitting || urlCount === 0"
          >
            <span v-if="submitting" class="loader-mini"></span>
            {{ submitting ? '正在分配节点...' : (designUpload.designSource ? '部署并启动对比' : '立即启动截图任务') }}
          </button>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { batchTaskAPI } from '@core/api'
import { useDialog } from '@modules/composables/useDialog.ts'
import DesignUpload from '@ui/components/batch/DesignUpload.vue'
import CompareConfig from '@ui/components/batch/CompareConfig.vue'
import { COMPARE_ENGINE, AI_MODEL } from '@core/constants'

const { showAlert, showError } = useDialog()
const router = useRouter()
const submitting = ref(false)
const urlText = ref('')
const availableScripts = ref([])

const form = ref({
  name: '',
  domain: '',
  scriptId: null,
  options: {
    fullPage: true,
    headless: true
  }
})

const designUpload = ref({
  mode: 'single',
  designSource: ''
})

const compareConfig = ref({
  engine: COMPARE_ENGINE.RESEMBLE,
  aiModel: 'siliconflow',  // 使用统一的 AI_MODELS 中的值
  ignoreAntialiasing: true,
  enableSmartAlignment: true,  // 默认启用智能吸附
  viewport: { width: 375, height: 667 }
})

const fetchScripts = async () => {
  try {
    const response = await batchTaskAPI.getScripts()
    if (response.success) {
      availableScripts.value = response.data
    }
  } catch (err) {}
}

onMounted(() => {
  fetchScripts()
})

const parsedUrls = computed(() => {
  return urlText.value
    .split('\n')
    .map((u) => u.trim())
    .filter((u) => u.startsWith('http'))
})

const urlCount = computed(() => parsedUrls.value.length)

const validateUrls = () => {
  const invalidUrls = parsedUrls.value.filter(u => {
    try {
      new URL(u)
      return false
    } catch (e) {
      return true
    }
  })
  return invalidUrls
}

const handleSubmit = async () => {
  if (submitting.value) return
  if (parsedUrls.value.length === 0) return

  const invalidOnes = validateUrls()
  if (invalidOnes.length > 0) {
    showError('检测到无效的 URL，请检查拼写（例如是否有 https;// 等错误）：\n' + invalidOnes.slice(0, 3).join('\n'))
    return
  }

  submitting.value = true
  try {
    const data = {
      name: form.value.name,
      urls: parsedUrls.value,
      domain: form.value.domain || null,
      script_id: form.value.scriptId,
      designMode: designUpload.value.mode,
      designSource: designUpload.value.designSource || null,
      compareConfig: (designUpload.value.designSource) ? compareConfig.value : null,
      options: form.value.options
    }
    
    const response = await batchTaskAPI.createTask(data)
    if (response.success && response.data?.taskId) {
      const taskId = response.data.taskId
      // 异步启动任务，不阻塞跳转
      batchTaskAPI.startTask(taskId).catch(err => {
        console.error('启动任务失败:', err)
      })
      router.push(`/batch-tasks/${taskId}`)
    }
  } catch (error) {
    showError('创建失败: ' + (error.response?.data?.message || error.message))
  } finally {
    submitting.value = false
  }
}

const handleImport = () => {
  showAlert('URL 批量导入功能正在规划中')
}

const goBack = () => {
  router.push('/batch-tasks')
}
</script>

<style scoped>
.batch-screenshot-dashboard {
  padding: 40px 24px 120px;
  max-width: 1200px;
  margin: 0 auto;
}

.dashboard-header {
  margin-bottom: 40px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title-section {
  display: flex;
  align-items: center;
  gap: 20px;
}

.icon-glow {
  font-size: 40px;
  background: white;
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(14, 165, 233, 0.2);
}

.text-stack h1 {
  font-size: 28px;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0;
}

.text-stack p {
  color: var(--text-tertiary);
  font-size: 14px;
  margin: 4px 0 0;
}

.btn-glass-back {
  background: rgba(255, 255, 255, 0.4);
  border: 1px solid var(--border-color);
  padding: 8px 16px;
  border-radius: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-glass-back:hover {
  background: white;
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

/* 网格布局 - 与 Compare.vue 保持一致 */
.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 2rem;
  align-items: start;
}

/* 右侧栏 sticky 定位 */
.side-config {
  position: sticky;
  top: 2rem;
}

.glass-card {
  background: white;
  border: 1px solid var(--border-color);
  border-radius: 20px;
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  margin-bottom: 24px;
}

.card-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  gap: 12px;
}

.step-badge {
  background: var(--accent-primary);
  color: white;
  font-size: 10px;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 6px;
  text-transform: uppercase;
}

.card-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
}

.form-body {
  padding: 24px;
}

/* 现代输入框组 */
.input-modern-group {
  margin-bottom: 24px;
}

.input-modern-group label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 10px;
}

.label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.badge-blue {
  font-size: 11px;
  background: #eff6ff;
  color: var(--accent-primary);
  padding: 2px 8px;
  border-radius: 20px;
  font-weight: 700;
}

.input-wrapper {
  position: relative;
}

.input-wrapper input {
  width: 100%;
  padding: 12px 16px;
  background: #f8fafc;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  font-size: 14px;
  transition: all 0.3s;
  outline: none;
}

.input-wrapper input:focus {
  background: white;
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 4px rgba(14, 165, 233, 0.1);
}

.textarea-premium-container {
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
  background: #f8fafc;
  transition: all 0.3s;
}

.textarea-premium-container:focus-within {
  background: white;
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 4px rgba(14, 165, 233, 0.1);
}

.textarea-premium-container textarea {
  width: 100%;
  padding: 16px;
  border: none;
  background: transparent;
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--text-primary);
  line-height: 1.6;
  resize: vertical;
  min-height: 200px;
  outline: none;
}

.textarea-actions {
  padding: 8px 16px;
  background: white;
  border-top: 1px dashed var(--border-color);
  display: flex;
  justify-content: flex-end;
}

.btn-mini-action {
  background: transparent;
  border: none;
  font-size: 12px;
  color: var(--accent-primary);
  font-weight: 700;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
}

.btn-mini-action:hover {
  background: #eff6ff;
}

/* 侧边配置 */
.side-form-body {
  padding: 24px;
}

.select-wrapper select {
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  background: #f8fafc;
  outline: none;
  cursor: pointer;
}

.field-hint {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 8px;
  line-height: 1.4;
}

.options-checklist {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 24px;
}

.check-item-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  cursor: pointer;
  background: white;
  transition: all 0.2s;
}

.check-item-card:hover {
  border-color: var(--accent-primary);
  transform: translateX(4px);
}

.check-item-card.active {
  background: #f0f9ff;
  border-color: var(--accent-primary);
}

.check-content {
  display: flex;
  flex-direction: column;
}

.check-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
}

.check-desc {
  font-size: 11px;
  color: var(--text-tertiary);
}

.summary-card {
  padding: 20px;
  background: linear-gradient(135deg, white 0%, #f0f9ff 100%);
}

.summary-card h4 {
  margin: 0 0 16px;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}

.summary-stat {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 13px;
}

.summary-stat span { color: var(--text-tertiary); }
.summary-stat strong { color: var(--text-primary); font-weight: 700; }

/* 底部浮动栏 */
.sticky-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  border-top: 1px solid var(--border-color);
  padding: 20px 0;
  z-index: 1000;
  box-shadow: 0 -10px 30px rgba(0,0,0,0.05);
}

.footer-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footer-meta p {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.text-warning { color: #f59e0b; }
.text-success { color: #10b981; }

/* 增强表单内边距，确保安全距离 */
.card-body-premium {
  padding: 32px;
}

.footer-btns {
  display: flex;
  gap: 16px;
}

.btn-cancel-glass {
  background: transparent;
  border: none;
  color: var(--text-tertiary);
  font-weight: 600;
  cursor: pointer;
  padding: 12px 24px;
}

.btn-cancel-glass:hover {
  color: var(--error);
}

.btn-submit-hero {
  background: var(--accent-primary);
  color: white;
  border: none;
  padding: 14px 32px;
  border-radius: 14px;
  font-weight: 700;
  font-size: 15px;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(14, 165, 233, 0.3);
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.btn-submit-hero:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px rgba(14, 165, 233, 0.4);
}

.btn-submit-hero:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  filter: grayscale(1);
}

.loader-mini {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  display: inline-block;
  vertical-align: middle;
  margin-right: 8px;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 1024px) {
  .dashboard-grid { grid-template-columns: 1fr; }
}

/* 动效 */
.animate-in {
  animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 配置区块样式 - 与 CompareConfig 保持一致 */
.config-block {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.config-label-small {
  font-size: 0.75rem;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.25rem;
}

/* 开关样式 - 与 CompareConfig 保持一致 */
.switches-column-modern {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  background: #f1f5f9;
  padding: 0.875rem 1rem;
  border-radius: 12px;
}

.modern-switch {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.hidden-checkbox {
  display: none;
}

.switch-ui {
  width: 38px;
  height: 22px;
  background: #cbd5e1;
  border-radius: 100px;
  position: relative;
  transition: all 0.3s;
  flex-shrink: 0;
}

.switch-ui::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 16px;
  height: 16px;
  background: white;
  border-radius: 50%;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

input:checked + .switch-ui {
  background: #2563eb;
}

input:checked + .switch-ui::after {
  left: 19px;
}

.switch-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #475569;
}

/* 下拉框样式 - 与 CompareConfig 保持一致 */
.premium-select-wrapper {
  position: relative;
}

.premium-select {
  width: 100%;
  padding: 0.75rem 2.5rem 0.75rem 1rem;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  font-size: 0.875rem;
  font-weight: 600;
  color: #1e293b;
  background: #fff;
  cursor: pointer;
  appearance: none;
  transition: all 0.2s;
  outline: none;
}

.premium-select:hover {
  border-color: #cbd5e1;
}

.premium-select:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.select-chevron {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 6px solid #64748b;
  pointer-events: none;
}
</style>
