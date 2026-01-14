<template>
  <div class="report-page">
    <div class="container-wide">
      <!-- 加载状态 -->
      <div v-if="loading" class="loading-state">
        <div class="spinner spin">⚙️</div>
        <p>正在生成对比报告...</p>
      </div>

      <!-- 错误状态 -->
      <div v-else-if="error" class="error-state card glass">
        <div class="error-icon">❌</div>
        <h2>加载失败</h2>
        <p>{{ error }}</p>
        <router-link to="/compare" class="btn btn-primary">返回重试</router-link>
      </div>

      <!-- 报告内容 -->
      <div v-else-if="report" class="report-content fade-in">
        <!-- 处理中状态 -->
        <div v-if="report.status === 'processing'" class="processing-state card glass">
          <div class="loading-content">
            <div class="spinner spin">⚙️</div>
            <h2>正在分析中...</h2>
            <p>预计需要 15-30 秒，请稍候</p>
            <button class="btn btn-secondary" @click="refreshReport">刷新状态</button>
          </div>
        </div>

        <!-- 失败状态 -->
        <div v-else-if="report.status === 'failed'" class="error-state card glass">
          <div class="error-icon">❌</div>
          <h2>分析失败</h2>
          <p>{{ report.error || '可能是由于截图超时或 AI 响应异常导致' }}</p>
          <router-link to="/compare" class="btn btn-primary">返回重试</router-link>
          <button class="btn btn-secondary mt-2" @click="refreshReport">重新加载</button>
        </div>

        <!-- 报告完成 -->
        <template v-else-if="report.status === 'completed'">
          <!-- 报告头部 -->
          <div class="report-header card glass">
            <div class="header-main">
              <h1 class="report-title">对比报告</h1>
              <div class="report-meta">
                <span>{{ formatDate(report.timestamp) }}</span>
                <span>·</span>
                <span>{{ report.config.url }}</span>
              </div>
            </div>
            <div class="score-display">
              <div class="score-circle">
                <svg viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" class="score-bg" />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    class="score-fill"
                    :style="{ strokeDashoffset: scoreOffset }"
                  />
                </svg>
                <div class="score-text">
                  <div class="score-value">{{ (report.similarity || 0).toFixed(1) }}%</div>
                  <div class="score-label">还原度</div>
                </div>
              </div>
            </div>
          </div>

          <!-- 图片对比 -->
          <div class="image-comparison card glass compact">
            <div class="comparison-header">
              <h2 class="section-title">视觉对比</h2>
              <div class="mode-switcher">
                <button
                  v-for="mode in comparisonModes"
                  :key="mode.value"
                  class="mode-btn"
                  :class="{ active: comparisonMode === mode.value }"
                  @click="comparisonMode = mode.value"
                >
                  {{ mode.icon }} {{ mode.label }}
                </button>
              </div>
            </div>
            
            <div class="comparison-container">
              <!-- 模式 1: 并排对比 -->
              <div v-if="comparisonMode === 'side-by-side'" class="side-by-side-container">
                <div class="comparison-side">
                  <div class="side-label">设计稿</div>
                  <div class="image-box">
                    <img
                      :src="report.images.design"
                      alt="设计稿"
                      class="side-image"
                      :style="{ transform: `scale(${zoomLevel})` }"
                    />
                  </div>
                </div>
                
                <div class="comparison-divider">
                  <div class="divider-line"></div>
                  <div class="diff-stats-badge">
                    <div class="stats-item">
                      <span class="stats-label">差异像素</span>
                      <span class="stats-value">{{ report.diffPixels.toLocaleString() }}</span>
                    </div>
                    <div class="stats-item">
                      <span class="stats-label">相似度</span>
                      <span class="stats-value highlight">{{ report.similarity.toFixed(1) }}%</span>
                    </div>
                  </div>
                </div>
                
                <div class="comparison-side">
                  <div class="side-label">实际页面</div>
                  <div class="image-box">
                    <img
                      :src="report.images.actual"
                      alt="实际页面"
                      class="side-image"
                      :style="{ transform: `scale(${zoomLevel})` }"
                    />
                  </div>
                </div>
                
                <!-- 缩放控制 -->
                <div class="diff-controls">
                  <button class="zoom-btn" @click="zoomIn" title="放大">🔍+</button>
                  <button class="zoom-btn" @click="zoomOut" title="缩小">🔍-</button>
                  <button class="zoom-btn" @click="resetZoom" title="重置">↺</button>
                  <span class="zoom-level">{{ Math.round(zoomLevel * 100) }}%</span>
                </div>
                
                <!-- 差异提示 -->
                <div class="diff-hint-box">
                  <span class="hint-icon">💡</span>
                  <span class="hint-text">左右对比查看差异，可使用缩放查看细节</span>
                </div>
              </div>
              
              <!-- 模式 2: 重叠对比（Overlay） -->
              <div v-else-if="comparisonMode === 'overlay'" class="overlay-container">
                <div class="overlay-viewport">
                  <img :src="report.images.design" alt="设计稿" class="base-layer" />
                  <img 
                    :src="report.images.actual" 
                    alt="实际页面" 
                    class="overlay-layer"
                    :style="{ opacity: overlayOpacity }"
                  />
                </div>
                
                <div class="overlay-controls">
                  <div class="control-group">
                    <label class="control-label">
                      <span class="label-icon">🎨</span>
                      <span>透明度</span>
                      <span class="opacity-value">{{ Math.round(overlayOpacity * 100) }}%</span>
                    </label>
                    <input 
                      type="range" 
                      v-model.number="overlayOpacity" 
                      min="0" 
                      max="1" 
                      step="0.05"
                      class="opacity-slider"
                    />
                    <div class="slider-labels">
                      <span>设计稿</span>
                      <span>实际页面</span>
                    </div>
                  </div>
                  
                  <div class="quick-actions">
                    <button class="quick-btn" @click="overlayOpacity = 0.5">50%</button>
                    <button class="quick-btn" @click="toggleOverlay">切换</button>
                  </div>
                </div>
                
                <div class="overlay-hint">
                  <span class="hint-icon">💡</span>
                  <span>拖动滑块调节透明度，重影效果可快速发现位移和尺寸差异</span>
                </div>
              </div>
              
              <!-- 模式 3: 差异高亮 -->
              <div v-else-if="comparisonMode === 'diff'" class="diff-highlight-container">
                <div class="diff-image-wrapper">
                  <img 
                    :src="report.diffImage?.annotatedUrl || report.images.diff" 
                    alt="差异高亮图" 
                    class="diff-highlight-image"
                    :style="{ transform: `scale(${zoomLevel})` }"
                  />
                </div>
                
                <div class="diff-controls">
                  <button class="zoom-btn" @click="zoomIn" title="放大">🔍+</button>
                  <button class="zoom-btn" @click="zoomOut" title="缩小">🔍-</button>
                  <button class="zoom-btn" @click="resetZoom" title="重置">↺</button>
                  <span class="zoom-level">{{ Math.round(zoomLevel * 100) }}%</span>
                </div>
                
                <div class="diff-stats-panel">
                  <div class="stat-card">
                    <div class="stat-icon">📊</div>
                    <div class="stat-content">
                      <div class="stat-label">相似度</div>
                      <div class="stat-value highlight">{{ report.similarity.toFixed(1) }}%</div>
                    </div>
                  </div>
                  <div class="stat-card">
                    <div class="stat-icon">🔴</div>
                    <div class="stat-content">
                      <div class="stat-label">差异像素</div>
                      <div class="stat-value">{{ report.diffPixels.toLocaleString() }}</div>
                    </div>
                  </div>
                </div>
                
                <div class="diff-hint">
                  <span class="hint-icon">💡</span>
                  <span>红色区域标注了所有像素级差异点，可使用缩放查看细节</span>
                </div>
              </div>
              
              <!-- 原始差异图（可选查看） -->
              <div class="original-diff-toggle">
                <button class="btn btn-secondary btn-sm" @click="showOriginalDiff = !showOriginalDiff" style="margin-top: 1rem;">
                  {{ showOriginalDiff ? '隐藏' : '查看' }}像素级差异图
                </button>
                <div v-if="showOriginalDiff" class="original-diff-image">
                  <img :src="report.images.diff" alt="像素级差异图" class="comparison-image" />
                  <p class="diff-description">红色区域标注了所有像素级差异点</p>
                </div>
              </div>
            </div>
          </div>

          <!-- 差异区域分析 -->
          <div v-if="report.diffRegions && report.diffRegions.length > 0" class="diff-regions-section card glass">
            <div class="section-header">
              <h2 class="section-title">
                差异区域分析
                <span class="regions-count">({{ report.diffRegions.length }} 个区域)</span>
              </h2>
              
              <!-- 优先级过滤器 -->
              <div class="priority-filter">
                <button 
                  v-for="filter in priorityFilters" 
                  :key="filter.value"
                  class="filter-btn"
                  :class="{ active: activePriorityFilter === filter.value }"
                  @click="activePriorityFilter = filter.value"
                >
                  {{ filter.label }}
                </button>
              </div>
            </div>
            
            <div class="regions-hint">
              <span class="hint-icon">💡</span>
              <span>已智能聚合并按优先级排序，点击可定位到对应位置</span>
            </div>
            
            <!-- 关键问题 -->
            <div v-if="criticalRegions.length > 0" class="region-group critical-group">
              <h3 class="group-title">
                <span class="priority-icon">🔴</span>
                关键问题 ({{ criticalRegions.length }})
              </h3>
              <div class="regions-list">
                <div 
                  v-for="region in criticalRegions" 
                  :key="region.id" 
                  class="region-item critical"
                >
                  <div class="region-header">
                    <span class="region-number">{{ region.id }}</span>
                    <span class="region-score">{{ region.score }}分</span>
                  </div>
                  
                  <div class="region-info">
                    <p class="region-desc">{{ region.description }}</p>
                    <div class="region-details">
                      <span class="detail-item">
                        <span class="detail-label">位置:</span>
                        <span class="detail-value">({{ region.x }}, {{ region.y }})</span>
                      </span>
                      <span class="detail-item">
                        <span class="detail-label">尺寸:</span>
                        <span class="detail-value">{{ region.width }}×{{ region.height }}px</span>
                      </span>
                      <span class="detail-item">
                        <span class="detail-label">差异像素:</span>
                        <span class="detail-value">{{ region.pixelCount }}</span>
                      </span>
                    </div>
                  </div>
                  
                  <button class="btn-locate" @click="locateRegion(region)">
                    <span class="locate-icon">🎯</span>
                    定位到区域
                  </button>
                </div>
              </div>
            </div>

            <!-- 重要问题 -->
            <div v-if="highRegions.length > 0" class="region-group high-group">
              <h3 class="group-title">
                <span class="priority-icon">🟠</span>
                重要问题 ({{ highRegions.length }})
              </h3>
              <div class="regions-list">
                <div 
                  v-for="region in highRegions" 
                  :key="region.id" 
                  class="region-item high"
                >
                  <div class="region-header">
                    <span class="region-number">{{ region.id }}</span>
                    <span class="region-score">{{ region.score }}分</span>
                  </div>
                  
                  <div class="region-info">
                    <p class="region-desc">{{ region.description }}</p>
                    <div class="region-details">
                      <span class="detail-item">
                        <span class="detail-label">位置:</span>
                        <span class="detail-value">({{ region.x }}, {{ region.y }})</span>
                      </span>
                      <span class="detail-item">
                        <span class="detail-label">尺寸:</span>
                        <span class="detail-value">{{ region.width }}×{{ region.height }}px</span>
                      </span>
                    </div>
                  </div>
                  
                  <button class="btn-locate" @click="locateRegion(region)">
                    <span class="locate-icon">🎯</span>
                    定位到区域
                  </button>
                </div>
              </div>
            </div>

            <!-- 次要问题（可折叠） -->
            <details v-if="mediumRegions.length > 0" class="region-group medium-group" open>
              <summary class="group-title">
                <span class="priority-icon">🟡</span>
                次要问题 ({{ mediumRegions.length }})
              </summary>
              <div class="regions-list">
                <div 
                  v-for="region in mediumRegions" 
                  :key="region.id" 
                  class="region-item medium"
                >
                  <div class="region-header">
                    <span class="region-number">{{ region.id }}</span>
                    <span class="region-score">{{ region.score }}分</span>
                  </div>
                  
                  <div class="region-info">
                    <p class="region-desc">{{ region.description }}</p>
                    <div class="region-details">
                      <span class="detail-item">
                        <span class="detail-label">位置:</span>
                        <span class="detail-value">({{ region.x }}, {{ region.y }})</span>
                      </span>
                      <span class="detail-item">
                        <span class="detail-label">尺寸:</span>
                        <span class="detail-value">{{ region.width }}×{{ region.height }}px</span>
                      </span>
                    </div>
                  </div>
                  
                  <button class="btn-locate" @click="locateRegion(region)">
                    <span class="locate-icon">🎯</span>
                    定位到区域
                  </button>
                </div>
              </div>
            </details>

            <!-- 低优先级问题（可折叠，默认折叠） -->
            <details v-if="lowRegions.length > 0" class="region-group low-group">
              <summary class="group-title">
                <span class="priority-icon">🟢</span>
                低优先级 ({{ lowRegions.length }})
              </summary>
              <div class="regions-list">
                <div 
                  v-for="region in lowRegions" 
                  :key="region.id" 
                  class="region-item low"
                >
                  <div class="region-header">
                    <span class="region-number">{{ region.id }}</span>
                    <span class="region-score">{{ region.score }}分</span>
                  </div>
                  
                  <div class="region-info">
                    <p class="region-desc">{{ region.description }}</p>
                  </div>
                  
                  <button class="btn-locate" @click="locateRegion(region)">
                    <span class="locate-icon">🎯</span>
                    定位到区域
                  </button>
                </div>
              </div>
            </details>
          </div>

          <!-- CSS 修复建议 -->
          <div class="fixes-section card glass">
            <h2 class="section-title">
              CSS 修复建议
              <span class="fixes-count">({{ report.fixes?.length || 0 }} 项)</span>
            </h2>
            
            <div v-if="!report.fixes || report.fixes.length === 0" class="no-fixes">
              <div class="icon">✅</div>
              <p>太棒了！未发现明显差异</p>
            </div>

            <div v-else class="fixes-list">
              <div
                v-for="(fix, index) in report.fixes"
                :key="index"
                class="fix-item card-hover"
              >
                <div class="fix-header">
                  <span class="fix-priority" :class="`priority-${fix.priority}`">
                    {{ getPriorityLabel(fix.priority) }}
                  </span>
                  <span class="fix-type">{{ getTypeLabel(fix.type) }}</span>
                </div>
                <h3 class="fix-description">{{ fix.description }}</h3>
                <div class="fix-code">
                  <div class="code-block">
                    <div class="code-label">当前样式</div>
                    <code>{{ fix.selector }} { {{ fix.currentCSS }} }</code>
                  </div>
                  <div class="code-arrow">→</div>
                  <div class="code-block">
                    <div class="code-label">建议样式</div>
                    <code>{{ fix.selector }} { {{ fix.suggestedCSS }} }</code>
                    <button class="btn-copy" @click="copyCode(fix.suggestedCSS)">
                      复制
                    </button>
                  </div>
                </div>
                <p v-if="fix.impact" class="fix-impact">{{ fix.impact }}</p>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getReport } from '@/services/compare'
