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
            <div class="spinner spin">⚙️</div>
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
          <router-link to="/compare" class="btn btn-primary">返回重试</router-link>
          <button class="btn btn-secondary mt-2" @click="refreshReport">重新加载</button>
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
                :highlight-region="selectedRegion"
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
          />
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { getReport } from '@/services/compare'
import type { CompareReport } from '../types/index'
import ReportHeader from '@/components/report/ReportHeader.vue'
import ComparisonModeSelector from '@/components/report/ComparisonModeSelector.vue'
import SideBySideComparison from '@/components/report/comparison/SideBySideComparison.vue'
import SliderComparison from '@/components/report/comparison/SliderComparison.vue'
import OverlayComparison from '@/components/report/comparison/OverlayComparison.vue'
import DiffHighlightComparison from '@/components/report/comparison/DiffHighlightComparison.vue'
import DiffRegionsSection from '@/components/report/DiffRegionsSection.vue'
import CSSFixesSection from '@/components/report/CSSFixesSection.vue'

const route = useRoute()
const reportId = route.params.id as string

const isLoading = ref(true)
const errorMessage = ref('')
const reportData = ref<CompareReport>()
const comparisonMode = ref('side-by-side')
const showOriginalDiff = ref(false)
const selectedRegion = ref<any>(null)

// 模式定义
const comparisonModes = [
  { label: '并排对比', value: 'side-by-side', icon: '⚖️' },
  { label: '拨杆对比', value: 'slider', icon: '↔️' },
  { label: '重叠对比', value: 'overlay', icon: '🔄' },
  { label: '差异高亮', value: 'diff', icon: '🎯' }
]

// 加载报告
const loadReport = async () => {
  try {
    const res = await getReport(reportId)
    if (res.success && res.data) {
      reportData.value = res.data
      
      // 如果还在处理中，3秒后自动刷新
      if (res.data.status === 'processing' && !errorMessage.value) {
        setTimeout(() => {
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

onMounted(() => {
  loadReport()
})

// 刷新报告
const refreshReport = () => {
  isLoading.value = true
  loadReport()
}

// 定位到区域
const locateRegion = (region: any) => {
  // 切换到差异高亮模式
  comparisonMode.value = 'diff'
  
  // 记录选中的区域
  selectedRegion.value = region

  // 滚动到图片对比区域
  nextTick(() => {
    const comparisonSection = document.querySelector('.image-comparison')
    if (comparisonSection) {
      comparisonSection.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  })
}

// 监听模式切换，如果是手动切换模式，清除选中的高亮区域
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

.spinner {
  font-size: 48px;
  margin-bottom: 24px;
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
