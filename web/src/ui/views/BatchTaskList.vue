<template>
  <div class="batch-task-list">
    <div class="page-header">
      <h1>📋 批量任务列表</h1>
      <button class="btn-primary" @click="goToCreate">
        <span>➕</span> 创建新任务
      </button>
    </div>

    <!-- 筛选和搜索 -->
    <div class="filters">
      <div class="status-filters">
        <button
          v-for="status in statusOptions"
          :key="status.value"
          class="filter-btn"
          :class="{ active: currentStatus === status.value }"
          @click="filterByStatus(status.value)"
        >
          {{ status.label }}
        </button>
      </div>
      <div class="search-box">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索任务名称..."
          @input="handleSearch"
        />
        <span class="search-icon">🔍</span>
      </div>
    </div>

    <!-- 统计信息 -->
    <div v-if="stats" class="stats-cards">
      <div class="stat-card">
        <div class="stat-value">{{ stats.total }}</div>
        <div class="stat-label">总任务数</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats.running }}</div>
        <div class="stat-label">运行中</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats.completed }}</div>
        <div class="stat-label">已完成</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats.failed }}</div>
        <div class="stat-label">失败</div>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>加载中...</p>
    </div>

    <!-- 任务列表 -->
    <div v-else-if="tasks.length > 0" class="task-list">
      <TaskCard
        v-for="task in tasks"
        :key="task.id"
        :task="task"
        @click="viewTask"
        @view="viewTask"
        @monitor="monitorTask"
        @delete="handleDelete"
      />
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-state">
      <div class="empty-icon">📭</div>
      <h3>暂无任务</h3>
      <p>点击上方按钮创建第一个批量任务</p>
    </div>

    <!-- 分页 -->
    <div v-if="totalPages > 1" class="pagination">
      <button
        class="page-btn"
        :disabled="currentPage === 1"
        @click="goToPage(currentPage - 1)"
      >
        ‹ 上一页
      </button>
      <span class="page-info">
        第 {{ currentPage }} / {{ totalPages }} 页
      </span>
      <button
        class="page-btn"
        :disabled="currentPage === totalPages"
        @click="goToPage(currentPage + 1)"
      >
        下一页 ›
      </button>
    </div>

    <!-- 自定义删除确认对话框 -->
    <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="cancelDelete">
      <div class="confirm-dialog">
        <div class="confirm-icon">⚠️</div>
        <h3>确认删除</h3>
        <p>确定要删除这个任务吗？此操作无法撤销。</p>
        <div class="confirm-actions">
          <button class="btn-cancel" @click="cancelDelete">取消</button>
          <button class="btn-confirm" @click="confirmDelete">确定删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * 批量任务管理中心页面
 * 
 * @description 展示系统中所有的批量截图和视觉对比任务，提供状态筛选、任务统计、实时监控及批量删除功能。
 * 具备自动轮询机制，能够实时反映运行中任务的最新进度。
 */
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useRouter } from 'vue-router'
import TaskCard from '@ui/components/batch/TaskCard.vue'
import { batchTaskAPI } from '@core/api'

const router = useRouter()

/** @type {import('vue').Ref<any[]>} - 当前页展示的任务数据列表 */
const tasks = ref([])
/** @type {import('vue').Ref<any|null>} - 任务概览统计指标 (总数, 运行中, 成功, 失败) */
const stats = ref(null)
/** @type {import('vue').Ref<boolean>} - 是否处在数据初次加载中状态 */
const loading = ref(false)
/** @type {import('vue').Ref<string>} - 搜索过滤关键字 */
const searchQuery = ref('')
/** @type {import('vue').Ref<string|null>} - 当前选中的状态过滤器: 'pending' | 'running' | 'completed' | 'failed' | null */
const currentStatus = ref(null)
/** @type {import('vue').Ref<number>} - 当前所在分页页码 */
const currentPage = ref(1)
/** @type {import('vue').Ref<number>} - 每页显示数量 */
const pageSize = ref(20)
/** @type {import('vue').Ref<number>} - 符合当前条件的任务总条数 */
const total = ref(0)
/** @type {any} - 自动刷新列表的定时器引用 */
let autoRefreshTimer = null
/** @type {import('vue').Ref<boolean>} - 是否展示自定义删除确认框 */
const showDeleteConfirm = ref(false)
/** @type {import('vue').Ref<string|number|null>} - 待删除的任务 ID 暂存 */
const deletingTaskId = ref(null)

/**
 * 状态过滤选项配置
 */
const statusOptions = [
  { label: '全部', value: null },
  { label: '待执行', value: 'pending' },
  { label: '运行中', value: 'running' },
  { label: '已完成', value: 'completed' },
  { label: '失败', value: 'failed' }
]

/**
 * 计算属性：总页数，基于 total 和 pageSize 计算
 */
const totalPages = computed(() => {
  return Math.ceil(total.value / pageSize.value)
})

/**
 * 分页请求任务列表数据
 */
const loadTasks = async () => {
  // 仅在首次加载或切换状态时显示全屏加载，自动刷新时使用静默模式
  loading.value = true
  try {
    const params = {
      status: currentStatus.value,
      limit: pageSize.value,
      offset: (currentPage.value - 1) * pageSize.value
    }
    
    const response = await batchTaskAPI.getTasks(params)
    tasks.value = response.tasks
    total.value = response.total
  } catch (error) {
    console.error('服务端异步获取任务列表失败:', error)
  } finally {
    loading.value = false
  }
}

