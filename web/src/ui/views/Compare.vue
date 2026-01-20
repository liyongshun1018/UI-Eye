<template>
  <div class="compare-page">
    <div class="container-wide">
      <div class="page-header">
        <h1 class="page-title">开始对比</h1>
        <p class="page-subtitle">配置对比参数，开始 AI 驱动的视觉走查</p>
      </div>

      <div class="compare-grid-layout">
        <!-- 左侧列：数据源 (01 & 02) -->
        <div class="grid-column-left">
          <!-- 步骤 1: 待测对象 -->
          <div class="form-section-card animate-in">
            <div class="section-header-modern">
              <div class="section-title-group">
                <span class="step-badge">01</span>
                <div>
                  <h2 class="section-title-text">待测对象 (Target)</h2>
                  <p class="section-subtitle-text">选择要校验的页面或截图</p>
                </div>
              </div>
              <div class="mode-toggle-pill">
                <button 
                  class="pill-btn"
                  :class="{ active: config.targetMode === 'url' }"
                  @click="config.targetMode = 'url'"
                >
                  🌐 页面 URL
                </button>
                <button 
                  class="pill-btn"
                  :class="{ active: config.targetMode === 'upload' }"
                  @click="config.targetMode = 'upload'"
                >
                  📤 图片上传
                </button>
              </div>
            </div>

            <div class="section-content">
              <!-- 待测页面：URL 输入 -->
              <div v-if="config.targetMode === 'url'" class="field-item">
                <div class="input-wrapper-premium">
                  <span class="input-icon">🔗</span>
                  <input
                    v-model="config.url"
                    type="url"
                    class="form-input-premium"
                    placeholder="请输入 H5 页面在线地址..."
                  />
                </div>
              </div>
              
              <!-- 待测页面：图片上传 -->
              <div v-else class="upload-area-premium">
                <div
                  class="dropzone-modern target"
                  :class="{ 'drag-over': isDraggingTarget, 'has-file': targetFile }"
                  @click="triggerTargetFileInput"
                  @dragover.prevent="isDraggingTarget = true"
                  @dragleave.prevent="isDraggingTarget = false"
                  @drop.prevent="handleTargetDrop"
                >
                  <input
                    ref="targetFileInput"
                    type="file"
                    accept="image/*"
                    style="display: none"
                    @change="handleTargetFileSelect"
                  />
                  <div v-if="!targetFile" class="dropzone-inner">
                    <div class="art-circle target">
                      <span class="art-icon">📸</span>
                    </div>
                    <div class="upload-info">
                      <strong>上传待测页面截图</strong>
                      <span>支持拖拽或点击</span>
                    </div>
                  </div>
                  <div v-else class="preview-mini-modern">
                    <img :src="targetPreview" alt="待测图预览" />
                    <div class="preview-actions" @click.stop="clearTargetFile">
                      <span class="icon-close">✕</span>
                      <span>更换图片</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 步骤 2: 设计稿参考 (紧跟在 01 下面) -->
          <div class="form-section-card animate-in mt-section" style="animation-delay: 0.1s">
            <div class="section-header-modern">
              <div class="section-title-group">
                <span class="step-badge">02</span>
                <div>
                  <h2 class="section-title-text">设计稿参考 (Reference)</h2>
                  <p class="section-subtitle-text">上传 UI 设计图或输入图片链接</p>
                </div>
              </div>
              <div class="mode-toggle-pill">
                <button 
                  class="pill-btn"
                  :class="{ active: config.designMode === 'upload' }"
                  @click="config.designMode = 'upload'"
                >
                  🖼️ 效果图上传
                </button>
                <button 
                  class="pill-btn"
                  :class="{ active: config.designMode === 'url' }"
                  @click="config.designMode = 'url'"
                >
                  🔗 图片 URL
                </button>
              </div>
            </div>

            <div class="section-content">
              <!-- 设计稿：上传模式 -->
              <div v-if="config.designMode === 'upload'" class="upload-area-premium">
                <div
                  class="dropzone-modern reference"
                  :class="{ 'drag-over': isDraggingDesign, 'has-file': designFile }"
                  @click="triggerDesignFileInput"
                  @dragover.prevent="isDraggingDesign = true"
                  @dragleave.prevent="isDraggingDesign = false"
                  @drop.prevent="handleDesignDrop"
                >
                  <input
                    ref="designFileInput"
                    type="file"
                    accept="image/*"
                    style="display: none"
                    @change="handleDesignFileSelect"
                  />
                  <div v-if="!designFile" class="dropzone-inner">
                    <div class="art-circle reference">
                      <span class="art-icon">🎨</span>
                    </div>
                    <div class="upload-info">
                      <strong>上传 UI 设计稿</strong>
                      <span>PNG/JPG 效果图</span>
                    </div>
                  </div>
                  <div v-else class="preview-mini-modern">
                    <img :src="designPreview" alt="设计稿预览" />
                    <div class="preview-actions" @click.stop="clearDesignFile">
                      <span class="icon-close">✕</span>
                      <span>更换设计稿</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 设计稿：URL 模式 -->
              <div v-else class="remote-input-premium">
                <div class="input-wrapper-premium">
                  <span class="input-icon">🖼️</span>
                  <input
                    v-model="config.designSource"
                    type="url"
                    class="form-input-premium"
                    placeholder="请输入设计稿图片直链地址..."
                  />
                </div>
                <p class="hint-text">支持蓝湖、Figma 等工具导出的公开图片链接</p>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧列：配置 (03) -->
        <div class="grid-column-right">
          <div class="form-section-card animate-in sticky-card" style="animation-delay: 0.2s">
            <div class="section-header-modern">
              <div class="section-title-group">
                <span class="step-badge">03</span>
                <div>
                  <h2 class="section-title-text">对比配置</h2>
                  <p class="section-subtitle-text">视口尺寸、引擎及 AI 模型</p>
                </div>
              </div>
            </div>

            <div class="section-content">
              <div class="config-stack">
                <!-- 视口配置 -->
                <div class="config-block">
                  <label class="ai-label-premium">1. 渲染视口 (Viewport)</label>
                  <div class="viewport-box-modern">
                    <select v-model="selectedPreset" class="modern-select" @change="handlePresetChange">
                      <option v-for="preset in viewportPresets" :key="preset.name" :value="preset.name">
                        {{ preset.name }}
                      </option>
                    </select>
                    <div class="dimension-inputs">
                      <input v-model.number="config.viewport.width" type="number" class="mini-input" />
                      <span class="x-sep">×</span>
                      <input v-model.number="config.viewport.height" type="number" class="mini-input" />
                    </div>
                  </div>
                </div>

                <!-- AI 模型 -->
                <div class="config-block mt-md">
                  <label class="ai-label-premium">2. AI 分析模型</label>
                  <div class="premium-select-wrapper">
                    <select v-model="config.aiModel" class="premium-select">
                      <option v-for="m in availableAiModels" :key="m.value" :value="m.value">
                        {{ m.name }}
                      </option>
                    </select>
                    <div class="select-chevron"></div>
                  </div>
                </div>

                <!-- 引擎选择 (改为垂直排列或紧凑布局) -->
                <div class="config-block mt-md">
                  <label class="ai-label-premium">3. 对比引擎动力</label>
                  <div class="engine-cards-stack">
                    <div 
                      v-for="e in engines" 
                      :key="e.value"
                      class="engine-card-pill"
                      :class="{ active: config.engine === e.value }"
                      @click="config.engine = e.value"
                      :title="e.description"
                    >
                      <span class="engine-icon">{{ e.icon }}</span>
                      <div class="engine-text-group">
                        <div class="engine-title-row">
                          <span class="engine-name">{{ e.name }}</span>
                          <span v-if="e.recommended" class="recommended-badge">推荐</span>
                        </div>
                        <span class="engine-desc-mini">{{ e.description }} · {{ e.scene }}</span>
                      </div>
                      <span class="engine-tag-mini" :class="e.value">{{ e.badge }}</span>
                    </div>
                  </div>
                </div>

                <!-- 开关项 -->
                <div class="config-block mt-md">
                  <div class="switches-column-modern">
                    <label class="modern-switch">
                      <input v-model="config.ignoreAntialiasing" type="checkbox" class="hidden-checkbox" />
                      <span class="switch-ui"></span>
                      <span class="switch-label">忽略抗锯齿噪点</span>
                    </label>
                    <label class="modern-switch mt-xs">
                      <input v-model="config.enableSmartAlignment" type="checkbox" class="hidden-checkbox" />
                      <span class="switch-ui"></span>
                      <span class="switch-label">智能吸附/自动居中</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 独立通栏大按钮 -->
      <div class="form-footer-global animate-in" style="animation-delay: 0.3s">
        <button
          class="btn-sparkle-large"
          :disabled="!canSubmit || isSubmitting"
          @click="handleSubmit"
        >
          <div class="btn-content">
            <span v-if="!isSubmitting">立即开始视觉对比 (LAUNCH ANALYSIS)</span>
            <span v-else class="loading-state">
              <span class="pulse-ring"></span>
              正在进行智能对比分析...
            </span>
          </div>
          <div class="btn-shimmer"></div>
        </button>
        <p v-if="!canSubmit && !isSubmitting" class="submit-hint">请先完成左侧数据源配置及设计稿上传</p>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * Compare.vue - 开始对比配置页面
 * 用户在此输入 H5 地址、上传设计稿或输入图片 URL、配置 AI 模型参数并启动对比任务。
 */
