<template>
  <div class="report-page">
    <div class="container">
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
        <ProcessingState
          v-if="reportData.status === 'processing'"
          :progress="reportData.progress || 0"
          :step-text="reportData.stepText"
        />

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

          <!-- 报告头部不再包含操作按钮 -->

          <!-- 图片对比画廊 -->
          <ComparisonGallery
            v-model="comparisonMode"
            v-model:selected-region="selectedRegion"
            :report-data="reportData"
            @locate="locateRegion"
          />

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
         </template>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * Report.vue - 报告详情主容器
 * 
 * 职责：
 * 1. 路由中心：解析 URL 中的 reportId 并初始化数据加载。
 * 2. 状态分发：实时同步 Pinia Store 中的报告状态（加载中、成功、异常、执行中）。
 * 3. 业务联动：协调“差异区域列表”与“对比画廊”之间的双向锚点定位导航。
 */
import { ref, onMounted, watch, nextTick, computed, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useReportStore } from '@modules/stores/report'

// 模块化原子组件导入
import ProcessingState from '@ui/components/report/ProcessingState.vue'
import ReportHeader from '@ui/components/report/ReportHeader.vue'
import ComparisonGallery from '@ui/components/report/ComparisonGallery.vue'
import DiffRegionsSection from '@ui/components/report/DiffRegionsSection.vue'
import CSSFixesSection from '@ui/components/report/CSSFixesSection.vue'

// 基础设施初始化
const route = useRoute()
const reportId = route.params.id
const reportStore = useReportStore()

/** 
 * 数据映射：将 Store 中的响应式状态映射为本地只读计算属性
 */
/** @type {import('vue').ComputedRef<boolean>} */
const isLoading = computed(() => reportStore.loading)
/** @type {import('vue').ComputedRef<string | null>} */
const errorMessage = computed(() => reportStore.error)
/** @type {import('vue').ComputedRef<import('@core/types').CompareReport | null>} */
const reportData = computed(() => reportStore.currentReport)

/** 
 * 视图交互状态：控制当前展示的视觉对比模式
 * @type {import('vue').Ref<'side-by-side' | 'slider' | 'overlay' | 'diff'>} 
 */
const comparisonMode = ref('side-by-side')

/** 
 * 视觉锚点：当前页面关注的核心差异区域（如点击某个红框后激活）
 * @type {import('vue').Ref<import('@core/types').DiffRegion | null>} 
 */
const selectedRegion = ref(null)

/**
 * 页面挂载：触发首次异步数据拉取
 */
onMounted(() => {
  reportStore.fetchReport(reportId)
})

/**
 * 页面销毁：清理内存中的报告缓存，防止数据交叉污染
 */
onUnmounted(() => {
  reportStore.reset()
})

/**
 * 界面交互：手动重启状态刷新轮询
 */
const refreshReport = () => {
  reportStore.fetchReport(reportId)
}

/**
 * 核心交互：智能定位至特定差异区
 * 逻辑：
 * 1. 强制切换 UI 模式为“差异高亮 (diff)”。
 * 2. 设置选中的 Region 数据。
 * 3. 执行平滑滚动，将用户的视觉中心引导至图片对比区。
 */
/**
 * 核心交互：智能定位至特定差异区
 * @param {import('@core/types').DiffRegion} region - 目标差异区域
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
 * 核心交互：外部预览
 * 将用户引导至被测 URL 进行人工现场校验。
 */
const openPreview = (fix) => {
  const url = reportData.value?.config?.url
  if (url) {
    window.open(url, '_blank')
  }
}


</script>

<style scoped>
.report-page {
  min-height: 100vh;
  padding: var(--spacing-lg) 0;
  /* Removed background: #f8fafc; to show global gradient */
}

.container {
  max-width: 1200px; /* Restored to 1200px for consistency */
  margin: 0 auto;
  padding: 0 var(--spacing-lg);
}

.report-content {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  padding: 24px;
  margin-top: 20px;
}

/* 状态展示 */
.loading-state, .error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 24px;
  text-align: center;
}

.spinner {
  font-size: 48px;
  margin-bottom: 24px;
}

/* Mask Editor Workspace */
.mask-editor-workspace {
  margin-top: 32px;
  border-top: 1px solid var(--border-color);
  padding-top: 32px;
}

.workspace-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.workspace-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-actions {
  display: flex;
  gap: 12px;
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
  .container {
    padding: 0 var(--spacing-md);
  }
}
</style>
