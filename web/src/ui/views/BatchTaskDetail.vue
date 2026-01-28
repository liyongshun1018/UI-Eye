<template>
  <div class="batch-task-detail">
    <div v-if="loading" class="loading-state">
      <div class="brand-loader">
        <div class="eye-outer">
          <div class="eye-lid"></div>
          <div class="pupil"></div>
        </div>
        <div class="loader-text">UI-Eye 分析中...</div>
      </div>
    </div>

    <!-- 沉浸式 Hero 头部 -->
    <div v-if="resultData" class="hero-header" :class="{ 'is-running': resultData.task.status === 'running', 'animate-in': !hasLoaded }" style="--delay: 0.1s">
      <div class="mesh-gradient"></div>
      
      <div class="hero-container">
        <!-- 头部左侧：标题与状态 -->
        <div class="hero-left">
          <div class="breadcrumb">
            <button class="btn-back" @click="goBack">
              <span class="icon">←</span>
              <span>返回列表</span>
            </button>
          </div>
          <h1 class="hero-title">
            <span class="emoji">📋</span>
             {{ resultData.task.name }}
          </h1>
          <div class="hero-meta">
            <div class="status-pill" :class="resultData.task.status">
              <span class="pulse-dot" v-if="resultData.task.status === 'running'"></span>
              {{ translateStatus(resultData.task.status) }}
            </div>
            <span class="task-time" v-if="resultData.task.completedAt">
              完成于 {{ formatDate(resultData.task.completedAt) }}
            </span>
            <span class="task-duration" v-if="resultData.task.duration">
              耗时: {{ Math.floor(resultData.task.duration / 60) }}分 {{ resultData.task.duration % 60 }}秒
            </span>
          </div>
        </div>

        <!-- 头部右侧：可视化核心 -->
        <div class="hero-right">
          <!-- 环形进度条 -->
          <div class="circular-progress-wrapper">
            <svg viewBox="0 0 100 100" class="circular-progress">
              <circle class="bg" cx="50" cy="50" r="45"></circle>
              <circle 
                class="fg" 
                cx="50" cy="50" r="45"
                :style="{ 
                  strokeDasharray: '283',
                  strokeDashoffset: 283 - (283 * (resultData.task.progress || (resultData.task.status === 'completed' ? 100 : 0))) / 100
                }"
              ></circle>
            </svg>
            <div class="progress-info-inner">
              <div class="percent">
                {{ resultData.task.status === 'completed' ? '100' : resultData.task.progress }}<span class="unit">%</span>
              </div>
              <div class="label">当前进度</div>
            </div>
          </div>

          <!-- 差异分布图 (Heatmap Strip) -->
          <div class="hero-heatmap-container">
            <div class="heatmap-label">差异分布热力图</div>
            <div class="heatmap-strip">
              <div 
                v-for="item in resultData.items" 
                :key="item.id"
                class="heatmap-cell"
                :class="getSimilarityClass(item.similarity)"
                :title="`${item.url}: ${item.similarity?.toFixed(1)}%`"
                @click="scrollToItem(item.id)"
              ></div>
            </div>
          </div>

          <!-- 核心统计指标 -->
          <div class="hero-stats">
            <div class="hero-stat-item similarity">
              <div class="stat-value" :class="getSimilarityClass(resultData.task.avgSimilarity)">
                {{ resultData.task.avgSimilarity?.toFixed(1) }}%
              </div>
              <div class="stat-label">平均相似度</div>
            </div>
            <div class="hero-stat-item diff">
              <div class="stat-value" :class="resultData.task.totalDiffCount > 0 ? 'warning' : 'success'">
                {{ resultData.task.totalDiffCount }}
              </div>
              <div class="stat-label">总差异点</div>
            </div>
            <div class="hero-stat-item cases">
              <div class="stat-value">{{ resultData.task.total }}</div>
              <div class="stat-label">总页面数</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 导出按钮 (固定在 Hero 右上角) -->
      <div class="hero-actions">
        <button class="btn-export-hero" @click="handleExport">
          <span class="icon">📥</span> 导出 CSV 报告
        </button>
      </div>
    </div>

      <!-- 结果区域 -->
      <div v-if="resultData" class="results-section">
        <div class="section-header" :class="{ 'animate-in': !hasLoaded }" style="--delay: 0.2s">
          <div class="header-left">
            <h3>页面明细 ({{ resultData.items.length }})</h3>
            <div class="filters">
              <span class="filter-label">过滤:</span>
              <button 
                class="filter-btn" 
                :class="{ active: filter === 'all' }" 
                @click="filter = 'all'"
              >全部</button>
              <button 
                class="filter-btn" 
                :class="{ active: filter === 'low' }" 
                @click="filter = 'low'"
              >低还原度 (&lt;95%)</button>
            </div>
          </div>
          
          <!-- 视图切换 -->
          <div class="view-toggles">
            <button 
              class="toggle-btn" 
              :class="{ active: viewMode === 'gallery' }"
              @click="viewMode = 'gallery'"
              title="画廊模式"
            >
              🖼️
            </button>
            <button 
              class="toggle-btn" 
              :class="{ active: viewMode === 'list' }"
              @click="viewMode = 'list'"
              title="列表模式"
            >
              📄
            </button>
          </div>
        </div>

        <!-- 画廊模式 -->
        <div v-if="viewMode === 'gallery'" class="gallery-grid" :class="{ 'animate-in': !hasLoaded }" style="--delay: 0.3s">
          <ResultGalleryCard
            v-for="item in filteredItems"
            :key="item.id"
            :id="`item-${item.id}`"
            :item="item"
            @click="viewReport(item.reportId)"
          />
        </div>

        <!-- 列表模式 -->
        <div v-else class="results-table-container" :class="{ 'animate-in': !hasLoaded }" style="--delay: 0.3s">
          <table class="results-table">
            <thead>
              <tr>
                <th width="60">编号</th>
                <th>页面 URL</th>
                <th width="120">相似度</th>
                <th width="100">差异点</th>
                <th width="100">状态</th>
                <th width="150">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in filteredItems" :key="item.id">
                <td><span class="index-num">#{{ index + 1 }}</span></td>
                <td>
                  <div class="url-cell">
                    <a :href="item.url" target="_blank" class="url-link">{{ item.url }}</a>
                  </div>
                </td>
                <td>
                  <div v-if="item.status === 'completed'" class="similarity-cell">
                    <span class="similarity-value" :class="getSimilarityClass(item.similarity)">
                      {{ item.similarity?.toFixed(1) }}%
                    </span>
                    <div class="similarity-bar">
                      <div 
                        class="similarity-fill" 
                        :class="getSimilarityClass(item.similarity)"
                        :style="{ width: item.similarity + '%' }"
                      ></div>
                    </div>
                  </div>
                  <span v-else>-</span>
                </td>
                <td>
                  <span v-if="item.status === 'completed'" class="diff-count" :class="{ 'has-diff': item.diffCount > 0 }">
                    {{ item.diffCount }}
                  </span>
                  <span v-else>-</span>
                </td>
                <td>
                  <span class="status-dot" :class="item.status"></span>
                  <span class="status-text">{{ translateStatus(item.status) }}</span>
                </td>
                <td>
                  <div class="actions">
                    <button 
                      v-if="item.reportId" 
                      class="btn-text primary" 
                      @click="viewReport(item.reportId)"
                    >
                      查看报告
                    </button>
                    <span v-else-if="item.error" class="error-hint" :title="item.error">查看错误</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
