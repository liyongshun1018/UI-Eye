<template>
  <div class="batch-task-detail">
    <div class="page-header">
      <div class="title-area">
        <button class="btn-icon" @click="goBack">←</button>
        <h1>📋 批量对比汇总报告</h1>
      </div>
      <div class="header-actions">
        <button class="btn-secondary" @click="handleExport">导出 CSV</button>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>正在加载汇总数据...</p>
    </div>

    <div v-else-if="resultData" class="detail-content">
      <!-- 汇总面板 -->
      <div class="summary-grid">
        <div class="summary-card main">
          <div class="card-header">
            <h3>任务概览</h3>
            <span class="task-name">{{ resultData.task.name }}</span>
          </div>
          <div class="stats-row">
            <div class="stat-group">
              <span class="label">完成时间</span>
              <span class="value">{{ formatDate(resultData.task.completedAt) }}</span>
            </div>
            <div class="stat-group">
              <span class="label">总页面数</span>
              <span class="value">{{ resultData.task.total }}</span>
            </div>
            <div class="stat-group">
              <span class="label">成功/失败</span>
              <span class="value">
                <span class="success">{{ resultData.task.success }}</span> / 
                <span class="failed">{{ resultData.task.failed }}</span>
              </span>
            </div>
          </div>
        </div>

        <div class="summary-card score">
          <span class="label">平均相似度</span>
          <div class="score-value" :class="getSimilarityClass(resultData.task.avgSimilarity)">
            {{ resultData.task.avgSimilarity?.toFixed(1) }}%
          </div>
          <div class="score-bar">
            <div 
              class="bar-fill" 
              :style="{ width: `${resultData.task.avgSimilarity}%` }"
              :class="getSimilarityClass(resultData.task.avgSimilarity)"
            ></div>
          </div>
        </div>

        <div class="summary-card diff">
          <span class="label">总差异点数</span>
          <div class="diff-value" :class="resultData.task.totalDiffCount > 0 ? 'warning' : 'success'">
            {{ resultData.task.totalDiffCount }}
          </div>
          <p class="hint">在所有页面中发现的视觉不一致点</p>
        </div>
      </div>

      <!-- 结果表格 -->
      <div class="results-table-container">
        <div class="table-header">
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
            >低还原度 (<95%)</button>
          </div>
        </div>

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
                  <span class="badge" :class="getSimilarityClass(item.similarity)">
                    {{ item.similarity?.toFixed(1) }}%
                  </span>
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
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { batchTaskAPI } from '@core/api'
import { useDialog } from '@modules/composables/useDialog.ts'
import { formatDate } from '@core/utils/format'

const route = useRoute()
const router = useRouter()
const { showAlert } = useDialog()
const taskId = Number(route.params.id)

const resultData = ref(null)
const loading = ref(true)
const filter = ref('all')

const fetchResults = async () => {
  try {
    const response = await batchTaskAPI.getTaskResults(taskId)
    if (response.success) {
      resultData.value = response.data
    }
  } catch (error) {
    console.error('获取批量报告失败:', error)
  } finally {
    loading.value = false
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
  if (val >= 98) return 'high'
  if (val >= 90) return 'mid'
  return 'low'
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
  router.push(`/report/${reportId}`)
}

const goBack = () => {
  router.push(`/batch-tasks/${taskId}`)
}

const handleExport = () => {
  const url = batchTaskAPI.getExportUrl(taskId)
  window.open(url, '_blank')
}

onMounted(() => {
  fetchResults()
})
</script>

<style scoped>
.batch-task-detail {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
}

.title-area {
  display: flex;
  align-items: center;
  gap: 16px;
}

.btn-icon {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  width: 40px;
  height: 40px;
  cursor: pointer;
}

.summary-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 24px;
  margin-bottom: 32px;
}

.summary-card {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}

.summary-card.main .card-header {
  margin-bottom: 16px;
}

.summary-card h3 {
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 4px 0;
}

.task-name {
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
}

.stats-row {
  display: flex;
  gap: 32px;
}

.stat-group .label {
  display: block;
  font-size: 12px;
  color: #9ca3af;
  margin-bottom: 4px;
}

.stat-group .value {
  font-size: 16px;
  font-weight: 600;
}

.stat-group .success { color: #10b981; }
.stat-group .failed { color: #ef4444; }

.summary-card.score, .summary-card.diff {
  align-items: center;
  justify-content: center;
}

.summary-card .label {
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 8px;
}

.score-value {
  font-size: 32px;
  font-weight: 800;
  margin-bottom: 12px;
}

.score-value.high { color: #10b981; }
.score-value.mid { color: #f59e0b; }
.score-value.low { color: #ef4444; }

.score-bar {
  width: 100%;
  height: 6px;
  background: #f3f4f6;
  border-radius: 3px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  transition: width 1s ease-out;
}

.bar-fill.high { background: #10b981; }
.bar-fill.mid { background: #f59e0b; }
.bar-fill.low { background: #ef4444; }

.diff-value {
  font-size: 32px;
  font-weight: 800;
}
.diff-value.success { color: #10b981; }
.diff-value.warning { color: #ef4444; }

.summary-card .hint {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 8px;
}

/* Table Styles */
.results-table-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.table-header {
  padding: 24px;
  border-bottom: 1px solid #f3f4f6;
  display: flex;
  justify-content: space-between;
  align-items: center;
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
}

.filter-btn.active {
  background: #3b82f6;
  color: white;
  border-color: #2563eb;
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

.badge {
  padding: 4px 10px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 12px;
}

.badge.high { background: #d1fae5; color: #065f46; }
.badge.mid { background: #fef3c7; color: #92400e; }
.badge.low { background: #fee2e2; color: #991b1b; }

.diff-count.has-diff {
  color: #ef4444;
  font-weight: 700;
}

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

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 100px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f4f6;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin { to { transform: rotate(360deg); } }
</style>
