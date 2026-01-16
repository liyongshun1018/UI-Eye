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

      <div v-else>
        <!-- 对比记录表格 -->
        <div class="history-table-container">
          <table class="history-table">
            <thead>
              <tr>
                <th class="col-status">状态</th>
                <th class="col-url">页面地址</th>
                <th class="col-time">对比时间</th>
                <th class="col-score">还原度</th>
                <th class="col-action">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr 
                v-for="report in paginatedReports" 
                :key="report.id"
                class="table-row clickable"
                @click="viewReport(report.id)"
              >
                <td class="col-status">
                  <span class="report-status" :class="report.status">
                    {{ getStatusLabel(report.status) }}
                  </span>
                </td>
                <td class="col-url">
                  <div class="report-url" :title="report.config?.url">
                    {{ report.config?.url || '未知页面' }}
                  </div>
                </td>
                <td class="col-time">
                  <span class="report-time">{{ formatDate(report.timestamp) }}</span>
                </td>
                <td class="col-score">
                  <span v-if="report.status === 'completed'" class="report-score">
                    <strong>{{ report.similarity?.toFixed(1) }}%</strong>
                  </span>
                  <span v-else class="text-muted">-</span>
                </td>
                <td class="col-action">
                  <div class="action-buttons">
                    <button 
                      class="btn btn-sm btn-primary" 
                      @click.stop="viewReport(report.id)"
                      title="查看详情"
                    >
                      查看
                    </button>
                    <button 
                      class="btn btn-sm btn-ghost delete-btn" 
                      @click.stop="deleteReport(report.id)"
                      title="删除记录"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 分页组件 -->
        <div class="pagination" v-if="totalPages > 1">
          <button 
            class="btn btn-sm btn-ghost" 
            :disabled="currentPage === 1"
            @click="currentPage--"
          >
            ← 上一页
          </button>
          <div class="page-numbers">
            <button
              v-for="page in displayPages"
              :key="page"
              class="page-btn"
              :class="{ active: page === currentPage }"
              @click="currentPage = page"
            >
              {{ page }}
            </button>
          </div>
          <button 
            class="btn btn-sm btn-ghost" 
            :disabled="currentPage === totalPages"
            @click="currentPage++"
          >
            下一页 →
          </button>
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
import { useDialog } from '@/composables/useDialog.ts'
import { formatDate } from '@/utils'

const { showConfirm, showError } = useDialog()

const router = useRouter()
const reports = ref<CompareReport[]>([])
const loading = ref(true)

// 分页相关
const currentPage = ref(1)
const pageSize = 10 // 每页显示10条

const sortedReports = computed(() => {
  return [...reports.value].sort((a, b) => b.timestamp - a.timestamp)
})

// 总页数
const totalPages = computed(() => {
  return Math.ceil(sortedReports.value.length / pageSize)
})

// 当前页的数据
const paginatedReports = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  const end = start + pageSize
  return sortedReports.value.slice(start, end)
})

// 显示的页码
const displayPages = computed(() => {
  const pages = []
  const total = totalPages.value
  const current = currentPage.value
  
  if (total <= 7) {
    // 总页数小于等于7，全部显示
    for (let i = 1; i <= total; i++) {
      pages.push(i)
    }
  } else {
    // 总页数大于7，显示省略号
    if (current <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i)
      pages.push('...')
      pages.push(total)
    } else if (current >= total - 3) {
      pages.push(1)
      pages.push('...')
      for (let i = total - 4; i <= total; i++) pages.push(i)
    } else {
      pages.push(1)
      pages.push('...')
      for (let i = current - 1; i <= current + 1; i++) pages.push(i)
      pages.push('...')
      pages.push(total)
    }
  }
  
  return pages
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

const deleteReport = async (id: string) => {
  const confirmed = await showConfirm('确定要删除这条对比记录吗？')
  if (!confirmed) {
    return
  }
  
  try {
    // TODO: 调用删除 API
    // await deleteReportById(id)
    
    // 从列表中移除
    reports.value = reports.value.filter(r => r.id !== id)
    
    // 如果当前页没有数据了，跳转到上一页
    if (paginatedReports.value.length === 0 && currentPage.value > 1) {
      currentPage.value--
    }
  } catch (err) {
    console.error('删除失败:', err)
    showError('删除失败，请重试')
  }
}

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    'processing': '处理中',
    'completed': '已完成',
    'failed': '已失败'
  }
  return labels[status] || status
}

