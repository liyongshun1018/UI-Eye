<template>
  <div class="batch-task-list container-wide animate-in">
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
        <div class="spinner-premium"></div>
        <p>正在同步云端数据...</p>
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
        <div v-if="totalPages > 1" class="pagination-professional">
          <div class="pagination-meta">
            显示 {{ (currentPage - 1) * pageSize + 1 }} - {{ Math.min(currentPage * pageSize, total) }} 条，共 {{ total }} 条
          </div>
          <div class="pagination-controls">
            <button
              class="p-btn"
              :disabled="currentPage === 1"
              @click="goToPage(currentPage - 1)"
            >
              PREV
            </button>
            <div class="page-numbers">
              <button 
                v-for="p in totalPages" 
                :key="p"
                class="n-btn"
                :class="{ active: currentPage === p }"
                @click="goToPage(p)"
              >
                {{ p }}
              </button>
            </div>
            <button
              class="p-btn"
              :disabled="currentPage === totalPages"
              @click="goToPage(currentPage + 1)"
            >
              NEXT
            </button>
          </div>
        </div>
      </template>

      <!-- 优雅空状态 -->
      <div v-else class="empty-placeholder">
        <div class="empty-art">🍃</div>
        <h3>数据沙漠</h3>
        <p>当前筛选条件下未发现任何任务记录</p>
        <button v-if="currentStatus !== null" class="btn-text" @click="filterByStatus(null)">全部任务</button>
      </div>
    </div>

    <!-- 危险操作二次确认 -->
    <div v-if="showDeleteConfirm" class="modal-backdrop-blur" @click.self="cancelDelete">
      <div class="delete-modal card glass glass-dark">
        <div class="modal-icon">⚠️</div>
        <h3>确认销毁任务？</h3>
        <p>此操作将永久抹除该批量任务及其关联的所有截图与分析报告，动作不可逆。</p>
        <div class="modal-footer">
          <button class="btn-cancel" @click="cancelDelete">保留记录</button>
          <button class="btn-danger-shimmer" @click="confirmDelete">确 认 销 毁</button>
        </div>
      </div>
    </div>
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
const showDeleteConfirm = ref(false)
const deletingTaskId = ref(null)

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

const handleDelete = (taskId) => {
  stopAutoRefresh()
  deletingTaskId.value = taskId
  showDeleteConfirm.value = true
}

const confirmDelete = async () => {
  showDeleteConfirm.value = false
  const taskId = deletingTaskId.value
  deletingTaskId.value = null
  try {
    await batchTaskAPI.deleteTask(taskId)
    await Promise.all([loadTasks(), loadStats()])
  } catch (e) {} finally {
    startAutoRefresh()
  }
}

const cancelDelete = () => {
  showDeleteConfirm.value = false
  deletingTaskId.value = null
  startAutoRefresh()
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
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-xl);
  padding: 0 var(--spacing-md);
}

.stat-card-premium {
  background: white;
  padding: 20px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  gap: 16px;
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-sm);
  transition: all 0.3s ease;
}

.stat-card-premium:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: var(--accent-primary);
}

.stat-icon-wrapper {
  width: 48px;
  height: 48px;
  background: var(--bg-secondary);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.stat-icon-wrapper.running { background: #eff6ff; }
.stat-icon-wrapper.success { background: #f0fdf4; }
.stat-icon-wrapper.failed { background: #fef2f2; }

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 13px;
  color: var(--text-tertiary);
  font-weight: 500;
}

.stat-value {
  font-size: 28px;
  font-weight: 800;
  color: var(--text-primary);
  font-family: var(--font-mono);
  line-height: 1;
  margin-top: 4px;
}

.text-glow-blue { color: var(--accent-primary); text-shadow: 0 0 10px rgba(14, 165, 233, 0.2); }
.text-error { color: var(--error); }

/* 控制栏 */
.control-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  margin: 0 var(--spacing-md) var(--spacing-md);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
}

.status-tabs {
  display: flex;
  gap: 4px;
}

.tab-btn {
  padding: 6px 16px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn:hover {
  background: rgba(0, 0, 0, 0.04);
}

.tab-btn.active {
  background: var(--accent-primary);
  color: white;
  box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3);
}

.search-wrapper {
  position: relative;
  width: 260px;
}

.search-input {
  width: 100%;
  padding: 8px 36px 8px 12px;
  background: rgba(241, 245, 249, 0.5);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 13px;
  outline: none;
}

.search-input:focus {
  border-color: var(--accent-primary);
  background: white;
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
