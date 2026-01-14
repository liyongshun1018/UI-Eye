<template>
  <div class="history-page">
    <div class="container-wide">
      <div class="page-header">
        <h1 class="page-title">对比记录</h1>
        <p class="page-subtitle">查看和管理所有的 UI 走查报告</p>
      </div>

      <div v-if="loading" class="loading-state">
        <div class="spinner spin">⚙️</div>
        <p>正在加载记录...</p>
      </div>

      <div v-else-if="reports.length === 0" class="empty-state card glass">
        <div class="empty-icon">📁</div>
        <h3>暂无对比记录</h3>
        <p>还没有进行过 UI 对比，快去开始第一次走查吧！</p>
        <router-link to="/compare" class="btn btn-primary mt-4">开始对比</router-link>
      </div>

      <div v-else class="history-list">
        <div 
          v-for="report in sortedReports" 
          :key="report.id" 
          class="history-card card-hover clickable"
          @click="viewReport(report.id)"
        >
          <div class="card-main">
            <div class="report-info">
              <div class="report-status" :class="report.status">
                {{ getStatusLabel(report.status) }}
              </div>
              <h3 class="report-url">{{ report.config?.url || '未知页面' }}</h3>
              <div class="report-time">{{ formatDate(report.timestamp) }}</div>
            </div>
            <div class="report-score" v-if="report.status === 'completed'">
              <span class="score-value">{{ report.similarity?.toFixed(1) }}%</span>
              <span class="score-label">还原度</span>
            </div>
          </div>
          <div class="card-actions">
            <button class="btn btn-text">查看详情 →</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { getReportList } from '@/services/compare'
import type { CompareReport } from '@/types'

const router = useRouter()
const reports = ref<CompareReport[]>([])
const loading = ref(true)

const sortedReports = computed(() => {
  return [...reports.value].sort((a, b) => b.timestamp - a.timestamp)
})

const loadReports = async () => {
  try {
    const res = await getReportList()
    if (res.success && res.data) {
      reports.value = res.data
    }
  } catch (err) {
    console.error('加载记录失败:', err)
  } finally {
    loading.value = false
  }
}

const viewReport = (id: string) => {
  router.push(`/report/${id}`)
}

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    'processing': '处理中',
    'completed': '已完成',
    'failed': '已失败'
  }
  return labels[status] || status
}

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(() => {
  loadReports()
})
</script>

<style scoped>
.history-page {
  padding: var(--spacing-xl) 0;
}

.page-header {
  margin-bottom: var(--spacing-xl);
  text-align: left;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.history-card {
  background: white;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--spacing-lg);
  display: flex;
  flex-direction: column;
  transition: all 0.2s ease;
}

.card-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.report-info {
  flex: 1;
}

.report-status {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  margin-bottom: 8px;
  font-weight: 500;
}

.report-status.completed { background: #ecfdf5; color: #10b981; }
.report-status.processing { background: #eff6ff; color: #3b82f6; }
.report-status.failed { background: #fef2f2; color: #ef4444; }

.report-url {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 4px;
  color: var(--text-primary);
  word-break: break-all;
}

.report-time {
  font-size: 14px;
  color: var(--text-tertiary);
}

.report-score {
  text-align: right;
  min-width: 100px;
}

.score-value {
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: var(--accent-primary);
}

.score-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.card-actions {
  margin-top: var(--spacing-md);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--gray-100);
  display: flex;
  justify-content: flex-end;
}

.clickable {
  cursor: pointer;
}

.loading-state, .empty-state {
  text-align: center;
  padding: 100px 0;
}
</style>
