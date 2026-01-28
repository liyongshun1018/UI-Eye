<template>
  <div class="batch-task-list container animate-in">
    <!-- 紧凑型页头 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">
          <span class="icon">📦</span> 批量任务中心
        </h1>
        <p class="page-subtitle">管理、监控及审计您的自动化视觉对照任务</p>
      </div>
      <button class="btn-primary btn-hero" @click="goToCreate">
        <span class="plus">＋</span> 发起新任务
      </button>
    </div>

    <!-- 顶置统计栏 (专业卡片化) -->
    <div v-if="stats" class="dashboard-stats">
      <div class="stat-card-premium">
        <div class="stat-icon-wrapper">📦</div>
        <div class="stat-content">
          <span class="stat-label">任务总规模</span>
          <span class="stat-value">{{ stats.total }}</span>
        </div>
      </div>
      <div class="stat-card-premium">
        <div class="stat-icon-wrapper running">⚡</div>
        <div class="stat-content">
          <span class="stat-label">活跃执行中</span>
          <span class="stat-value text-glow-blue">{{ stats.running }}</span>
        </div>
      </div>
      <div class="stat-card-premium">
        <div class="stat-icon-wrapper success">✅</div>
        <div class="stat-content">
          <span class="stat-label">历史已达成</span>
          <span class="stat-value">{{ stats.completed }}</span>
        </div>
      </div>
      <div class="stat-card-premium">
        <div class="stat-icon-wrapper failed">⚠️</div>
        <div class="stat-content">
          <span class="stat-label">异常终止</span>
          <span class="stat-value" :class="{ 'text-error': stats.failed > 0 }">{{ stats.failed }}</span>
        </div>
      </div>
    </div>

    <!-- 功能控制栏 -->
    <div class="control-bar glass">
      <div class="status-tabs">
        <button
          v-for="status in statusOptions"
          :key="status.value"
          class="tab-btn"
          :class="{ active: currentStatus === status.value }"
          @click="filterByStatus(status.value)"
        >
          {{ status.label }}
        </button>
      </div>
      
      <div class="search-wrapper">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="按任务名称筛选..."
          class="search-input"
          @input="handleSearch"
        />
        <span class="search-hint">🔍</span>
      </div>
    </div>

    <!-- 数据核心区 -->
    <div class="data-viewport">
      <div v-if="loading" class="loading-state">
        <div class="brand-loader">
          <div class="eye-outer">
            <div class="eye-lid"></div>
            <div class="pupil"></div>
          </div>
          <div class="loader-text">UI-Eye 正在同步...</div>
        </div>
      </div>

      <template v-else-if="tasks.length > 0">
        <!-- 核心表格组件 -->
        <BatchTaskTable
          :tasks="tasks"
          @view="viewTask"
          @monitor="monitorTask"
          @delete="handleDelete"
        />

        <!-- 专业分页器 -->
        <Pagination
          v-if="total > pageSize"
          :current-page="currentPage"
          :total="total"
          :page-size="pageSize"
          @update:current-page="goToPage"
        />
      </template>

      <!-- 空状态 -->
      <EmptyState
        v-else-if="tasks.length === 0 && !loading"
        icon="🍃"
        title="数据沙漠"
        description="当前筛选条件下未发现任何任务记录"
        :action-text="currentStatus !== null ? '查看全部任务' : '发起新任务'"
        @action="currentStatus !== null ? filterByStatus(null) : goToCreate()"
      />
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
 * BatchTaskList.vue - 批量任务管理中心 (重构版)
 * 采用专业表格布局，集成状态流转监控。
 */
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useRouter } from 'vue-router'
import BatchTaskTable from '@ui/components/batch/BatchTaskTable.vue'
import { batchTaskAPI } from '@core/api'
import { useConfirm } from '@modules/composables/useConfirm.ts'
import EmptyState from '@ui/components/common/EmptyState.vue'
import ConfirmDialog from '@ui/components/common/ConfirmDialog.vue'
import Pagination from '@ui/components/common/Pagination.vue'

const { state: confirmState, confirm, handleConfirm, handleCancel } = useConfirm()

const router = useRouter()
const tasks = ref([])
const stats = ref(null)
const loading = ref(false)
const searchQuery = ref('')
const currentStatus = ref(null)
const currentPage = ref(1)
const pageSize = ref(15) // 表格视图下每页 15 条更合适
const total = ref(0)
let autoRefreshTimer = null

/**
 * 状态过滤选项配置
 */
