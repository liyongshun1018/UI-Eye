<template>
  <div class="history-page">
    <div class="container">
      <div class="page-header">
        <div class="header-left">
          <h1 class="page-title">对比记录</h1>
          <p class="page-subtitle">查看和管理所有的 UI 走查报告</p>
        </div>
        
        <!-- 视图切换 -->
        <div class="view-toggles" v-if="reports.length > 0">
          <button 
            class="toggle-btn" 
            :class="{ active: viewMode === 'gallery' }"
            @click="viewMode = 'gallery'"
          >
            <span class="btn-icon">🖼️</span>
            <span class="btn-label">画廊视图</span>
          </button>
          <button 
            class="toggle-btn" 
            :class="{ active: viewMode === 'list' }"
            @click="viewMode = 'list'"
          >
            <span class="btn-icon">📄</span>
            <span class="btn-label">列表视图</span>
          </button>
        </div>
      </div>

      <div v-if="loading" class="loading-state">
        <div class="spinner spin">⚙️</div>
        <p>正在加载记录...</p>
      </div>

      <EmptyState
        v-else-if="reports.length === 0"
        icon="📁"
        title="暂无对比记录"
        description="还没有进行过 UI 对比，快去开始第一次走查吧！"
        action-text="开始对比"
        @action="router.push('/compare')"
      />

      <div v-else>
        <!-- 列表视图 -->
        <div v-if="viewMode === 'list'" class="history-table-container animate-in">
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
                  <div v-if="report.status === 'completed'" class="similarity-cell">
                    <span 
                      class="similarity-value" 
                      :class="getSimilarityClass(report.similarity)"
                    >
                      {{ report.similarity?.toFixed(1) }}%
                    </span>
                    <div class="similarity-bar">
                      <div 
                        class="similarity-fill" 
                        :class="getSimilarityClass(report.similarity)"
                        :style="{ width: report.similarity + '%' }"
                      ></div>
                    </div>
                  </div>
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

        <!-- 画廊视图 -->
        <div v-else class="history-gallery-grid animate-in">
          <HistoryGalleryCard
            v-for="report in paginatedReports"
            :key="report.id"
            :report="report"
            @click="viewReport(report.id)"
            @delete="deleteReport(report.id)"
          />
        </div>


        <!-- 分页组件 -->
        <Pagination
          v-if="reports.length > 0"
          :current-page="currentPage"
          :total="reports.length" 
          :page-size="pageSize"
          :show-meta="true"
          @update:current-page="val => currentPage = val"
        />
      </div>
    </div>

    <!-- 确认对话框 -->
    <ConfirmDialog
      :show="confirmState.show"
      :title="confirmState.title"
      :message="confirmState.message"
      :confirm-text="confirmState.confirmText"
      :cancel-text="confirmState.cancelText"
      :type="confirmState.type"
      @confirm="handleConfirm"
      @cancel="handleCancel"
    />
  </div>
</template>

<script setup>
/**
 * 走查记录历史页面
 * 
 * @description 汇总展示所有已经完成或正在处理的视觉走查任务报告。
 * 支持分页查看、状态过滤、实时预览报告以及一键删除历史记录。
 */
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { compareAPI } from '@core/api/compare'
import { useDialog } from '@modules/composables/useDialog.ts'
import { useConfirm } from '@modules/composables/useConfirm.ts'
import { getSimilarityClass as getSimilarityClassUtil } from '@core/utils/similarity'
import { formatDate } from '@core/utils'
import EmptyState from '@ui/components/common/EmptyState.vue'
import ConfirmDialog from '@ui/components/common/ConfirmDialog.vue'
import Pagination from '@ui/components/common/Pagination.vue'
import HistoryGalleryCard from '@ui/components/history/HistoryGalleryCard.vue'

const { showError } = useDialog()
const { state: confirmState, confirmDelete, handleConfirm, handleCancel } = useConfirm()

const router = useRouter()
/** @type {import('vue').Ref<any[]>} */
const reports = ref([])
/** @type {import('vue').Ref<boolean>} */
const loading = ref(true)
const viewMode = ref('list') // list | gallery

// 分页相关状态
const currentPage = ref(1)
const pageSize = 10 // 每页固定显示 10 条

