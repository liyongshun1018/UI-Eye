<template>
  <div class="compare-page">
    <div class="container-wide">
      <div class="page-header">
        <h1 class="page-title">开始对比</h1>
        <p class="page-subtitle">配置对比参数，开始 AI 驱动的视觉走查</p>
      </div>

      <div class="compare-form card glass">
        <!-- 步骤 1: 选择对比模式 -->
        <div class="form-section">
          <h2 class="section-title">1. 选择对比模式</h2>
          <div class="mode-selector">
            <div
              v-for="mode in modes"
              :key="mode.value"
              class="mode-card"
              :class="{ active: config.mode === mode.value }"
              @click="config.mode = mode.value"
            >
              <div class="mode-icon">{{ mode.icon }}</div>
              <div class="mode-name">{{ mode.name }}</div>
              <div class="mode-desc">{{ mode.description }}</div>
            </div>
          </div>
        </div>

        <!-- 步骤 2: 输入 H5 页面 URL -->
        <div class="form-section">
          <h2 class="section-title">2. 输入 H5 页面地址</h2>
          <input
            v-model="config.url"
            type="url"
            class="form-input"
            placeholder="https://example.com/page.html"
            required
          />
        </div>

        <!-- 步骤 3: 设计稿来源 -->
        <div class="form-section">
          <h2 class="section-title">3. 设计稿来源</h2>
          
          <!-- 模式一：效果图上传 -->
          <div v-if="config.mode === 'upload'" class="upload-area">
            <div
              class="dropzone"
              :class="{ 'drag-over': isDragging }"
              @dragover.prevent="isDragging = true"
              @dragleave.prevent="isDragging = false"
              @drop.prevent="handleDrop"
              @click="triggerFileInput"
            >
              <input
                ref="fileInput"
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                style="display: none"
                @change="handleFileSelect"
              />
              <div v-if="!designFile" class="dropzone-placeholder">
                <div class="upload-icon">📤</div>
                <p>拖拽设计稿到此处，或点击选择文件</p>
                <p class="upload-hint">支持 PNG、JPG 格式</p>
              </div>
              <div v-else class="file-preview">
                <img :src="designPreview" alt="设计稿预览" />
                <button class="btn btn-secondary btn-sm" @click.stop="clearFile">
                  重新选择
                </button>
              </div>
            </div>
          </div>

          <!-- 模式二：图片 URL（蓝湖） -->
          <div v-else class="lanhu-input">
            <input
              v-model="config.designSource"
              type="url"
              class="form-input"
              placeholder="https://lanhuapp.com/url/xxx.png 或其他图片 URL"
              required
            />
            <p class="input-hint">
              💡 输入图片 URL（支持蓝湖导出的图片地址或其他图床）<br/>
              <span style="font-size: 0.85em; color: var(--text-tertiary);">
                蓝湖操作：打开设计稿 → 右键 → 复制图片地址 → 粘贴到此处
              </span>
            </p>
          </div>
        </div>

        <!-- 步骤 4: 选择 AI 模型 -->
        <div class="form-section">
          <h2 class="section-title">4. 选择 AI 分析模型（可选）</h2>
          <div class="model-selector">
            <label
              v-for="model in aiModels"
              :key="model.value"
              class="model-option"
              :class="{ active: config.aiModel === model.value }"
            >
              <input
                v-model="config.aiModel"
                type="radio"
                :value="model.value"
                name="aiModel"
              />
              <span class="model-name">{{ model.name }}</span>
              <span class="model-badge">{{ model.environment }}</span>
            </label>
          </div>
        </div>

        <!-- 步骤 5: 视口配置 -->
        <div class="form-section">
          <h2 class="section-title">5. 视口尺寸</h2>
          <div class="viewport-selector">
            <select v-model="selectedPreset" class="form-select" @change="handlePresetChange">
              <option v-for="preset in viewportPresets" :key="preset.name" :value="preset.name">
                {{ preset.name }}
                <template v-if="preset.width > 0">
                  ({{ preset.width }} x {{ preset.height }})
                </template>
              </option>
            </select>
            
            <div v-if="selectedPreset === '自定义'" class="custom-viewport">
              <input
                v-model.number="config.viewport.width"
                type="number"
                class="form-input"
                placeholder="宽度"
                min="320"
              />
              <span class="separator">×</span>
              <input
                v-model.number="config.viewport.height"
                type="number"
                class="form-input"
                placeholder="高度"
                min="480"
              />
            </div>
          </div>
        </div>

        <!-- 步骤 6: 对比引擎选择 -->
        <div class="form-section">
          <h2 class="section-title">6. 对比引擎（可选）</h2>
          <div class="engine-selector">
            <label
              v-for="engine in engines"
              :key="engine.value"
              class="engine-option"
              :class="{ active: config.engine === engine.value }"
            >
              <input
                v-model="config.engine"
                type="radio"
                :value="engine.value"
                name="engine"
              />
              <div class="engine-content">
                <span class="engine-name">{{ engine.name }}</span>
                <span class="engine-badge" :class="`badge-${engine.value}`">{{ engine.badge }}</span>
                <p class="engine-desc">{{ engine.description }}</p>
              </div>
            </label>
          </div>

          <!-- Resemble 高级选项 -->
          <div v-if="config.engine === 'resemble'" class="advanced-options">
            <h3 class="options-title">高级选项</h3>
            <label class="checkbox-option">
              <input
                v-model="config.ignoreAntialiasing"
                type="checkbox"
              />
              <span>忽略抗锯齿差异</span>
              <span class="option-hint">（推荐）减少字体渲染等导致的误报</span>
            </label>
          </div>
        </div>

        <!-- 提交按钮 -->
        <div class="form-actions">
          <button
            class="btn btn-primary btn-large"
            :disabled="!canSubmit || isSubmitting"
            @click="handleSubmit"
          >
            <span v-if="!isSubmitting">开始对比</span>
            <span v-else class="loading">
              <span class="spin">⚙️</span> 处理中...
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { AI_MODELS, COMPARE_MODES, VIEWPORT_PRESETS } from '@/config/constants'
import { uploadDesign, fetchLanhuDesign, startCompare } from '@/services/compare'
import type { CompareConfig } from '@/types'