import { PRIORITY_LEVELS, DIFF_TYPES } from '@/config/constants'
import type { CompareReport } from '@/types'

const route = useRoute()
const reportId = route.params.id as string

const loading = ref(true)
const error = ref('')
const report = ref<CompareReport>()
const zoomLevel = ref(1)
const showOriginalDiff = ref(false)
const comparisonMode = ref('side-by-side')
const overlayOpacity = ref(0.5)

const comparisonModes = [
  { label: '并排对比', value: 'side-by-side', icon: '⚖️' },
  { label: '重叠对比', value: 'overlay', icon: '🔄' },
  { label: '差异高亮', value: 'diff', icon: '🎯' }
]

// 计算环形进度条偏移
const scoreOffset = computed(() => {
  if (!report.value || !report.value.similarity) return 283
  const score = report.value.similarity
  const circumference = 2 * Math.PI * 45
  return circumference - (score / 100) * circumference
})

// 缩放控制
const zoomIn = () => {
  if (zoomLevel.value < 3) {
    zoomLevel.value += 0.25
  }
}

const zoomOut = () => {
  if (zoomLevel.value > 0.5) {
    zoomLevel.value -= 0.25
  }
}

const resetZoom = () => {
  zoomLevel.value = 1
}
// Overlay 模式控制
const toggleOverlay = () => {
    overlayOpacity.value = overlayOpacity.value > 0.5 ? 0 : 1
}

