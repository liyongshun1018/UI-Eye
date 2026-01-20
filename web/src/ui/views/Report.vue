<template>
  <div class="report-page">
    <div class="container-wide">
      <!-- 加载状态 -->
      <div v-if="isLoading" class="loading-state">
        <div class="spinner spin">⚙️</div>
        <p>正在生成对比报告...</p>
      </div>

      <!-- 错误状态 -->
      <div v-else-if="errorMessage" class="error-state card glass">
        <div class="error-icon">❌</div>
        <h2>加载失败</h2>
        <p>{{ errorMessage }}</p>
        <router-link to="/compare" class="btn btn-primary">返回重试</router-link>
      </div>

      <!-- 报告内容 -->
      <div v-else-if="reportData" class="report-content fade-in">
        <!-- 进度条处理中状态 -->
        <div v-if="reportData.status === 'processing'" class="processing-state card glass-modern animate-in">
          <div class="processing-inner">
            <div class="processing-status-header">
              <div class="progress-percentage-giant">{{ reportData.progress || 0 }}<span class="unit">%</span></div>
              <div class="status-badge-pulse">AI 视觉分析进行中</div>
            </div>

            <!-- 高保真进度条 -->
            <div class="progress-container-premium">
              <div 
                class="progress-bar-shimmer" 
                :style="{ width: `${Math.max(reportData.progress || 0, 5)}%` }"
              >
                <div class="shimmer-effect"></div>
              </div>
            </div>

            <!-- 动态步骤日志 -->
            <div class="execution-log-container">
              <div class="log-indicator">
                <div class="pulse-dot"></div>
                <p class="current-step-text">{{ reportData.stepText || '正在初始化对比引擎并准备捕获环境...' }}</p>
              </div>
              
              <div class="progress-steps-visual">
                <div :class="['step-node', { done: reportData.progress >= 30, active: reportData.progress < 30 }]">
                  <div class="node-icon">📸</div>
                  <span class="node-label">采样捕获</span>
                </div>
                <div class="step-connector" :class="{ filled: reportData.progress >= 40 }"></div>
                <div :class="['step-node', { done: reportData.progress >= 60, active: reportData.progress >= 30 && reportData.progress < 60 }]">
                  <div class="node-icon">⚖️</div>
                  <span class="node-label">像素对比</span>
                </div>
                <div class="step-connector" :class="{ filled: reportData.progress >= 70 }"></div>
                <div :class="['step-node', { done: reportData.progress >= 90, active: reportData.progress >= 60 && reportData.progress < 90 }]">
                  <div class="node-icon">🧠</div>
                  <span class="node-label">AI 诊断</span>
                </div>
                <div class="step-connector" :class="{ filled: reportData.progress >= 95 }"></div>
                <div :class="['step-node', { done: reportData.progress >= 100, active: reportData.progress >= 90 && reportData.progress < 100 }]">
                  <div class="node-icon">📄</div>
                  <span class="node-label">生成报告</span>
                </div>
              </div>
            </div>
            
            <p class="hint-text-premium">预计还需 10-20 秒，请勿刷新页面</p>
          </div>
        </div>

        <!-- 失败状态 -->
        <div v-else-if="reportData.status === 'failed'" class="error-state card glass">
          <div class="error-icon">❌</div>
          <h2>分析失败</h2>
          <p>{{ reportData.error || '可能是由于截图超时或 AI 响应异常导致' }}</p>
          <div class="error-actions">
            <router-link to="/compare" class="btn btn-primary">返回重试</router-link>
            <button class="btn btn-secondary" @click="refreshReport">重新加载</button>
          </div>
        </div>

        <!-- 报告完成 -->
        <template v-else-if="reportData.status === 'completed'">
          <!-- 报告头部 -->
          <ReportHeader
            :similarity="reportData.similarity || 0"
            :timestamp="reportData.timestamp"
            :url="reportData.config.url"
          />

          <!-- 图片对比 -->
          <div class="image-comparison card glass compact">
            <ComparisonModeSelector
              v-model="comparisonMode"
              :modes="comparisonModes"
              title="视觉对比"
            />
            
            <div class="comparison-container">
              <!-- 模式 1: 并排对比 -->
              <SideBySideComparison
                v-if="comparisonMode === 'side-by-side'"
                :design-image="reportData.images.design"
                :actual-image="reportData.images.actual"
                :diff-pixels="reportData.diffPixels"
                :similarity="reportData.similarity"
              />
              
              <!-- 模式 2: 重叠对比（Overlay） -->
              <OverlayComparison
                v-else-if="comparisonMode === 'overlay'"
                :design-image="reportData.images.design"
                :actual-image="reportData.images.actual"
              />
              
              <!-- 模式 3: 拨杆对比（Slider） -->
              <SliderComparison
                v-else-if="comparisonMode === 'slider'"
                :design-image="reportData.images.design"
                :actual-image="reportData.images.actual"
              />
              
              <!-- 模式 4: 差异高亮 -->
              <DiffHighlightComparison
                v-else-if="comparisonMode === 'diff'"
                :diff-image="reportData.diffImage?.annotatedUrl || reportData.images.diff"
                :diff-pixels="reportData.diffPixels"
                :similarity="reportData.similarity"
                :regions="reportData.diffRegions"
                :highlight-region="selectedRegion"
                @clear="selectedRegion = null"
                @locate="locateRegion"
              />
              
              <!-- 原始差异图（可选查看） -->
              <div class="original-diff-toggle">
                <button class="btn btn-secondary btn-sm" @click="showOriginalDiff = !showOriginalDiff" style="margin-top: 1rem;">
                  {{ showOriginalDiff ? '隐藏' : '查看' }}像素级差异图
                </button>
                <div v-if="showOriginalDiff" class="original-diff-image">
                  <img :src="reportData.images.diff" alt="像素级差异图" class="comparison-image" />
                  <p class="diff-description">红色区域标注了所有像素级差异点</p>
                </div>
              </div>
            </div>
          </div>

          <!-- 差异区域分析 -->
          <DiffRegionsSection
            v-if="reportData.diffRegions && reportData.diffRegions.length > 0"
            :regions="reportData.diffRegions"
            @locate="locateRegion"
          />

          <!-- CSS 修复建议 -->
           <CSSFixesSection
             v-if="reportData.fixes && reportData.fixes.length > 0"
             :fixes="reportData.fixes"
             @preview="openPreview"
           />
 
           <!-- CSS 预览弹窗 -->
           <CSSPreviewModal
             v-model:show="showPreviewModal"
             :url="previewUrl"
             :css="previewCss"
           />
         </template>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * Report.vue - 报告详情页面
 * 负责展示 AI 对比的具体结果，包括相似度、差异区域定位、CSS 修复建议等。
 * 支持多种对比视图切换。
 */