import { ref, computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
// 从常量配置文件导入 UI 枚举和预设
import { AI_MODELS, COMPARE_MODES, VIEWPORT_PRESETS } from '@core/config/constants'
// 导入对比相关的 API 服务
import { compareAPI } from '@core/api/compare'
import { useDialog } from '@modules/composables/useDialog.ts'

const { showError } = useDialog()
const router = useRouter()

/** 
 * 核心业务配置对象
 */
const config = reactive({
  targetMode: 'url',     // 待测对象模式：'url' | 'upload'
  url: '',               // 待测页面 URL
  designMode: 'upload',  // 设计稿模式：'upload' | 'url'
  designSource: '',      // 设计稿 URL 或路径
  aiModel: 'siliconflow',
  engine: 'resemble',
  ignoreAntialiasing: true,
  enableSmartAlignment: true,
  viewport: {
    width: 375,
    height: 667
  }
})

// 常量定义
const availableAiModels = Object.values(AI_MODELS)
const viewportPresets = VIEWPORT_PRESETS
const engines = [
  { value: 'resemble', name: 'Resemble.js', badge: '智能', icon: '🧠', description: '感知对比', scene: '通用/复杂背景', recommended: true },
  { value: 'pixelmatch', name: 'Pixelmatch', badge: '快速', icon: '🎯', description: '像素对比', scene: '静态/高保真' },
  { value: 'odiff', name: 'ODiff', badge: '极速', icon: '⚡', description: '极致性能', scene: '超长图/大批量' }
]

// 待测对象 (Target) 文件处理
const targetFileInput = ref()
const targetFile = ref()
const targetPreview = ref('')
const isDraggingTarget = ref(false)

const triggerTargetFileInput = () => targetFileInput.value?.click()
const handleTargetFileSelect = (e) => {
  const file = e.target.files?.[0]
  if (file) setTargetFile(file)
}
const handleTargetDrop = (e) => {
  isDraggingTarget.value = false
  const file = e.dataTransfer?.files[0]
  if (file?.type.startsWith('image/')) setTargetFile(file)
}
const setTargetFile = (file) => {
  targetFile.value = file
  const reader = new FileReader()
  reader.onload = (e) => targetPreview.value = e.target?.result
  reader.readAsDataURL(file)
}
const clearTargetFile = () => {
  targetFile.value = undefined
  targetPreview.value = ''
}

// 设计稿 (Design) 文件处理
const designFileInput = ref()
const designFile = ref()
const designPreview = ref('')
const isDraggingDesign = ref(false)

const triggerDesignFileInput = () => designFileInput.value?.click()
const handleDesignFileSelect = (e) => {
  const file = e.target.files?.[0]
  if (file) setDesignFile(file)
}
const handleDesignDrop = (e) => {
  isDraggingDesign.value = false
  const file = e.dataTransfer?.files[0]
  if (file?.type.startsWith('image/')) setDesignFile(file)
}
const setDesignFile = (file) => {
  designFile.value = file
  const reader = new FileReader()
  reader.onload = (e) => designPreview.value = e.target?.result
  reader.readAsDataURL(file)
}
const clearDesignFile = () => {
  designFile.value = undefined
  designPreview.value = ''
}

const isSubmitting = ref(false)
const selectedPreset = ref('iPhone SE')

const canSubmit = computed(() => {
  const targetOk = config.targetMode === 'url' ? !!config.url : !!targetFile.value
  const designOk = config.designMode === 'upload' ? !!designFile.value : !!config.designSource
  return targetOk && designOk
})

const handlePresetChange = () => {
  const preset = viewportPresets.find(p => p.name === selectedPreset.value)
  if (preset) {
    config.viewport.width = preset.width
    config.viewport.height = preset.height
  }
}

const handleSubmit = async () => {
  if (!canSubmit.value || isSubmitting.value) return
  isSubmitting.value = true

  try {
    // 1. 处理待测对象
    let targetPath = config.url
    if (config.targetMode === 'upload' && targetFile.value) {
      const res = await compareAPI.uploadDesign(targetFile.value)
      if (!res.success) throw new Error('待测图上传失败')
      targetPath = res.data.url
    }

    // 2. 处理设计稿参考
    let designPath = config.designSource
    if (config.designMode === 'upload' && designFile.value) {
      const res = await compareAPI.uploadDesign(designFile.value)
      if (!res.success) throw new Error('设计稿上传失败')
      designPath = res.data.url
    }

    // 3. 构建最终对比提交配置
    const submitConfig = {
      ...config,
      url: targetPath, // API 内部 url 字段兼任目标路径
      designSource: designPath
    }

    const compareRes = await compareAPI.compare(submitConfig)
    if (compareRes.success) {
      router.push(`/report/${compareRes.data.reportId}`)
    } else {
      throw new Error(compareRes.message)
    }
  } catch (error) {
    showError(error.message || '启动对比失败')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
/* 全局布局 */
.compare-page {
  padding: 2rem 0;
  min-height: 100vh;
  background: #f8fafc;
}

.container-wide {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

/* 顶部标题 */
.page-header {
  margin-bottom: 2rem;
}

.page-title {
  font-size: 1.75rem;
  font-weight: 850;
  color: #0f172a;
  letter-spacing: -0.02em;
}

.page-subtitle {
  color: #64748b;
  margin-top: 4px;
  font-size: 0.9375rem;
}

/* 通用卡片分块 */
.form-section-card {
  background: white;
  border-radius: 20px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.form-section-card:hover {
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  border-color: #cbd5e1;
}

/* 分块头部 */
.section-header-modern {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fafafa;
}

.section-title-group {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.step-badge {
  width: 28px;
  height: 28px;
  background: #0f172a;
  color: white;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 800;
}

.section-title-text {
  font-size: 1.0625rem;
  font-weight: 700;
  color: #1e293b;
}

.section-subtitle-text {
  font-size: 0.75rem;
  color: #94a3b8;
}

.section-content {
  padding: 1.5rem;
}

/* 页面整体布局优化 */
.compare-grid-layout {
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 2rem;
  align-items: start;
}

@media (max-width: 1024px) {
  .compare-grid-layout {
    grid-template-columns: 1fr;
  }
}

.grid-column-left {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.grid-column-right {
  position: sticky;
  top: 2rem;
}

/* 间距辅助类 */
.mt-section { margin-top: 0; } /* 已通过 gap 处理 */
.mt-md { margin-top: 1.25rem; }
.mt-xs { margin-top: 0.75rem; }
.mt-lg { margin-top: 2rem; }

/* 底部全局大按钮 */
.form-footer-global {
  margin-top: 3rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding-bottom: 4rem;
}

.btn-sparkle-large {
  width: 100%;
  max-width: 600px;
  height: 64px;
  background: #0f172a;
  color: #fff;
  border: none;
  border-radius: 18px;
  font-size: 1.25rem;
  font-weight: 850;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  box-shadow: 0 20px 40px -8px rgba(0, 0, 0, 0.2);
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* 激活状态：蓝色高亮 */
.btn-sparkle-large:not(:disabled) {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  box-shadow: 0 20px 40px -8px rgba(37, 99, 235, 0.4);
}

.btn-sparkle-large:hover:not(:disabled) {
  transform: translateY(-4px) scale(1.02);
  box-shadow: 0 30px 50px -10px rgba(37, 99, 235, 0.5);
}

.btn-sparkle-large:disabled {
  background: #1e293b;
  opacity: 0.5;
  cursor: not-allowed;
  filter: grayscale(1);
}

.submit-hint {
  font-size: 0.8125rem;
  color: #94a3b8;
  font-weight: 600;
}

.full-width-btn {
  display: none; /* 废弃旧类 */
}

/* 配置卡片内部堆叠 */
.config-stack {
  display: flex;
  flex-direction: column;
}

/* 引擎卡片垂直堆叠优化 */
.engine-cards-stack {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

/* 开关项垂直排列 */
.switches-column-modern {
  display: flex;
  flex-direction: column;
  background: #f1f5f9;
  padding: 1rem;
  border-radius: 12px;
}

/* 输入框样式 */
.input-wrapper-premium {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 14px;
  opacity: 0.5;
  font-size: 1.1rem;
}

.form-input-premium {
  width: 100%;
  height: 50px;
  padding: 0 16px 0 48px;
  background: #fff;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  font-size: 0.9375rem;
  transition: all 0.25s;
}

.form-input-premium:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1);
  outline: none;
}

/* 上传区样式 */
.upload-area-premium {
  width: 100%;
}

.dropzone-modern {
  border: 2px dashed #cbd5e1;
  border-radius: 16px;
  padding: 2rem;
  min-height: 180px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.25s;
  background: #f8fafc;
  position: relative;
  overflow: hidden;
}

.dropzone-modern:hover {
  background: white;
  border-color: #2563eb;
}

.dropzone-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.art-circle {
  width: 56px;
  height: 56px;
  background: #f1f5f9;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.6rem;
  margin-bottom: 1rem;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.03);
}

.dropzone-modern:hover .art-circle {
  transform: translateY(-5px) scale(1.05);
  background: #fff;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.05);
}

.upload-info {
  text-align: center;
}

.upload-info strong {
  display: block;
  font-size: 0.9375rem;
  color: #1e293b;
  margin-bottom: 4px;
}

.upload-info span {
  font-size: 0.75rem;
  color: #64748b;
}

/* 预览图 */
.preview-mini-modern {
  width: 100%;
  height: 180px;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
}

.preview-mini-modern img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #f1f5f9;
}

/* 对齐不同的上传区图标颜色 */
.art-circle.target { color: #f59e0b; }
.art-circle.reference { color: #3b82f6; }

/* 配置网格 */
.grid-two-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem 1.5rem;
}

.config-block {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.full-width {
  grid-column: span 2;
}

/* 引擎药丸卡片 */
.engine-cards-row {
  display: flex;
  gap: 0.75rem;
}

.engine-card-pill {
  flex: 1;
  padding: 0.875rem 1rem;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 0.875rem;
  cursor: pointer;
  background: #fff;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.engine-card-pill:hover {
  border-color: #cbd5e1;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.engine-card-pill.active {
  border-color: #2563eb;
  background: #eff6ff;
  box-shadow: 0 8px 16px rgba(37, 99, 235, 0.08);
}

.engine-icon {
  font-size: 1.5rem;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
}

.engine-text-group {
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 2px;
}

.engine-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.engine-name {
  font-weight: 800;
  color: #1e293b;
  font-size: 0.9375rem;
}

.recommended-badge {
  font-size: 0.625rem;
  background: #fef3c7;
  color: #92400e;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 700;
  border: 1px solid #fde68a;
}

.engine-desc-mini {
  font-size: 0.75rem;
  color: #64748b;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.engine-tag-mini {
  position: absolute;
  top: 0;
  right: 0;
  font-size: 10px;
  font-weight: 900;
  padding: 3px 10px;
  border-bottom-left-radius: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: -2px 2px 4px rgba(0,0,0,0.02);
}

.engine-tag-mini.pixelmatch { background: #fee2e2; color: #b91c1c; }
.engine-tag-mini.resemble { background: #dbeafe; color: #1d4ed8; }
.engine-tag-mini.odiff { background: #fef3c7; color: #92400e; }

/* 底部开关 */
.switches-row-modern {
  display: flex;
  gap: 2rem;
  background: #f1f5f9;
  padding: 0.75rem 1.25rem;
  border-radius: 12px;
}

/* 开关 UI */
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

/* 按钮样式 */
.btn-sparkle {
  width: 100%;
  max-width: 440px;
  height: 60px;
  background: #0f172a;
  color: #fff;
  border: none;
  border-radius: 16px;
  font-size: 1.125rem;
  font-weight: 800;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15);
  transition: all 0.3s;
}

.btn-sparkle:hover {
  transform: translateY(-3px);
  box-shadow: 0 25px 30px -5px rgba(0, 0, 0, 0.25);
  background: #1e293b;
}

.btn-shimmer {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  transition: 0.5s;
}

.btn-sparkle:hover .btn-shimmer {
  left: 100%;
}

/* 切换按钮样式 */
.mode-toggle-pill {
  display: flex;
  background: #f1f5f9;
  padding: 4px;
  border-radius: 12px;
}

.pill-btn {
  padding: 0.5rem 1.125rem;
  border-radius: 9px;
  font-size: 0.8125rem;
  font-weight: 700;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s;
  color: #64748b;
}

.pill-btn.active {
  background: white;
  color: #0f172a;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

/* 预览图悬停动作 */
.preview-actions {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  opacity: 0;
  transition: opacity 0.3s;
  color: white;
}

.preview-mini-modern:hover .preview-actions {
  opacity: 1;
}

.icon-close { font-size: 1.5rem; }

/* 动画 */
.animate-in {
  animation: slideUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 基础辅助样式 */
.ai-label-premium { font-size: 0.75rem; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 2px; }
.premium-select-wrapper { position: relative; }
.premium-select { 
  width: 100%; height: 44px; border-radius: 12px; border: 1.5px solid #e2e8f0; background: white; 
  padding: 0 12px; font-weight: 600; font-size: 0.875rem; appearance: none;
}
.select-chevron { 
  position: absolute; right: 14px; top: 50%; transform: translateY(-50%); 
  width: 12px; height: 12px; pointer-events: none; opacity: 0.4;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke-width='3' stroke='%23000' %3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5' /%3E%3C/svg%3E");
  background-size: contain; background-repeat: no-repeat;
}
.viewport-box-modern { 
  display: flex; gap: 10px; background: #fff; padding: 0 12px; height: 44px; border-radius: 12px; border: 1.5px solid #e2e8f0; align-items: center;
}
.modern-select { border: none; font-weight: 700; font-size: 0.875rem; flex: 1; outline: none; }
.dimension-inputs { display: flex; align-items: center; gap: 4px; }
.mini-input { width: 42px; border: none; text-align: center; font-weight: 800; font-size: 0.8125rem; outline: none; }

/* 响应式调整 */
@media (max-width: 1024px) {
  .compare-grid-layout {
    grid-template-columns: 1fr;
  }
}
</style>