// 加载报告
const loadReport = async () => {
  try {
    const res = await getReport(reportId)
    if (res.success && res.data) {
      report.value = res.data
      
      // 如果还在处理中，3秒后自动刷新
      if (res.data.status === 'processing' && !error.value) {
        setTimeout(() => {
          // 只有在当前仍在报告页且未报错时才刷新
          if (report.value?.id === reportId) {
            loadReport()
          }
        }, 3000)
      }
    } else {
      error.value = res.message || '加载报告失败'
    }
  } catch (err) {
    error.value = '网络错误，请稍后重试'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadReport()
})

// 刷新报告
const refreshReport = () => {
  loading.value = true
  loadReport()
}

// 格式化日期
const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleString('zh-CN')
}

// 获取优先级标签
const getPriorityLabel = (priority: string) => {
  return PRIORITY_LEVELS[priority.toUpperCase() as keyof typeof PRIORITY_LEVELS]?.label || priority
}

// 获取类型标签
const getTypeLabel = (type: string) => {
  return DIFF_TYPES[type.toUpperCase() as keyof typeof DIFF_TYPES]?.label || type
}

// 复制代码
const copyCode = async (code: string) => {
  try {
    await navigator.clipboard.writeText(code)
    alert('已复制到剪贴板')
  } catch (err) {
    console.error('复制失败:', err)
  }
}

