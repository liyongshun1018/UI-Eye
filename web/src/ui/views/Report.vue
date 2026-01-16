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
        <!-- 处理中状态 -->
        <div v-if="reportData.status === 'processing'" class="processing-state card glass">
          <div class="loading-content">
            <div class="spinner-ring"></div>
            <h2>正在分析中...</h2>
            <p>预计需要 15-30 秒，请稍候</p>
            <button class="btn btn-secondary" @click="refreshReport">刷新状态</button>
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
import { ref, onMounted, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { getReport } from '@modules/services/compare'

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

// 路由控制
const route = useRoute()
const reportId = route.params.id

// 页面基础响应式状态
const isLoading = ref(true)      // 是否正在首次加载
const errorMessage = ref('')     // 加载错误消息提示

/** 
 * 报告详情数据
 * @type {import('vue').Ref<import('@core/types').CompareReport | undefined>} 
 */
const reportData = ref()

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
 * 用于给模式切换选择器组件提供选项
 */
const comparisonModes = [
  { label: '并排对比', value: 'side-by-side', icon: '秤' },
  { label: '拨杆对比', value: 'slider', icon: '↔️' },
  { label: '重叠对比', value: 'overlay', icon: '🔄' },
  { label: '差异高亮', value: 'diff', icon: '🎯' }
]

/**
 * 核心方法：加载/刷新报告数据
 * 如果报告处于 'processing' 状态，会启动定时轮询
 */
const loadReport = async () => {
  try {
    const res = await getReport(reportId)
    if (res.success && res.data) {
      reportData.value = res.data
      
      // 智能化轮询策略：如果报告还在处理中，3秒后自动发起下次请求
      if (res.data.status === 'processing' && !errorMessage.value) {
        setTimeout(() => {
          // 确保用户没有离开当前报告页面
          if (reportData.value?.id === reportId) {
            loadReport()
          }
        }, 3000)
      }
    } else {
      errorMessage.value = res.message || '加载报告失败'
    }
  } catch (err) {
    errorMessage.value = '网络错误，请稍后重试'
  } finally {
    isLoading.value = false
  }
}

// 生命周期钩子：挂载后立即请求数据
onMounted(() => {
  loadReport()
})

/**
 * 手动刷新报告状态
 * 适用于系统检测到处理中或用户想获取最新 AI 结果时
 */
const refreshReport = () => {
  isLoading.value = true
  loadReport()
}

/**
 * 业务逻辑：定位到特定的差异区域
 * 当用户在“差异列表”中点击定位按钮时触发
 * @param {import('@core/types').DiffRegion} region - 选中的目标区域对象
 */
const locateRegion = (region) => {
  // 1. 强制切换到“差异高亮”视窗模式，以支持区域绘制
  comparisonMode.value = 'diff'
  
  // 2. 注入选中的区域数据，供子组件 DiffHighlightComparison 渲染红框
  selectedRegion.value = region

  // 3. 视觉联动：通过 DOM API 平滑滚动到对比图片区域，确聚焦重点
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

.error-actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
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