const router = useRouter()

// 对比模式
const modes = [
  { ...COMPARE_MODES.UPLOAD, icon: '📤' },
  { 
    value: 'lanhu',
    name: '图片 URL',
    description: '输入远程图片地址（支持蓝湖）',
    icon: '🔗'
  }
]

// AI 模型
const aiModels = Object.values(AI_MODELS)

// 视口预设
const viewportPresets = VIEWPORT_PRESETS

// 表单配置
const config = reactive<CompareConfig>({
  url: '',
  mode: 'upload',
  designSource: '',
  aiModel: 'siliconflow',
  engine: 'resemble', // 默认引擎改为 Resemble
  ignoreAntialiasing: true, // 默认忽略抗锯齿
  viewport: {
    width: 375,
    height: 667
  }
})

// 对比引擎选项
const engines = [
  {
    value: 'pixelmatch',
    name: 'Pixelmatch',
    badge: '快速',
    description: '基于像素级对比，速度快，适合快速检查'
  },
  {
    value: 'resemble',
    name: 'Resemble.js',
    badge: '高质量',
    description: '智能对比引擎，自动忽略抗锯齿，减少误报'
  }
]

// 文件上传相关
const fileInput = ref<HTMLInputElement>()
const designFile = ref<File>()
const designPreview = ref<string>('')
const isDragging = ref(false)
const isSubmitting = ref(false)
const selectedPreset = ref('iPhone SE')

// 表单验证
const canSubmit = computed(() => {
  if (!config.url) return false
  if (config.mode === 'upload' && !designFile.value) return false
  if (config.mode === 'lanhu' && !config.designSource) return false
  return true
})

// 触发文件选择
const triggerFileInput = () => {
  fileInput.value?.click()
}

// 处理文件选择
const handleFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    setDesignFile(file)
  }
}

// 处理拖拽上传
const handleDrop = (e: DragEvent) => {
  isDragging.value = false
  const file = e.dataTransfer?.files[0]
  if (file && file.type.startsWith('image/')) {
    setDesignFile(file)
  }
}

// 设置设计稿文件
const setDesignFile = (file: File) => {
  designFile.value = file
  const reader = new FileReader()
  reader.onload = (e) => {
    designPreview.value = e.target?.result as string
  }
  reader.readAsDataURL(file)
}

// 清除文件
const clearFile = () => {
  designFile.value = undefined
  designPreview.value = ''
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

// 处理视口预设变化
const handlePresetChange = () => {
  const preset = viewportPresets.find(p => p.name === selectedPreset.value)
  if (preset && preset.width > 0) {
    config.viewport.width = preset.width
    config.viewport.height = preset.height
  }
}

// 提交表单
const handleSubmit = async () => {
  if (!canSubmit.value || isSubmitting.value) return

  isSubmitting.value = true

  try {
    // 1. 上传设计稿或获取蓝湖设计稿
    if (config.mode === 'upload' && designFile.value) {
      const uploadRes = await uploadDesign(designFile.value)
      if (!uploadRes.success || !uploadRes.data) {
        throw new Error(uploadRes.message || '设计稿上传失败，请重试')
      }
      config.designSource = uploadRes.data.url
    } else if (config.mode === 'lanhu') {
      const lanhuRes = await fetchLanhuDesign(config.designSource)
      if (!lanhuRes.success || !lanhuRes.data) {
        throw new Error(lanhuRes.message || '获取蓝湖设计稿失败，请检查链接是否正确')
      }
      config.designSource = lanhuRes.data.imageUrl
    }

    // 2. 开始对比
    const compareRes = await startCompare(config)
    if (!compareRes.success || !compareRes.data) {
      throw new Error(compareRes.message || '启动对比任务失败，请重试')
    }
    
    // 跳转到报告页面
    router.push(`/report/${compareRes.data.reportId}`)
  } catch (error: any) {
    console.error('对比失败:', error)
    
    // 显示详细错误信息
    const errorMessage = error.message || '对比失败，请重试'
    alert(`❌ ${errorMessage}\n\n建议：\n1. 检查网络连接\n2. 确认页面 URL 可访问\n3. 验证设计稿格式正确`)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.compare-page {
  padding: var(--spacing-lg) 0;
}

.page-header {
  text-align: center;
  margin-bottom: var(--spacing-md);
}

.page-title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  margin-bottom: 0.25rem;
}

.page-subtitle {
  font-size: var(--font-size-base);
  color: var(--text-secondary);
}

.compare-form {
  max-width: 900px;
  margin: 0 auto;
  padding: var(--spacing-md);
}

.form-section {
  margin-bottom: var(--spacing-md);
}

.form-section:last-of-type {
  margin-bottom: 0;
}

.section-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--spacing-sm);
  color: var(--text-primary);
}