// 获取区域类型标签
// 优先级过滤器
const activePriorityFilter = ref('all')
const priorityFilters = [
  { value: 'all', label: '全部' },
  { value: 'critical', label: '仅关键' },
  { value: 'high', label: '重要+' }
]

// 按优先级分组的区域
const criticalRegions = computed(() => {
  if (!report.value?.diffRegions) return []
  const regions = report.value.diffRegions.filter((r: any) => r.priority === 'critical')
  if (activePriorityFilter.value === 'all' || activePriorityFilter.value === 'critical') {
    return regions
  }
  return []
})

const highRegions = computed(() => {
  if (!report.value?.diffRegions) return []
  const regions = report.value.diffRegions.filter((r: any) => r.priority === 'high')
  if (activePriorityFilter.value === 'all' || activePriorityFilter.value === 'critical' || activePriorityFilter.value === 'high') {
    return regions
  }
  return []
})

const mediumRegions = computed(() => {
  if (!report.value?.diffRegions) return []
  if (activePriorityFilter.value !== 'all') return []
  return report.value.diffRegions.filter((r: any) => r.priority === 'medium')
})

const lowRegions = computed(() => {
  if (!report.value?.diffRegions) return []
  if (activePriorityFilter.value !== 'all') return []
  return report.value.diffRegions.filter((r: any) => r.priority === 'low')
})

