<template>
  <div class="batch-task-monitor">
    <div class="page-header">
      <div class="title-area">
        <button class="btn-icon" @click="goBack">←</button>
        <h1>📊 任务监控: {{ task?.name || '加载中...' }}</h1>
      </div>
      <div class="header-actions">
        <span class="status-badge" :class="`status-${task?.status}`">
          {{ statusText }}
        </span>
      </div>
    </div>

    <div v-if="loading && !task" class="loading-state">
      <div class="spinner"></div>
      <p>正在获取任务信息...</p>
    </div>

    <div v-else-if="task" class="monitor-content">
      <!-- 进度概览 -->
      <div class="monitor-card progress-overview">
        <TaskProgress
          :total="task.total"
          :success="task.success"
          :failed="task.failed"
          :status="task.status"
          label="整体完成进度"
          :show-stats="true"
        />
        
        <div class="stats-row">
          <div class="stat-item">
            <span class="stat-label">总数</span>
            <span class="stat-value">{{ task.total }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">成功</span>
            <span class="stat-value success">{{ task.success }}</span>
          </div>
          <div v-if="task.avgSimilarity !== undefined" class="stat-item">
            <span class="stat-label">平均相似度</span>
            <span class="stat-value primary">{{ task.avgSimilarity?.toFixed(1) }}%</span>
          </div>
          <div v-if="task.totalDiffCount !== undefined" class="stat-item">
            <span class="stat-label">差异点数</span>
            <span class="stat-value" :class="task.totalDiffCount > 0 ? 'failed' : 'success'">
              {{ task.totalDiffCount }}
            </span>
          </div>
          <div class="stat-item">
            <span class="stat-label">总耗时</span>
            <span class="stat-value">{{ task.duration ? task.duration.toFixed(1) + 's' : '-' }}</span>
          </div>
        </div>
      </div>

      <!-- 当前状态/控制 -->
      <div class="monitor-actions">
        <div v-if="task.status === 'running'" class="current-url">
          <span class="label">正在处理:</span>
          <a :href="task.currentUrl" target="_blank" class="url">{{ task.currentUrl || '准备中...' }}</a>
        </div>
        <div class="buttons">
          <button 
            v-if="task.status === 'completed'" 
            class="btn-primary"
            @click="handleViewResults"
          >
            查看所有结果
          </button>
          <button 
            v-if="['completed', 'failed'].includes(task.status)" 
            class="btn-secondary"
            @click="handleRestart"
          >
            新任务
          </button>
        </div>
      </div>

      <!-- 结果列表 -->
      <div class="results-section">
        <div class="section-header">
          <h3>执行结果列表</h3>
          <span class="count">{{ task.results?.length || 0 }} / {{ task.total }}</span>
        </div>
        
        <div class="results-list">
          <div 
            v-for="(result, index) in task.results" 
            :key="index" 
            class="result-item"
            :class="{ 'success': result.success, 'failed': !result.success }"
          >
            <div class="result-info">
              <span class="index">#{{ index + 1 }}</span>
              <span class="url" :title="result.url">{{ result.url }}</span>
            </div>
            <div class="result-status">
              <span v-if="result.similarity !== undefined" class="similarity-badge" :class="getSimilarityClass(result.similarity)">
                {{ result.similarity?.toFixed(1) }}% 对齐
              </span>
              <span v-if="result.success && !result.similarity" class="duration">{{ result.duration?.toFixed(1) }}s</span>
              <span v-else-if="!result.success" class="error-msg">{{ result.error }}</span>
              <span class="icon">{{ result.success ? '✅' : '❌' }}</span>
              <div class="actions">
                <button 
                  v-if="result.success" 
                  class="btn-view" 
                  @click="previewImage(result)"
                >
                  预览
                </button>
                <button 
                  v-if="result.reportId" 
                  class="btn-view primary" 
                  @click="viewReport(result.reportId)"
                >
                  详情报告
                </button>
              </div>
            </div>
          </div>

          <div v-if="task.status === 'running'" class="result-item loading">
            <div class="result-info">
              <span class="index">#{{ (task.results?.length || 0) + 1 }}</span>
              <span class="url">正在获取下一步...</span>
            </div>
            <div class="spinner-small"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 图片预览模态框 -->
    <div v-if="previewUrl" class="preview-modal" @click="previewUrl = null">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>截图预览</h3>
          <button class="close-btn" @click="previewUrl = null">×</button>
        </div>
        <div class="image-container">
          <img :src="previewUrl" alt="Screenshot Preview" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * 批量任务实时监控仪表盘
 * 
 * @description 核心监控页面，通过 WebSocket 协议监听服务端推送的任务进度消息。
 * 支持展示整体进度条、分类成功/失败统计、单条 URL 执行结果流水线以及截图即时预览。
 */
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TaskProgress from '@ui/components/batch/TaskProgress.vue'
import { useBatchStore } from '@modules/stores/batch'

const route = useRoute()
const router = useRouter()
const taskId = Number(route.params.id)
const batchStore = useBatchStore()

/** 快照快捷引用 */
const task = computed(() => batchStore.currentTask)
const loading = computed(() => batchStore.loading)
const previewUrl = ref(null)

/**
 * 计算属性：将任务阶段状态码映射为友好的中文描述
 */
const statusText = computed(() => {
  if (task.value?.status === 'running') {
    return task.value.currentPhase === 'compare' ? '🚀 核心对比与 AI 分析中...' : '📸 正在截取页面快照...'
  }
  const statusMap = {
    pending: '等待初始化',
    completed: '恭喜！任务已完成',
    failed: '任务执行异常'
  }
  return statusMap[task.value?.status] || task.value?.status
})

/**
 * 动作：重置并开始一个新的截图任务
 */
const handleRestart = () => {
  router.push('/batch-screenshot')
}

/**
 * 动作：跳转到多维度的可视化分析结果页面
 */
const handleViewResults = () => {
  router.push(`/batch-tasks/${taskId}/detail`)
}

/**
 * 动作：弹出模态框展示截图后的图片
 */
const previewImage = (result) => {
  const filename = result.filename || result.path?.split(/[\\/]/).pop()
  previewUrl.value = `/uploads/${filename}`
}

/**
 * 动作：跳转到详细报告页面
 */
const viewReport = (reportId) => {
  router.push(`/report/${reportId}`)
}

/**
 * 辅助：根据相似度返回样式类
 */
const getSimilarityClass = (val) => {
  if (val >= 98) return 'similarity-high'
  if (val >= 90) return 'similarity-mid'
  return 'similarity-low'
}

/**
 * 动作：返回上一级任务动态列表
 */
const goBack = () => {
  router.push('/batch-tasks')
}

onMounted(() => {
  batchStore.fetchTaskById(taskId)
})
</script>

<style scoped>
.batch-task-monitor {
  max-width: 1000px;
  margin: 0 auto;
  padding: 24px;
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
  background: none;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  cursor: pointer;
  color: #4b5563;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
}

.status-badge {
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
}

.status-pending { background: #fef3c7; color: #92400e; }
.status-running { background: #dbeafe; color: #1e40af; }
.status-completed { background: #d1fae5; color: #065f46; }
.status-failed { background: #fee2e2; color: #991b1b; }

.monitor-card {
  background: white;
  padding: 32px;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
}

.stats-row {
  display: flex;
  justify-content: space-around;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #f3f4f6;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.stat-label {
  font-size: 14px;
  color: #6b7280;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
}

.stat-value.success { color: #10b981; }
.stat-value.failed { color: #ef4444; }

.monitor-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 16px 24px;
  background: #f9fafb;
  border-radius: 8px;
}

.current-url {
  display: flex;
  gap: 12px;
  align-items: center;
}

.current-url .label {
  font-size: 14px;
  color: #6b7280;
}

.current-url .url {
  font-size: 14px;
  color: #3b82f6;
  text-decoration: none;
  font-family: monospace;
}

.buttons {
  display: flex;
  gap: 12px;
}

.results-section {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.section-header {
  padding: 20px 24px;
  border-bottom: 1px solid #f3f4f6;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.section-header .count {
  font-size: 14px;
  color: #6b7280;
}

.results-list {
  max-height: 500px;
  overflow-y: auto;
}

.result-item {
  padding: 16px 24px;
  border-bottom: 1px solid #f3f4f6;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.result-item:last-child {
  border-bottom: none;
}

.result-info {
  display: flex;
  gap: 16px;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.result-info .index {
  color: #9ca3af;
  font-size: 14px;
  font-family: monospace;
}

.result-info .url {
  color: #4b5563;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result-status {
  display: flex;
  align-items: center;
  gap: 12px;
}

.duration {
  font-size: 13px;
  color: #6b7280;
}

.error-msg {
  font-size: 13px;
  color: #ef4444;
}

.icon {
  font-size: 16px;
}

.btn-view {
  padding: 4px 12px;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  font-size: 12px;
  color: #4b5563;
  cursor: pointer;
}

.btn-view:hover {
  background: #e5e7eb;
}

.spinner-small {
  width: 20px;
  height: 20px;
  border: 2px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 100px 0;
  color: #6b7280;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

.preview-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 40px;
}

.modal-content {
  background: white;
  border-radius: 12px;
  max-width: 90%;
  max-height: 90%;
  display: flex;
  flex-direction: column;
  position: relative;
}

.modal-header {
  padding: 16px 24px;
  border-bottom: 1px solid #f3f4f6;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 16px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #6b7280;
}

.image-container {
  flex: 1;
  overflow: auto;
  padding: 20px;
  background: #f3f4f6;
}

.image-container img {
  max-width: 100%;
  display: block;
}

.btn-primary {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #e5e7eb;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}
.similarity-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  margin-right: 8px;
}

.similarity-high { background: #d1fae5; color: #065f46; border: 1px solid #6ee7b7; }
.similarity-mid { background: #fef3c7; color: #92400e; border: 1px solid #fcd34d; }
.similarity-low { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }

.stat-value.primary { color: #3b82f6; }

.actions {
  display: flex;
  gap: 8px;
}

.btn-view.primary {
  background: #3b82f6;
  color: white;
  border-color: #2563eb;
}

.btn-view.primary:hover {
  background: #2563eb;
}
</style>