</template>

<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { batchTaskAPI } from '@core/api'
import { useDialog } from '@modules/composables/useDialog.ts'
import { formatDate } from '@core/utils/format'
import { getSimilarityClass as getSimilarityClassUtil } from '@core/utils/similarity'
import ResultGalleryCard from '@ui/components/batch/ResultGalleryCard.vue'

const route = useRoute()
const router = useRouter()
const { showAlert } = useDialog()
const taskId = Number(route.params.id)

const resultData = ref(null)
const loading = ref(true)
const hasLoaded = ref(false) // 标记是否已完成初次加载
const filter = ref('all')
const viewMode = ref('gallery') // 默认视图模式：gallery | list
const pollTimer = ref(null)

const fetchResults = async (isPolling = false) => {
  try {
    const response = await batchTaskAPI.getTaskResults(taskId)
    if (response.success) {
      resultData.value = response.data
      
      // 初次加载成功后设置 hasLoaded
      if (!isPolling) {
        setTimeout(() => {
          hasLoaded.value = true
        }, 1200) // 动画结束后再标记，防止中途闪烁
      }
      
      // 轮询逻辑：如果任务未完成，继续轮询
      const status = resultData.value.task.status
      if (status === 'running' || status === 'pending') {
        clearTimeout(pollTimer.value)
        pollTimer.value = setTimeout(() => fetchResults(true), 2000)
      }
    }
  } catch (error) {
    console.error('获取批量报告失败:', error)
  } finally {
    if (!isPolling) loading.value = false
  }
}