onMounted(() => {
  loadReports()
})
</script>

<style scoped>
.history-page {
  padding: var(--spacing-lg) 0;
}

.page-header {
  margin-bottom: var(--spacing-lg);
  text-align: left;
}

/* 表格容器 */
.history-table-container {
  background: white;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  overflow: hidden;
  margin-bottom: var(--spacing-lg);
  box-shadow: var(--shadow-sm);
}

/* 表格样式 - 基于 UI-UX-Pro-Max 数据表格设计 */
.history-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}

.history-table thead {
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
  border-bottom: 2px solid var(--border-color);
}

.history-table th {
  padding: 0.875rem 1rem;
  text-align: left;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
  line-height: 1.2;
}

.history-table tbody tr {
  border-bottom: 1px solid var(--border-color);
  transition: all var(--transition-fast);
}

.history-table tbody tr:last-child {
  border-bottom: none;
}

.history-table tbody tr:hover {
  background: var(--bg-tertiary);
  transform: scale(1.001);
}

.history-table td {
  padding: 0.75rem 1rem;
  font-size: var(--font-size-sm);
  color: var(--text-primary);
  line-height: 1.5;
  vertical-align: middle;
}

/* 列宽设置 - 优化比例 */
.col-status {
  width: 90px;
}

.col-url {
  width: auto;
  min-width: 350px;
  max-width: 500px;
}

.col-time {
  width: 140px;
}

.col-score {
  width: 90px;
  text-align: center;
}

.col-action {
  width: 140px;
  text-align: right;
  padding-right: 1.25rem;
}

/* 状态标签 - 优化设计 */
.report-status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.375rem 0.75rem;
  border-radius: var(--radius-full);
  font-size: 0.6875rem;
  font-weight: var(--font-weight-bold);
  text-transform: uppercase;
  letter-spacing: 0.025em;
  white-space: nowrap;
  line-height: 1;
}

.report-status.completed { 
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.1) 100%);
  color: var(--success);
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.report-status.processing { 
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.1) 100%);
  color: var(--info);
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.report-status.failed { 
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.1) 100%);
  color: var(--error);
  border: 1px solid rgba(239, 68, 68, 0.3);
}

/* URL 显示 - 优化排版 */
.report-url {
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
  display: block;
}

/* 时间显示 */
.report-time {
  color: var(--text-tertiary);
  font-variant-numeric: tabular-nums;
}

/* 还原度显示 - 优化视觉 */
.report-score strong {
  color: var(--accent-primary);
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-base);
  font-variant-numeric: tabular-nums;
}

.text-muted {
  color: var(--text-tertiary);
}

/* 操作按钮 - 不换行 */
.action-buttons {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  white-space: nowrap;
}

.action-buttons .btn {
  flex-shrink: 0;
}

.delete-btn {
  padding: 0.375rem 0.625rem;
  font-size: 1rem;
  line-height: 1;
  opacity: 0.6;
  transition: all var(--transition-fast);
}

.delete-btn:hover {
  opacity: 1;
  background: rgba(239, 68, 68, 0.1);
  color: var(--error);
  transform: scale(1.1);
}

.clickable {
  cursor: pointer;
}

/* 分页样式 */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-lg) 0;
}

.page-numbers {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.page-btn {
  min-width: 2.5rem;
  height: 2.5rem;
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  background: white;
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all var(--transition-base);
}

.page-btn:hover:not(.active) {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

.page-btn.active {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
  color: white;
  font-weight: var(--font-weight-semibold);
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 加载和空状态 */
.loading-state, .empty-state {
  text-align: center;
  padding: var(--spacing-2xl) 0;
}

.spinner {
  font-size: 2rem;
  margin-bottom: var(--spacing-md);
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: var(--spacing-md);
}

.mt-4 {
  margin-top: var(--spacing-lg);
}

/* 响应式 */
@media (max-width: 768px) {
  .card-content {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .report-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }
  
  .pagination {
    flex-wrap: wrap;
  }
  
  .page-numbers {
    order: 3;
    width: 100%;
    justify-content: center;
    margin-top: var(--spacing-sm);
  }
}
</style>