/* 模式选择器 */
.mode-selector {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-md);
}

.mode-card {
  padding: var(--spacing-sm);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-base);
  text-align: center;
}

.mode-card:hover {
  border-color: var(--border-color-hover);
  transform: translateY(-2px);
}

.mode-card.active {
  border-color: var(--accent-primary);
  background: rgba(99, 102, 241, 0.1);
}

.mode-icon {
  font-size: 1.75rem;
  margin-bottom: 0.25rem;
}

.mode-name {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  margin-bottom: 0.125rem;
}

.mode-desc {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

/* 表单输入 */
.form-input,
.form-select {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--font-size-base);
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  transition: all var(--transition-base);
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

/* 上传区域 */
.dropzone {
  border: 2px dashed var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  text-align: center;
  cursor: pointer;
  transition: all var(--transition-base);
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dropzone:hover,
.dropzone.drag-over {
  border-color: var(--accent-primary);
  background: rgba(99, 102, 241, 0.05);
}

.upload-icon {
  font-size: 2rem;
  margin-bottom: 0.25rem;
}

.upload-hint {
  font-size: var(--font-size-sm);
  color: var(--text-tertiary);
  margin-top: var(--spacing-xs);
}

.file-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
}

.file-preview img {
  max-width: 100%;
  max-height: 300px;
  border-radius: var(--radius-sm);
}

/* 蓝湖输入 */
.input-hint {
  font-size: var(--font-size-sm);
  color: var(--text-tertiary);
  margin-top: var(--spacing-xs);
}

/* AI 模型选择器 */
.model-selector {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.model-option {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-base);
}

.model-option:hover {
  border-color: var(--border-color-hover);
}

.model-option.active {
  border-color: var(--accent-primary);
  background: rgba(99, 102, 241, 0.1);
}

.model-option input[type="radio"] {
  margin: 0;
}

.model-name {
  flex: 1;
  font-weight: var(--font-weight-medium);
}

.model-badge {
  padding: 0.25rem 0.5rem;
  font-size: var(--font-size-xs);
  background: var(--bg-glass);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
}

/* 视口选择器 */
.viewport-selector {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.custom-viewport {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.custom-viewport .form-input {
  flex: 1;
}

.separator {
  color: var(--text-secondary);
  font-size: var(--font-size-lg);
}

/* 表单操作 */
.form-actions {
  margin-top: var(--spacing-md);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--border-color);
  text-align: center;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

/* 引擎选择器 */
.engine-selector {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.engine-option {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-base);
}

.engine-option:hover {
  border-color: var(--border-color-hover);
  transform: translateY(-1px);
}

.engine-option.active {
  border-color: var(--accent-primary);
  background: rgba(99, 102, 241, 0.05);
}

.engine-option input[type="radio"] {
  margin-top: 0.25rem;
}

.engine-content {
  flex: 1;
}

.engine-name {
  font-weight: var(--font-weight-semibold);
  font-size: var(--font-size-base);
  margin-right: var(--spacing-xs);
}

.engine-badge {
  padding: 0.25rem 0.5rem;
  font-size: var(--font-size-xs);
  border-radius: var(--radius-sm);
  font-weight: var(--font-weight-medium);
}

.badge-pixelmatch {
  background: rgba(34, 197, 94, 0.1);
  color: rgb(34, 197, 94);
}

.badge-resemble {
  background: rgba(99, 102, 241, 0.1);
  color: var(--accent-primary);
}

.engine-desc {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-top: var(--spacing-xs);
}

/* 高级选项 */
.advanced-options {
  margin-top: var(--spacing-lg);
  padding: var(--spacing-md);
  background: var(--bg-glass);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
}

.options-title {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--spacing-sm);
  color: var(--text-primary);
}

.checkbox-option {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  cursor: pointer;
}

.checkbox-option input[type="checkbox"] {
  margin: 0;
}

.option-hint {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  margin-left: auto;
}

/* 响应式 */
@media (max-width: 768px) {
  .mode-selector {
    grid-template-columns: 1fr;
  }

  .custom-viewport {
    flex-direction: column;
  }
}
</style>