const filteredItems = computed(() => {
  if (!resultData.value) return []
  if (filter.value === 'all') return resultData.value.items
  if (filter.value === 'low') {
    return resultData.value.items.filter(item => item.similarity < 95)
  }
  return resultData.value.items
})

const getSimilarityClass = (val) => {
  return getSimilarityClassUtil(val || 0)
}

const translateStatus = (status) => {
  const map = {
    pending: '等待中',
    running: '进行中',
    completed: '成功',
    failed: '失败'
  }
  return map[status] || status
}

const viewReport = (reportId) => {
  if (reportId) {
    router.push(`/report/${reportId}`)
  }
}

const goBack = () => {
  router.push('/batch-tasks')
}

const handleExport = () => {
  const url = batchTaskAPI.getExportUrl(taskId)
  window.open(url, '_blank')
}

const scrollToItem = (itemId) => {
  const el = document.getElementById(`item-${itemId}`)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    // 添加一个临时的高亮效果
    el.classList.add('highlight-flash')
    setTimeout(() => el.classList.remove('highlight-flash'), 2000)
  }
}

onMounted(() => {
  fetchResults()
})

onUnmounted(() => {
  if (pollTimer.value) clearTimeout(pollTimer.value)
})
</script>

<style scoped>
/* Hero 头部样式 - 浅色沉浸式版本 */
.hero-header {
  position: relative;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 24px;
  overflow: hidden;
  padding: 60px 40px;
  margin-bottom: 40px;
  color: #1e293b;
  box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.05), inset 0 0 0 1px rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(226, 232, 240, 0.8);
}

.mesh-gradient {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: 
    radial-gradient(at 0% 0%, rgba(59, 130, 246, 0.08) 0, transparent 50%),
    radial-gradient(at 100% 0%, rgba(139, 92, 246, 0.05) 0, transparent 50%),
    radial-gradient(at 50% 100%, rgba(59, 130, 246, 0.03) 0, transparent 50%);
  pointer-events: none;
}

.hero-container {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 40px;
}

.hero-left {
  flex: 1;
}