const statusOptions = [
  { label: '全部列表', value: null },
  { label: '待执行', value: 'pending' },
  { label: '进行中', value: 'running' },
  { label: '已完成', value: 'completed' },
  { label: '异常终止', value: 'failed' }
]

const totalPages = computed(() => Math.ceil(total.value / pageSize.value))

const loadTasks = async () => {
  loading.value = true
  try {
    const params = {
      status: currentStatus.value,
      limit: pageSize.value,
      offset: (currentPage.value - 1) * pageSize.value
    }
    const response = await batchTaskAPI.getTasks(params)
    tasks.value = response.data.tasks
    total.value = response.data.total
  } catch (error) {
    console.error('[列表] 同步任务失败:', error)
  } finally {
    loading.value = false
  }
}

const loadStats = async () => {
  try {
    const response = await batchTaskAPI.getStats()
    stats.value = response.data
  } catch (e) {}
}

const filterByStatus = (status) => {
  currentStatus.value = status
  currentPage.value = 1
  loadTasks()
}

const handleSearch = () => {
  // TODO: 后端增加 Search 接口后对接
  console.log('搜索:', searchQuery.value)
}

const viewTask = (taskId) => router.push(`/batch-tasks/${taskId}`)
const monitorTask = (taskId) => router.push(`/batch-tasks/${taskId}`)

const handleDelete = async (taskId) => {
  stopAutoRefresh()
  
  const confirmed = await confirm({
    title: '确认销毁任务？',
    message: '此操作将永久抹除该批量任务及其关联的所有截图与分析报告，动作不可逆。',
    confirmText: '确认销毁',
    cancelText: '保留记录',
    type: 'danger'
  })
  
  if (!confirmed) {
    startAutoRefresh()
    return
  }
  
  try {
    await batchTaskAPI.deleteTask(taskId)
    await Promise.all([loadTasks(), loadStats()])
  } catch (e) {
    console.error('删除任务失败:', e)
  } finally {
    startAutoRefresh()
  }
}

const goToCreate = () => router.push('/batch-screenshot')

const goToPage = (page) => {
  currentPage.value = page
  loadTasks()
}

const startAutoRefresh = () => {
  stopAutoRefresh()
  autoRefreshTimer = setInterval(() => {
    if (stats.value && stats.value.running > 0) {
      loadTasksSilently()
      loadStats()
    }
  }, 5000)
}

const loadTasksSilently = async () => {
  try {
    const params = {
      status: currentStatus.value,
      limit: pageSize.value,
      offset: (currentPage.value - 1) * pageSize.value
    }
    const response = await batchTaskAPI.getTasks(params)
    tasks.value = response.data.tasks
    total.value = response.data.total
  } catch (e) {}
}

const stopAutoRefresh = () => {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer)
    autoRefreshTimer = null
  }
}

onMounted(() => {
  loadTasks()
  loadStats()
  startAutoRefresh()
})

onBeforeUnmount(() => stopAutoRefresh())
</script>

<style scoped>
.batch-task-list {
  padding: var(--spacing-lg) 0;
  min-height: 80vh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: var(--spacing-xl);
  padding: 0 var(--spacing-md);
}

.page-title {
  font-size: 32px;
  font-weight: 800;
  color: var(--text-primary);
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-subtitle {
  color: var(--text-tertiary);
  font-size: 14px;
  letter-spacing: 0.2px;
}

.btn-hero {
  padding: 12px 28px;
  font-size: 15px;
  border-radius: var(--radius-lg);
  box-shadow: 0 8px 20px rgba(14, 165, 233, 0.25);
  border: none !important;
  outline: none !important;
}

.plus { margin-right: 4px; font-weight: bold; }

/* 统计面板 - 专业卡片设计 */
.dashboard-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px; /* Wider gap */
  margin-bottom: 32px;
  padding: 0 var(--spacing-md);
}

.stat-card-premium {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  padding: 24px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  gap: 20px;
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); /* Softer initial shadow */
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.stat-card-premium::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 100%);
  opacity: 0;
  transition: opacity 0.4s;
}

.stat-card-premium:hover {
  transform: translateY(-5px) scale(1.02);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  border-color: rgba(59, 130, 246, 0.3);
  background: rgba(255, 255, 255, 0.85);
}

.stat-card-premium:hover::before {
  opacity: 1;
}

.stat-icon-wrapper {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  transition: transform 0.4s ease;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  background: white; /* Default fallback */
}

.stat-card-premium:hover .stat-icon-wrapper {
  transform: scale(1.1) rotate(5deg);
}