// @ts-nocheck
import { ref, onMounted, watch, nextTick, computed, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useReportStore } from '@modules/stores/report'

// 基础组件导入
import ReportHeader from '@ui/components/report/ReportHeader.vue'
import ComparisonModeSelector from '@ui/components/report/ComparisonModeSelector.vue'
import SideBySideComparison from '@ui/components/report/comparison/SideBySideComparison.vue'
import SliderComparison from '@ui/components/report/comparison/SliderComparison.vue'
import OverlayComparison from '@ui/components/report/comparison/OverlayComparison.vue'
import DiffHighlightComparison from '@ui/components/report/comparison/DiffHighlightComparison.vue'
import DiffRegionsSection from '@ui/components/report/DiffRegionsSection.vue'
import CSSFixesSection from '@ui/components/report/CSSFixesSection.vue'
import CSSPreviewModal from '@ui/components/report/CSSPreviewModal.vue'

// 路由与 Store
const route = useRoute()
const reportId = route.params.id
const reportStore = useReportStore()

// 指向 Store 的快捷引用
const isLoading = computed(() => reportStore.loading)
const errorMessage = computed(() => reportStore.error)
const reportData = computed(() => reportStore.currentReport)

/** 
 * 当前激活的对比模式
 * @type {import('vue').Ref<'side-by-side' | 'slider' | 'overlay' | 'diff'>} 
 */
const comparisonMode = ref('side-by-side')

/** 是否显示原始像素级差异图 */
const showOriginalDiff = ref(false)

/** 
 * 当前被高亮定位的特定差异区域
 * @type {import('vue').Ref<import('@core/types').DiffRegion | null>} 
 */
const selectedRegion = ref(null)
 
 // CSS 预览弹窗状态
 const showPreviewModal = ref(false)
 const previewUrl = ref('')
 const previewCss = ref('')

/** 
 * 对比模式配置项汇总
 */
const comparisonModes = [
  { label: '并排对比', value: 'side-by-side', icon: '⚖️' },
  { label: '拨杆对比', value: 'slider', icon: '↔️' },
  { label: '重叠对比', value: 'overlay', icon: '🔄' },
  { label: '差异高亮', value: 'diff', icon: '🎯' }
]

// 生命周期钩子
onMounted(() => {
  reportStore.fetchReport(reportId)
})

onUnmounted(() => {
  reportStore.reset()
})

/**
 * 手动刷新报告状态
 */
const refreshReport = () => {
  reportStore.fetchReport(reportId)
}

/**
 * 业务逻辑：定位到特定的差异区域
 */
const locateRegion = (region) => {
  comparisonMode.value = 'diff'
  selectedRegion.value = region

  nextTick(() => {
    const comparisonSection = document.querySelector('.image-comparison')
    if (comparisonSection) {
      comparisonSection.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  })
}

/**
  * 业务逻辑：打开 CSS 效果预览弹窗
  * @param {Object} fix - 包含 suggestedCss 的修复建议对象
  */
 const openPreview = (fix) => {
   previewUrl.value = reportData.value?.config?.url || ''
   previewCss.value = fix.suggestedCss || ''
   showPreviewModal.value = true
 }
 
 /**
  * 联动逻辑监听：
  * 开启监听模式切换，只要用户切离了“差异高亮”模式，就重置选中的区域状态数据
  */
 watch(comparisonMode, (newMode) => {
   if (newMode !== 'diff') {
     selectedRegion.value = null
   }
 })
</script>

<style scoped>
.report-page {
  min-height: 100vh;
  padding: var(--spacing-lg) 0;
  background: #f8fafc;
}

.container-wide {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 var(--spacing-lg);
}

/* 状态展示 */
.loading-state, .error-state, .processing-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 24px;
  text-align: center;
}