.btn-back {
  background: white;
  border: 1px solid #e2e8f0;
  padding: 8px 16px;
  border-radius: 10px;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s;
  margin-bottom: 24px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.btn-back:hover {
  background: #f8fafc;
  color: #3b82f6;
  border-color: #3b82f6;
  transform: translateX(-4px);
}

.hero-title {
  font-size: 36px;
  font-weight: 850;
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 16px;
  letter-spacing: -0.5px;
  color: #1e293b; /* 修复可见性问题，改为深色 */
}

.hero-meta {
  display: flex;
  align-items: center;
  gap: 20px;
  color: #64748b;
  font-size: 14px;
  font-weight: 500;
}

.status-pill {
  padding: 6px 14px;
  border-radius: 10px;
  font-weight: 700;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-pill.running { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }
.status-pill.completed { background: rgba(16, 185, 129, 0.2); color: #34d399; }
.status-pill.failed { background: rgba(239, 68, 68, 0.2); color: #f87171; }

.pulse-dot {
  width: 8px; height: 8px; background: currentColor; border-radius: 50%;
  box-shadow: 0 0 0 0 currentColor;
  animation: pulse-ring 1.5s infinite;
}

@keyframes pulse-ring {
  0% { box-shadow: 0 0 0 0 rgba(96, 165, 250, 0.4); }
  70% { box-shadow: 0 0 0 8px rgba(96, 165, 250, 0); }
  100% { box-shadow: 0 0 0 0 rgba(96, 165, 250, 0); }
}

.hero-right {
  display: flex;
  align-items: center;
  gap: 48px;
  flex: 1.2;
}

.hero-heatmap-container {
  flex: 1;
  min-width: 200px;
}

.heatmap-label {
  font-size: 11px;
  color: #64748b;
  font-weight: 700;
  text-transform: uppercase;
  margin-bottom: 8px;
  letter-spacing: 0.5px;
}

.heatmap-strip {
  display: flex;
  height: 32px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  padding: 4px;
  gap: 2px;
}

.heatmap-cell {
  flex: 1;
  height: 100%;
  border-radius: 2px;
  cursor: pointer;
  transition: transform 0.2s, filter 0.2s;
}

.heatmap-cell:hover {
  transform: scaleY(1.2);
  filter: brightness(1.1);
  z-index: 2;
}

.heatmap-cell.similarity-excellent { background: #10b981; color: #10b981; }
.heatmap-cell.similarity-good { background: #3b82f6; color: #3b82f6; }
.heatmap-cell.similarity-warning { background: #f59e0b; color: #f59e0b; }
.heatmap-cell.similarity-poor { background: #ef4444; color: #ef4444; }

.circular-progress-wrapper {
  position: relative;
  width: 140px;
  height: 140px;
}

.circular-progress {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.circular-progress circle {
  fill: none;
  stroke-width: 8;
  stroke-linecap: round;
}

.circular-progress .bg {
  stroke: rgba(0, 0, 0, 0.05);
}

.circular-progress .fg {
  stroke: #3b82f6;
  transition: stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  filter: drop-shadow(0 2px 4px rgba(59, 130, 246, 0.2));
}

.progress-info-inner {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.progress-info-inner .percent {
  font-size: 32px;
  font-weight: 900;
  line-height: 1;
  color: #1e293b;
  font-family: var(--font-mono);
}

.progress-info-inner .unit { font-size: 14px; margin-left: 2px; color: #64748b; }
.progress-info-inner .label { font-size: 11px; color: #94a3b8; font-weight: 600; margin-top: 4px; }

.hero-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.hero-stat-item {
  text-align: center;
  padding: 0 16px;
  border-left: 1px solid rgba(0, 0, 0, 0.05);
}

.hero-stat-item:first-child { border: none; }

.hero-stat-item .stat-value {
  font-size: 24px;
  font-weight: 800;
  margin-bottom: 4px;
  color: #1e293b;
}

.hero-stat-item .stat-label {
  font-size: 12px;
  color: #94a3b8;
  font-weight: 600;
  text-transform: uppercase;
}

.stat-value.similarity-excellent { color: #34d399; }
.stat-value.similarity-good { color: #60a5fa; }
.stat-value.similarity-warning { color: #fbbf24; }
.stat-value.similarity-poor { color: #f87171; }
.stat-value.success { color: #34d399; }
.stat-value.warning { color: #f87171; }

.hero-actions {
  position: absolute;
  top: 24px;
  right: 24px;
}

.btn-export-hero {
  background: white;
  border: 1px solid #e2e8f0;
  padding: 10px 20px;
  border-radius: 12px;
  color: #1e293b;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.btn-export-hero:hover {
  background: #f8fafc;
  border-color: #3b82f6;
  color: #3b82f6;
}

@media (max-width: 1024px) {
  .hero-container { flex-direction: column; align-items: flex-start; }
  .hero-right { width: 100%; justify-content: space-between; }
}

@media (max-width: 640px) {
  .hero-right { flex-direction: column; align-items: flex-start; gap: 32px; }
  .hero-stats { grid-template-columns: 1fr; border: none; }
  .hero-stat-item { border: none; text-align: left; padding: 0; }
}

.batch-task-detail {
  max-width: 1400px;
  margin: 0 auto;
  padding: 40px 20px 80px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

/* 入场动画定义 */
.animate-in {
  opacity: 0;
  animation: slide-up-fade 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
  animation-delay: var(--delay, 0s);
}

@keyframes slide-up-fade {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 结果区域 */
.results-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 头部过滤与切换 */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  padding: 16px 24px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 24px;
}

.header-left h3 {
  font-size: 16px;
  font-weight: 700;
  margin: 0;
}

.filters {
  display: flex;
  align-items: center;
  gap: 12px;
}

.filter-label {
  font-size: 13px;
  color: #6b7280;
}

.filter-btn {
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  background: white;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-btn:hover {
  border-color: #3b82f6;
  color: #3b82f6;
}

.filter-btn.active {
  background: #eff6ff;
  color: #3b82f6;
  border-color: #3b82f6;
  font-weight: 600;
}

.view-toggles {
  display: flex;
  gap: 8px;
  background: #f3f4f6;
  padding: 4px;
  border-radius: 8px;
}

.toggle-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.toggle-btn.active {
  background: white;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}

/* 画廊网格布局 */
.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
}

/* 表格样式保持不变 */
.results-table-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.results-table {
  width: 100%;
  border-collapse: collapse;
}

.results-table th {
  background: #f9fafb;
  padding: 12px 24px;
  text-align: left;
  font-size: 13px;
  font-weight: 600;
  color: #4b5563;
}

.results-table td {
  padding: 16px 24px;
  border-bottom: 1px solid #f3f4f6;
  font-size: 14px;
}

.index-num {
  font-family: monospace;
  color: #9ca3af;
}

.url-link {
  color: #3b82f6;
  text-decoration: none;
  font-family: monospace;
  word-break: break-all;
}

.similarity-cell {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  align-items: center;
}

.similarity-value {
  font-weight: 700;
  font-size: 14px;
  font-variant-numeric: tabular-nums;
}

.similarity-value.similarity-excellent { color: #10b981; }
.similarity-value.similarity-good { color: #3b82f6; }
.similarity-value.similarity-warning { color: #f59e0b; }
.similarity-value.similarity-poor { color: #ef4444; }

.similarity-bar {
  width: 80px;
  height: 4px;
  background: #e2e8f0;
  border-radius: 2px;
  overflow: hidden;
}

.similarity-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.similarity-fill.similarity-excellent { background: #10b981; }
.similarity-fill.similarity-good { background: #3b82f6; }
.similarity-fill.similarity-warning { background: #f59e0b; }
.similarity-fill.similarity-poor { background: #ef4444; }

.diff-count.has-diff {
  color: #ef4444;
  font-weight: 700;
}


/* 状态标记点 */
.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 8px;
}

.status-dot.completed { background: #10b981; }
.status-dot.failed { background: #ef4444; }
.status-dot.running { background: #3b82f6; }

.btn-text {
  background: none;
  border: none;
  font-size: 14px;
  cursor: pointer;
  padding: 0;
}

.btn-text.primary { color: #3b82f6; font-weight: 600; }

/* 高亮闪烁动画 */
.highlight-flash {
  animation: flash-border 2s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 10;
}

@keyframes flash-border {
  0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); border-color: var(--accent-primary); }
  20% { box-shadow: 0 0 0 8px rgba(59, 130, 246, 0.4); border-color: #3b82f6; }
  40% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); border-color: var(--accent-primary); }
  60% { box-shadow: 0 0 0 8px rgba(59, 130, 246, 0.4); border-color: #3b82f6; }
  100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
}
</style>