/* Dynamic Gradients for Icons */
.stat-icon-wrapper { background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); color: #64748b; }
.stat-icon-wrapper.running { background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); color: #3b82f6; }
.stat-icon-wrapper.success { background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); color: #10b981; }
.stat-icon-wrapper.failed { background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); color: #ef4444; }

.stat-content {
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 1;
}

.stat-label {
  font-size: 0.875rem;
  color: var(--text-secondary);
  font-weight: 600;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.stat-value {
  font-size: 2rem;
  font-weight: 800;
  color: var(--text-primary);
  font-family: var(--font-mono);
  line-height: 1;
  letter-spacing: -0.05em;
}

.text-glow-blue { 
  color: var(--accent-primary); 
  text-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
}
.text-error { color: var(--error); }

/* 控制栏 */
.control-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  margin: 0 var(--spacing-md) 32px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: var(--shadow-sm);
  transition: all 0.3s;
}

.control-bar:hover {
  background: rgba(255, 255, 255, 0.8);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.status-tabs {
  display: flex;
  gap: 8px;
  padding: 4px;
  background: rgba(241, 245, 249, 0.5);
  border-radius: 12px;
}

.tab-btn {
  padding: 8px 20px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-secondary);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.5);
}

.tab-btn.active {
  background: white;
  color: var(--accent-primary);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.search-wrapper {
  position: relative;
  width: 320px;
}

.search-input {
  width: 100%;
  padding: 12px 44px 12px 16px;
  background: white;
  border: 1px solid transparent;
  border-radius: 12px;
  font-size: 0.9rem;
  outline: none;
  transition: all 0.3s;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
}

.search-input:focus {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.search-hint {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 14px;
  opacity: 0.5;
}

/* 视口 */
.data-viewport {
  padding: 0 var(--spacing-md);
}

.loading-state {
  padding: 100px 0;
  text-align: center;
  color: var(--text-tertiary);
}

.spinner-premium {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(14, 165, 233, 0.1);
  border-top-color: var(--accent-primary);
  border-radius: 50%;
  margin: 0 auto 16px;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* 分页器 */
.pagination-professional {
  margin-top: var(--spacing-lg);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: rgba(248, 250, 252, 0.5);
  border-radius: 0 0 var(--radius-lg) var(--radius-lg);
  border: 1px solid var(--border-color);
  border-top: none;
}

.pagination-meta {
  font-size: 12px;
  color: var(--text-tertiary);
  font-weight: 500;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-numbers {
  display: flex;
  gap: 4px;
}

.p-btn, .n-btn {
  height: 28px;
  padding: 0 10px;
  border: 1px solid var(--border-color);
  background: white;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.n-btn {
  width: 28px;
  padding: 0;
  font-family: var(--font-mono);
}

.p-btn:hover:not(:disabled), .n-btn:hover:not(.active) {
  border-color: var(--text-primary);
  background: #f8fafc;
}

.n-btn.active {
  background: var(--text-primary);
  color: white;
  border-color: var(--text-primary);
}

.p-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* 空状态 */
.empty-placeholder {
  padding: 120px 0;
  text-align: center;
}

.empty-art { font-size: 48px; margin-bottom: 16px; opacity: 0.3; }
.btn-text {
  background: none; border: none; color: var(--accent-primary);
  font-weight: 600; cursor: pointer; text-decoration: underline; margin-top: 12px;
}

/* 弹窗 */
.modal-backdrop-blur {
  position: fixed; inset: 0; z-index: 2000;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(8px);
  display: flex; justify-content: center; align-items: center;
}

.delete-modal {
  width: 420px; text-align: center; padding: 40px;
  background: var(--bg-glass);
}

.glass-dark { background: rgba(15, 23, 42, 0.9); color: white; }
.glass-dark h3 { color: white; }
.glass-dark p { color: #94a3b8; }

.modal-icon { font-size: 48px; margin-bottom: 20px; }

.modal-footer {
  display: flex; gap: 12px; margin-top: 32px;
}

.btn-cancel {
  flex: 1; padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2);
  background: transparent; color: inherit; cursor: pointer; font-weight: 600;
}

.btn-danger-shimmer {
  flex: 1; padding: 12px; border-radius: 8px; border: none;
  background: linear-gradient(90deg, #ef4444, #f87171, #ef4444);
  background-size: 200% 100%;
  color: white; cursor: pointer; font-weight: 700;
  animation: shimmer-bg 2s infinite linear;
}

@keyframes shimmer-bg {
  to { background-position: -200% 0; }
}

@media (max-width: 1024px) {
  .dashboard-stats { grid-template-columns: repeat(2, 1fr); }
}
</style>