// 区域类型标签
const getRegionTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    layout: '布局差异',
    major: '主要差异',
    medium: '中等差异',
    minor: '细微差异'
  }
  return labels[type] || '差异'
}

// 定位到区域
const locateRegion = () => {
  // 切换到差异高亮模式
  comparisonMode.value = 'diff'
  
  // 滚动到页面顶部，让用户看到差异图
  setTimeout(() => {
    const diffSection = document.querySelector('.diff-highlight-container')
    if (diffSection) {
      diffSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, 100)
}
</script>

<style scoped>
.report-page {
  min-height: 100vh;
  padding: var(--spacing-lg) 0;
}

/* 加载和错误状态 */
/* 紧凑化布局 */
.container-wide {
  max-width: 1200px;
}

.image-comparison.compact {
  padding: var(--spacing-md);
}

.comparison-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
}

.comparison-container {
  display: grid;
  grid-template-columns: 1fr 200px;
  gap: var(--spacing-lg);
}

.image-wrapper {
  background: #f8fafc;
  border-radius: var(--radius-sm);
  padding: var(--spacing-md);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 500px;
  border: 1px solid var(--border-color);
}

.comparison-stats {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.stat-item {
  padding: var(--spacing-md);
  background: #f1f5f9;
  border-radius: var(--radius-sm);
  text-align: center;
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}

.stat-value.highlight {
  color: var(--accent-primary);
  font-size: 24px;
}

.comparison-image {
  max-width: 100%;
  height: auto;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  border: 1px solid var(--border-color);
}

/* 并排对比容器 - 紧凑版 */
.side-by-side-container {
  position: relative;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: var(--spacing-md);
  background: #f8fafc;
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  min-height: 400px;
  grid-column: 1 / -1;
}

.comparison-side {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.side-label {
  text-align: center;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--text-secondary);
  padding: var(--spacing-xs);
  background: white;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-color);
}

.image-box {
  flex: 1;
  background: white;
  border-radius: var(--radius-sm);
  border: 2px solid var(--border-color);
  overflow: auto;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: var(--spacing-md);
}

.side-image {
  max-width: 100%;
  height: auto;
  display: block;
  transition: transform 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* 中间分隔线和统计 */
.comparison-divider {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
}

.divider-line {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 2px;
  background: linear-gradient(to bottom, 
    transparent 0%, 
    var(--accent-primary) 20%, 
    var(--accent-primary) 80%, 
    transparent 100%
  );
}

.diff-stats-badge {
  position: relative;
  background: white;
  border: 2px solid var(--accent-primary);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
  z-index: 5;
}

.stats-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stats-label {
  font-size: 10px;
  color: var(--text-tertiary);
  white-space: nowrap;
}

.stats-value {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}

.stats-value.highlight {
  font-size: 20px;
  color: var(--accent-primary);
}

/* 缩放控制 */
.diff-controls {
  position: absolute;
  top: var(--spacing-md);
  right: var(--spacing-md);
  display: flex;
  gap: 8px;
  background: rgba(255, 255, 255, 0.95);
  padding: 8px;
  border-radius: var(--radius-sm);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 10;
}

.zoom-btn {
  width: 32px;
  height: 32px;
  border: 1px solid var(--border-color);
  background: white;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.zoom-btn:hover {
  background: var(--bg-tertiary);
  transform: scale(1.1);
}

.zoom-level {
  display: flex;
  align-items: center;
  font-size: 12px;
  color: var(--text-secondary);
  padding: 0 8px;
  font-weight: 600;
}

/* 差异提示框 */
.diff-hint-box {
  position: absolute;
  bottom: var(--spacing-md);
  left: 50%;
  transform: translateX(-50%);
  background: rgba(99, 102, 241, 0.95);
  color: white;
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-sm);
  font-size: 13px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  z-index: 10;
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.hint-icon {
  font-size: 16px;
}

.hint-text {
  white-space: nowrap;
}

/* 原始差异图切换 */
.original-diff-toggle {
  grid-column: 1 / -1;
  margin-top: var(--spacing-md);
  text-align: center;
}

.original-diff-image {
  margin-top: var(--spacing-md);
  padding: var(--spacing-md);
  background: white;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-color);
}

.original-diff-image img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 0 auto;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-2xl);
}