/**
 * 计算属性：按时间降序排列所有报告
 */
const sortedReports = computed(() => {
  return [...reports.value].sort((a, b) => b.timestamp - a.timestamp)
})

/**
 * 计算属性：总页数
 */
const totalPages = computed(() => {
  return Math.ceil(sortedReports.value.length / pageSize)
})

/**
 * 计算属性：当前分页需要显示的数据子集
 */
const paginatedReports = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  const end = start + pageSize
  return sortedReports.value.slice(start, end)
})

/**
 * 计算属性：分页器显示的页码数组（含省略号逻辑）
 */
const displayPages = computed(() => {
  const pages = []
  const total = totalPages.value
  const current = currentPage.value
  
  if (total <= 7) {
    for (let i = 1; i <= total; i++) {
      pages.push(i)
    }
  } else {
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

/**
 * 从后端加载对比记录列表
 */
const loadReports = async () => {
  try {
    const res = await compareAPI.getReports()
    if (res.success && res.data) {
      reports.value = res.data
    }
  } catch (err) {
    console.error('获取走查记录列表失败:', err)
  } finally {
    loading.value = false
  }
}

/**
 * 跳转至指定的报告详情页
 * @param {string} id - 报告唯一标识符
 */
const viewReport = (id) => {
  router.push(`/report/${id}`)
}

/**
 * 删除单条走查记录
 * @param {string} id - 报告唯一标识符
 */
const deleteReport = async (id) => {
  const confirmed = await confirmDelete()
  if (!confirmed) return
  
  try {
    // 调用后端物理删除接口
    const res = await compareAPI.deleteReport(id)
    
    if (res.success) {
      // 只有后端成功后才更新前端列表
      reports.value = reports.value.filter(r => r.id !== id)
      
      // 若当前页删空，则自动跳回上一页
      if (paginatedReports.value.length === 0 && currentPage.value > 1) {
        currentPage.value--
      }
    } else {
      showError(res.message || '删除请求被服务器拒绝')
    }
  } catch (err) {
    console.error('删除操作失败:', err)
    showError('由于网络原因，删除操作未能成功，请刷新重试。')
  }
}

/**
 * 获取相似度颜色类名
 */
const getSimilarityClass = (similarity) => {
  return getSimilarityClassUtil(similarity || 0)
}

/**
 * 转换后端状态码为中文枚举提示
 * @param {string} status 
 */
const getStatusLabel = (status) => {
  const labels = {
    'processing': '正在生成',
    'completed': '对比完成',
    'failed': '生成失败'
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
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.view-toggles {
  display: flex;
  gap: 8px;
  background: #f1f5f9;
  padding: 4px;
  border-radius: 8px;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);
}

.toggle-btn {
  padding: 0 16px;
  height: 36px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
  color: var(--text-tertiary);
  font-weight: 500;
  font-size: 0.875rem;
}

.toggle-btn.active {
  background: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  color: var(--accent-primary);
  font-weight: 600;
}

.btn-icon {
  font-size: 1.1rem;
}

.history-gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
  margin-bottom: var(--spacing-lg);
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
  padding: 1.25rem 1rem;
  font-size: var(--font-size-sm);
  color: var(--text-primary);
  line-height: 1.5;
  vertical-align: middle;
  min-height: 60px;
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
  width: 180px;
  white-space: nowrap;
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

/* 相似度单元格 */
.similarity-cell {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  align-items: center;
}

.similarity-value {
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-base);
  font-variant-numeric: tabular-nums;
}

/* 相似度颜色编码 */
.similarity-value.similarity-excellent {
  color: #10b981;
}

.similarity-value.similarity-good {
  color: #3b82f6;
}

.similarity-value.similarity-warning {
  color: #f59e0b;
}

.similarity-value.similarity-poor {
  color: #ef4444;
}

/* 相似度进度条 */
.similarity-bar {
  width: 60px;
  height: 4px;
  background: #e2e8f0;
  border-radius: 2px;
  overflow: hidden;
}

.similarity-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.similarity-fill.similarity-excellent {
  background: #10b981;
}

.similarity-fill.similarity-good {
  background: #3b82f6;
}

.similarity-fill.similarity-warning {
  background: #f59e0b;
}

.similarity-fill.similarity-poor {
  background: #ef4444;
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