/* 高保真处理状态样式 */
.glass-modern {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.1);
  border-radius: 32px;
}

.processing-state {
  max-width: 800px;
  margin: 40px auto;
  padding: 60px 40px;
}

.processing-inner {
  display: flex;
  flex-direction: column;
  gap: 40px;
  align-items: center;
}

.processing-status-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.progress-percentage-giant {
  font-size: 5rem;
  font-weight: 950;
  background: linear-gradient(135deg, #2563eb, #7c3aed);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  line-height: 1;
  letter-spacing: -0.04em;
}

.progress-percentage-giant .unit {
  font-size: 2rem;
  margin-left: 4px;
}

.status-badge-pulse {
  background: #eff6ff;
  color: #2563eb;
  padding: 6px 16px;
  border-radius: 100px;
  font-size: 0.875rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid #dbeafe;
}

.status-badge-pulse::before {
  content: '';
  width: 8px;
  height: 8px;
  background: #2563eb;
  border-radius: 50%;
  animation: pulse-simple 1.5s infinite;
}

@keyframes pulse-simple {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.5); opacity: 0.5; }
  100% { transform: scale(1); opacity: 1; }
}

/* 进度条样式 */
.progress-container-premium {
  width: 100%;
  max-width: 500px;
  height: 12px;
  background: #f1f5f9;
  border-radius: 100px;
  position: relative;
  overflow: hidden;
  border: 1px solid #e2e8f0;
}

.progress-bar-shimmer {
  height: 100%;
  background: linear-gradient(90deg, #2563eb, #3b82f6);
  border-radius: 100px;
  transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
}

.shimmer-effect {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, 
    transparent, 
    rgba(255, 255, 255, 0.4), 
    transparent
  );
  animation: shimmer-swipe 2s infinite;
}

@keyframes shimmer-swipe {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

/* 步骤样式 */
.execution-log-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
  align-items: center;
}

.log-indicator {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #f8fafc;
  padding: 10px 20px;
  border-radius: 16px;
  border: 1px solid #f1f5f9;
}

.current-step-text {
  font-weight: 700;
  color: #1e293b;
  font-size: 1rem;
}

.pulse-dot {
  width: 10px;
  height: 10px;
  background: #2563eb;
  border-radius: 50%;
  position: relative;
}

.pulse-dot::after {
  content: '';
  position: absolute;
  inset: -4px;
  border: 2px solid #2563eb;
  border-radius: 50%;
  animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
}

@keyframes ping {
  75%, 100% { transform: scale(2); opacity: 0; }
}

.progress-steps-visual {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  max-width: 600px;
  justify-content: center;
}

.step-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  position: relative;
  z-index: 2;
  transition: all 0.3s;
}

.node-icon {
  width: 44px;
  height: 44px;
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  transition: all 0.3s;
}

.step-node.done .node-icon {
  border-color: #22c55e;
  background: #f0fdf4;
}

.step-node.active .node-icon {
  border-color: #2563eb;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1);
  transform: scale(1.1);
}

.node-label {
  font-size: 0.75rem;
  font-weight: 800;
  color: #94a3b8;
  text-transform: uppercase;
}

.step-node.done .node-label { color: #22c55e; }
.step-node.active .node-label { color: #2563eb; }

.step-connector {
  flex: 1;
  height: 3px;
  background: #e2e8f0;
  border-radius: 2px;
  position: relative;
  margin-bottom: 24px;
}

.step-connector.filled::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #22c55e;
  transition: width 0.5s;
}

.hint-text-premium {
  font-size: 0.8125rem;
  color: #94a3b8;
  font-weight: 500;
}

.spinner {
  font-size: 48px;
  margin-bottom: 24px;
}

.spinner-ring {
  width: 48px;
  height: 48px;
  margin: 0 auto 24px;
  border: 4px solid rgba(99, 102, 241, 0.2);
  border-top-color: var(--accent-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.spin {
  animation: spin 2s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 图片对比基础容器 */
.image-comparison {
  margin-bottom: var(--spacing-lg);
  padding: var(--spacing-lg);
  position: relative;
}

.comparison-container {
  margin-top: var(--spacing-md);
}

.original-diff-toggle {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
  margin-top: var(--spacing-xl);
  padding-top: var(--spacing-lg);
  border-top: 1px dashed var(--border-color);
}

.original-diff-image {
  max-width: 100%;
  margin-top: var(--spacing-md);
  text-align: center;
}

.comparison-image {
  max-width: 100%;
  border-radius: var(--radius-sm);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  border: 1px solid var(--border-color);
}

.diff-description {
  margin-top: 12px;
  font-size: 14px;
  color: var(--text-tertiary);
}

/* 全局动画 */
.fade-in {
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 768px) {
  .container-wide {
    padding: 0 var(--spacing-md);
  }
}
</style>