.spinner {
  font-size: 2.5rem;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.error-icon {
  font-size: 4rem;
}

/* 报告头部 - 紧凑版 */
.report-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.report-title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  margin-bottom: var(--spacing-xs);
}

.report-meta {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  display: flex;
  gap: var(--spacing-xs);
}

/* 分数圆环 - 紧凑版 */
.score-circle {
  position: relative;
  width: 100px;
  height: 100px;
}

.score-circle svg {
  transform: rotate(-90deg);
  width: 100%;
  height: 100%;
}

.score-bg {
  fill: none;
  stroke: var(--bg-tertiary);
  stroke-width: 8;
}

.score-fill {
  fill: none;
  stroke: var(--accent-primary);
  stroke-width: 8;
  stroke-linecap: round;
  stroke-dasharray: 283;
  transition: stroke-dashoffset 1s ease;
}

.score-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.score-value {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--accent-primary);
}

.score-label {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

/* 图片对比 - 紧凑版 */
.image-comparison {
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.section-title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--spacing-sm);
}

.comparison-tabs {
  display: flex;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
  border-bottom: 1px solid var(--border-color);
}

.tab-button {
  padding: var(--spacing-sm) var(--spacing-md);
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: var(--font-size-base);
  cursor: pointer;
  transition: all var(--transition-base);
  border-bottom: 2px solid transparent;
}

.tab-button:hover {
  color: var(--text-primary);
}

.tab-button.active {
  color: var(--accent-primary);
  border-bottom-color: var(--accent-primary);
}

/* 修复建议 - 紧凑版 */
.fixes-section {
  padding: var(--spacing-md);
}

.fixes-count {
  font-size: var(--font-size-base);
  color: var(--text-secondary);
  font-weight: var(--font-weight-normal);
}

.no-fixes {
  text-align: center;
  padding: var(--spacing-2xl);
}

.no-fixes .icon {
  font-size: 4rem;
  margin-bottom: var(--spacing-md);
}

.fixes-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.fix-item {
  padding: var(--spacing-md);
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
}

.fix-header {
  display: flex;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
}

.fix-priority,
.fix-type {
  padding: 0.25rem 0.75rem;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
}

.fix-priority {
  background: var(--bg-glass);
}

.priority-high {
  color: var(--error);
  border: 1px solid var(--error);
}

.priority-medium {
  color: var(--warning);
  border: 1px solid var(--warning);
}

.priority-low {
  color: var(--success);
  border: 1px solid var(--success);
}

.fix-type {
  background: var(--bg-glass);
  color: var(--text-secondary);
}

.fix-description {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--spacing-md);
}

.fix-code {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-sm);
}

.code-block {
  flex: 1;
  background: var(--bg-secondary);
  padding: var(--spacing-md);
  border-radius: var(--radius-sm);
  position: relative;
}

.code-label {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  margin-bottom: var(--spacing-xs);
}

.code-block code {
  display: block;
  font-family: 'Courier New', monospace;
  font-size: var(--font-size-sm);
  color: var(--accent-primary);
  word-break: break-all;
}

.code-arrow {
  color: var(--text-secondary);
  font-size: var(--font-size-xl);
}

.btn-copy {
  position: absolute;
  top: var(--spacing-xs);
  right: var(--spacing-xs);
  padding: 0.25rem 0.5rem;
  font-size: var(--font-size-xs);
  background: var(--bg-glass);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  cursor: pointer;
  transition: all var(--transition-base);
}