/**
 * 加载顶部统计指标数据
 */
const loadStats = async () => {
  try {
    const response = await batchTaskAPI.getStats()
    stats.value = response.stats
  } catch (error) {
    console.error('统计指标获取异常:', error)
  }
}

/**
 * 外部触发：根据状态码过滤列表
 * @param {string|null} status 
 */
const filterByStatus = (status) => {
  currentStatus.value = status
  currentPage.value = 1
  loadTasks()
}

/**
 * 外部触发：搜索任务名称
 * @description 当前为本地/前端模拟搜索逻辑，后续需配合后端 API search。
 */
const handleSearch = () => {
  console.log('执行搜索，关键词:', searchQuery.value)
}

/**
 * 动作：跳转到详细的任务报表页面
 * @param {string|number} taskId 
 */
const viewTask = (taskId) => {
  router.push(`/batch-tasks/${taskId}`)
}

/**
 * 动作：跳转到实时进度监控页面
 * @param {string|number} taskId 
 */
const monitorTask = (taskId) => {
  router.push(`/batch-tasks/${taskId}`)
}

/**
 * 删除流程：第一步 - 弹出自定义确认框，并暂停自动刷新避免干扰
 * @param {string|number} taskId 
 */
const handleDelete = (taskId) => {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer)
    autoRefreshTimer = null
  }
  
  deletingTaskId.value = taskId
  showDeleteConfirm.value = true
}

/**
 * 删除流程：第二步 - 执行真正的 API 请求并刷新视图
 */
const confirmDelete = async () => {
  showDeleteConfirm.value = false
  const taskId = deletingTaskId.value
  deletingTaskId.value = null

  try {
    await batchTaskAPI.deleteTask(taskId)
    // 乐观更新：删除成功后全量重载数据
    await Promise.all([loadTasks(), loadStats()])
  } catch (error) {
    console.error('执行任务删除指令失败:', error)
  } finally {
    // 无论成功失败，恢复自动轮询
    startAutoRefresh()
  }
}

/**
 * 删除流程：第三步 - 用户点击取消，恢复定时器
 */
const cancelDelete = () => {
  showDeleteConfirm.value = false
  deletingTaskId.value = null
  startAutoRefresh()
}

/**
 * 动作：跳转至创建批量任务的向导页
 */
const goToCreate = () => {
  router.push('/batch-screenshot')
}

/**
 * 分页器切换页面
 * @param {number} page 
 */
const goToPage = (page) => {
  currentPage.value = page
  loadTasks()
}

/**
 * 智能轮询机制：检测到有“运行中”的任务时，每 5 秒自动同步一次最新状态
 */
const startAutoRefresh = () => {
  stopAutoRefresh()
  
  autoRefreshTimer = setInterval(() => {
    // 仅在任务概况显示有任务正在跑时才触发请求，节省服务端资源
    if (stats.value && stats.value.running > 0) {
      // 执行静默重载（不改变 loading.value 状态）
      loadTasksSilently()
      loadStats()
    }
  }, 5000)
}

/**
 * 静默重载任务列表数据 (不触发 UI loading 旋转图)
 */
const loadTasksSilently = async () => {
  try {
    const params = {
      status: currentStatus.value,
      limit: pageSize.value,
      offset: (currentPage.value - 1) * pageSize.value
    }
    const response = await batchTaskAPI.getTasks(params)
    tasks.value = response.tasks
    total.value = response.total
  } catch (e) { /* ignore silent failure */ }
}

/**
 * 停止轮询
 */
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

onBeforeUnmount(() => {
  stopAutoRefresh()
})
</script>

<style scoped>
.batch-task-list {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h1 {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.filters {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  gap: 16px;
}

.status-filters {
  display: flex;
  gap: 8px;
}

.filter-btn {
  padding: 8px 16px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-btn:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

.filter-btn.active {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

.search-box {
  position: relative;
  width: 300px;
}

.search-box input {
  width: 100%;
  padding: 10px 40px 10px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s ease;
}

.search-box input:focus {
  border-color: #3b82f6;
}

.search-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 16px;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  text-align: center;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #6b7280;
}

.loading {
  text-align: center;
  padding: 60px 20px;
}

.spinner {
  width: 40px;
  height: 40px;
  margin: 0 auto 16px;
  border: 4px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.empty-state {
  text-align: center;
  padding: 80px 20px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-state h3 {
  margin: 0 0 8px;
  font-size: 20px;
  color: #1f2937;
}

.empty-state p {
  margin: 0;
  color: #6b7280;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 32px;
}

.page-btn {
  padding: 8px 16px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s ease;
}

.page-btn:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #d1d5db;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  font-size: 14px;
  color: #6b7280;
}

/* 自定义确认对话框样式 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.confirm-dialog {
  background: white;
  border-radius: 16px;
  padding: 32px;
  max-width: 400px;
  width: 90%;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.confirm-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.confirm-dialog h3 {
  margin: 0 0 12px;
  font-size: 20px;
  color: #1f2937;
}

.confirm-dialog p {
  margin: 0 0 24px;
  color: #6b7280;
  font-size: 14px;
  line-height: 1.6;
}

.confirm-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.btn-cancel,
.btn-confirm {
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-cancel {
  background: #f3f4f6;
  color: #374151;
}

.btn-cancel:hover {
  background: #e5e7eb;
}

.btn-confirm {
  background: #ef4444;
  color: white;
}

.btn-confirm:hover {
  background: #dc2626;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
}
</style>