.btn-copy:hover {
  background: var(--bg-glass-hover);
}

.fix-impact {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  font-style: italic;
}

/* 响应式 */
@media (max-width: 1024px) {
  .side-by-side-container {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto auto;
  }
  
  .comparison-divider {
    width: 100%;
    height: 60px;
    flex-direction: row;
  }
  
  .divider-line {
    top: 50%;
    left: 0;
    right: 0;
    bottom: auto;
    width: auto;
    height: 2px;
    transform: translateY(-50%);
    background: linear-gradient(to right, 
      transparent 0%, 
      var(--accent-primary) 20%, 
      var(--accent-primary) 80%, 
      transparent 100%
    );
  }
  
  .diff-stats-badge {
    flex-direction: row;
    gap: var(--spacing-lg);
  }
}

@media (max-width: 768px) {
  .report-header {
    flex-direction: column;
    gap: var(--spacing-lg);
  }

  .fix-code {
    flex-direction: column;
  }

  .code-arrow {
    transform: rotate(90deg);
  }
  
  .comparison-container {
    grid-template-columns: 1fr;
  }
}
/* 模式切换器 */
.mode-switcher {
    display: flex;
    gap: var(--spacing-sm);
    background: var(--bg-tertiary);
    padding: 4px;
    border-radius: var(--radius-sm);
}

.mode-btn {
    padding: var(--spacing-xs) var(--spacing-md);
    background: transparent;
    border: none;
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    transition: all var(--transition-base);
    border-radius: var(--radius-sm);
    white-space: nowrap;
}

.mode-btn:hover {
    background: rgba(99, 102, 241, 0.1);
    color: var(--accent-primary);
}

.mode-btn.active {
    background: white;
    color: var(--accent-primary);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Overlay 重叠对比模式 */
.overlay-container {
    background: #f8fafc;
    border-radius: var(--radius-md);
    padding: var(--spacing-lg);
    min-height: 600px;
}

.overlay-viewport {
    position: relative;
    background: white;
    border-radius: var(--radius-sm);
    border: 2px solid var(--border-color);
    overflow: auto;
    max-height: 700px;
    display: inline-block;
}

.base-layer {
    display: block;
    max-width: 100%;
    height: auto;
}

.overlay-layer {
    position: absolute;
    top: 0;
    left: 0;
    max-width: 100%;
    height: auto;
    transition: opacity 0.3s ease;
    pointer-events: none;
}

.overlay-controls {
    margin-top: var(--spacing-lg);
    padding: var(--spacing-lg);
    background: white;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-color);
}

.control-group {
    margin-bottom: var(--spacing-md);
}

.control-label {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-sm);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--text-primary);
}

.label-icon {
    font-size: 18px;
}

.opacity-value {
    margin-left: auto;
    color: var(--accent-primary);
    font-weight: var(--font-weight-bold);
}

.opacity-slider {
    width: 100%;
    height: 6px;
    border-radius: 3px;
    background: linear-gradient(to right,
            rgba(99, 102, 241, 0.2) 0%,
            var(--accent-primary) 50%,
            rgba(99, 102, 241, 0.2) 100%);
    outline: none;
    -webkit-appearance: none;
}

.opacity-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--accent-primary);
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    transition: all 0.2s;
}

.opacity-slider::-webkit-slider-thumb:hover {
    transform: scale(1.2);
    box-shadow: 0 3px 8px rgba(99, 102, 241, 0.4);
}

.slider-labels {
    display: flex;
    justify-content: space-between;
    margin-top: var(--spacing-xs);
    font-size: var(--font-size-xs);
    color: var(--text-tertiary);
}

.quick-actions {
    display: flex;
    gap: var(--spacing-sm);
}

.quick-btn {
    flex: 1;
    padding: var(--spacing-sm);
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-size: var(--font-size-sm);
    cursor: pointer;
    transition: all 0.2s;
}

.quick-btn:hover {
    background: var(--accent-primary);
    color: white;
    border-color: var(--accent-primary);
}

.overlay-hint {
    margin-top: var(--spacing-md);
    padding: var(--spacing-sm) var(--spacing-md);
    background: rgba(99, 102, 241, 0.1);
    border-left: 3px solid var(--accent-primary);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
}

.overlay-hint .hint-icon {
    font-size: 16px;
}

/* 差异高亮模式 */
.diff-highlight-container {
    position: relative;
    background: #f8fafc;
    border-radius: var(--radius-md);
    padding: var(--spacing-lg);
    min-height: 600px;
}

.diff-image-wrapper {
    background: white;
    border-radius: var(--radius-sm);
    border: 2px solid var(--border-color);
    overflow: auto;
    max-height: 700px;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding: var(--spacing-md);
}

.diff-highlight-image {
    max-width: 100%;
    height: auto;
    display: block;
    transition: transform 0.3s ease;
}

.diff-stats-panel {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-md);
    margin-top: var(--spacing-lg);
}

.stat-card {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-md);
    background: white;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-color);
}

.stat-icon {
    font-size: 24px;
}

.stat-content {
    flex: 1;
}

.stat-label {
    font-size: var(--font-size-xs);
    color: var(--text-tertiary);
    margin-bottom: 4px;
}

.stat-value {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    color: var(--text-primary);
}

.stat-value.highlight {
    font-size: var(--font-size-xl);
    color: var(--accent-primary);
}

@media (max-width: 768px) {
    .mode-switcher {
        flex-wrap: wrap;
    }

    .diff-stats-panel {
        grid-template-columns: 1fr;
    }
    
    .regions-list {
        grid-template-columns: 1fr;
    }
}

/* 差异区域分析面板 */
.diff-regions-section {
    padding: 16px;
    margin-bottom: 16px;
}

.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    flex-wrap: wrap;
    gap: 12px;
}

.section-title {
    font-size: 18px;
    margin: 0;
}

.regions-count {
    font-size: 14px;
    color: var(--text-secondary);
    font-weight: var(--font-weight-normal);
}

.priority-filter {
    display: flex;
    gap: 8px;
}

.filter-btn {
    padding: 6px 16px;
    border: none;
    background: #F3F4F6;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    color: #6B7280;
}

.filter-btn:hover {
    background: #E5E7EB;
    transform: translateY(-1px);
}

.filter-btn.active {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.regions-hint {
    margin-top: 0;
    margin-bottom: 12px;
    padding: 10px 12px;
    background: rgba(99, 102, 241, 0.05);
    border-left: 3px solid var(--accent-primary);
    border-radius: 6px;
    font-size: 13px;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    gap: 8px;
}

.hint-icon {
    font-size: 16px;
}

.regions-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 12px;
}

.region-item {
    padding: 10px 12px;
    background: white;
    border-radius: 6px;
    border-left: 3px solid;
    transition: all 0.2s;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.region-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

/* 优先级组样式 */
.region-group {
    margin-bottom: 16px;
}

.group-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 10px;
    padding: 6px 0;
    cursor: pointer;
}

.priority-icon {
    font-size: 18px;
}

/* 关键问题组 */
.critical-group .group-title {
    color: #DC2626;
}

.critical-group .region-item {
    border-left-color: #DC2626;
}

/* 重要问题组 */
.high-group .group-title {
    color: #EA580C;
}

.high-group .region-item {
    border-left-color: #EA580C;
}

/* 次要问题组 */
.medium-group .group-title {
    color: #CA8A04;
}

.medium-group .region-item {
    border-left-color: #CA8A04;
}

/* 低优先级组 */
.low-group .group-title {
    color: #16A34A;
}

.low-group .region-item {
    border-left-color: #16A34A;
}

.region-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
}

.region-number {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--accent-primary);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: bold;
    flex-shrink: 0;
}

.region-type-badge {
    padding: 4px 12px;
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    color: white;
}

.badge-layout {
    background: #FF6B6B;
}

.badge-major {
    background: #FF8C42;
}

.badge-medium {
    background: #FFD93D;
    color: #333;
}

.badge-minor {
    background: #6BCF7F;
}

.region-info {
    flex: 1;
}

.region-desc {
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-semibold);
    color: var(--text-primary);
    margin-bottom: var(--spacing-sm);
}

.region-details {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.detail-item {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    display: flex;
    gap: var(--spacing-xs);
}

.detail-label {
    font-weight: var(--font-weight-medium);
    color: var(--text-tertiary);
}

.detail-value {
    color: var(--text-primary);
    font-family: 'Courier New', monospace;
}

.btn-locate {
    padding: 6px 12px;
    background: var(--accent-primary);
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
}

.btn-locate:hover {
    background: var(--accent-secondary);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
}

.btn-locate:active {
    transform: translateY(0);
}

.locate-icon {
    font-size: 14px;
}

.diff-hint {
    margin-top: var(--spacing-md);
    padding: var(--spacing-sm) var(--spacing-md);
    background: rgba(99, 102, 241, 0.1);
    border-left: 3px solid var(--accent-primary);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
}

.diff-hint .hint-icon {
    font-size: 16px;
}
</style>
