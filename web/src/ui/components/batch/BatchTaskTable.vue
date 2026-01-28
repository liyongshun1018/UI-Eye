<template>
  <div class="batch-task-table-wrapper card glass">
    <table class="batch-task-table">
      <thead>
        <tr>
          <th width="80">ID</th>
          <th width="280">任务名称</th>
          <th width="120">执行状态</th>
          <th>完成情况</th>
          <th width="120">创建时间</th>
          <th width="150">操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="task in tasks" :key="task.id" class="task-row">
          <td class="id-cell">#{{ String(task.id).slice(-4) }}</td>
          <td class="name-cell">
            <div class="task-info">
              <span class="type-icon">📸</span>
              <span class="task-name" :title="task.name">{{ task.name }}</span>
            </div>
          </td>
          <td>
            <CompactTaskStatus :status="task.status" />
          </td>
          <td class="progress-cell">
            <div class="progress-info">
              <div class="progress-bar-mini">
                <div 
                  class="progress-fill" 
                  :style="{ width: `${(task.success + task.failed) / task.total * 100}%` }"
                  :class="task.status"
                ></div>
              </div>
              <span class="progress-text">
                <span class="success-count">{{ task.success }}</span>
                <span class="separator">/</span>
                <span class="total-count">{{ task.total }}</span>
              </span>
            </div>
          </td>
          <td class="time-cell no-wrap">{{ formatDate(task.createdAt) }}</td>
          <td class="actions-cell text-right">
            <div class="action-group">
              <button 
                class="btn btn-secondary btn-sm" 
                @click="$emit('view', task.id)"
              >
                报告详情
              </button>
              <button 
                v-if="task.status === 'running'"
                class="btn btn-secondary btn-sm monitor" 
                @click="$emit('monitor', task.id)"
              >
                实时监控
              </button>
              <button 
                v-if="['completed', 'failed'].includes(task.status)"
                class="btn btn-secondary btn-sm delete" 
                @click="$emit('delete', task.id)"
              >
                删除
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { formatDate } from '@core/utils'
import CompactTaskStatus from './CompactTaskStatus.vue'

const props = defineProps({
  tasks: {
    type: Array,
    default: () => []
  }
})

defineEmits(['view', 'monitor', 'delete'])
</script>

<style scoped>

.batch-task-table-wrapper {
  padding: 0;
  /* Remove wrapper card style to let rows float */
  background: transparent;
  border: none;
  overflow: visible;
}

.batch-task-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0 12px; /* Gap between rows */
  font-size: 14px;
}

.batch-task-table thead tr {
  background: transparent;
  box-shadow: none;
}

.batch-task-table th {
  text-align: center;
  padding: 0 16px 8px;
  background: transparent;
  color: var(--text-tertiary);
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border: none;
}

/* Floating Card Rows */
.task-row {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 2px 4px rgba(0,0,0,0.02), 0 1px 2px rgba(0,0,0,0.02);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

/* Rounded corners for the row (applied to first/last cells) */
.batch-task-table td:first-child {
  border-top-left-radius: 12px;
  border-bottom-left-radius: 12px;
}
.batch-task-table td:last-child {
  border-top-right-radius: 12px;
  border-bottom-right-radius: 12px;
}

.task-row:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 20px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  background: rgba(255, 255, 255, 0.95);
  position: relative;
}

.batch-task-table td {
  padding: 16px; /* Larger padding for card feel */
  vertical-align: middle;
  border: none;
  border-top: 1px solid rgba(255,255,255,0.5);
  border-bottom: 1px solid rgba(255,255,255,0.5);
}

.batch-task-table td:first-child { border-left: 1px solid rgba(255,255,255,0.5); }
.batch-task-table td:last-child { border-right: 1px solid rgba(255,255,255,0.5); }

.id-cell {
  color: var(--text-tertiary);
  font-family: var(--font-mono);
  font-size: 12px;
}

.task-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.type-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(241, 245, 249, 0.8);
  border-radius: 8px;
  font-size: 16px;
}

.task-name {
  font-weight: 600;
  color: var(--text-primary);
  max-width: 240px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.95rem;
}

.progress-cell {
  min-width: 180px;
}

.progress-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-bar-mini {
  flex: 1;
  height: 6px;
  background: var(--bg-tertiary);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--accent-primary);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-fill.running {
  background: linear-gradient(90deg, #3b82f6, #60a5fa);
  animation: shimmer 1.5s infinite linear;
  background-size: 200% 100%;
}

.progress-fill.failed {
  background: var(--error);
}

.progress-text {
  font-size: 12px;
  font-weight: 600;
  font-family: var(--font-mono);
  min-width: 50px;
  text-align: right;
}

.success-count { color: var(--success); }
.separator { color: var(--text-tertiary); margin: 0 2px; }
.total-count { color: var(--text-secondary); }

.time-cell {
  color: var(--text-tertiary);
  font-size: 12px;
  font-family: var(--font-mono);
}

.no-wrap {
  white-space: nowrap;
}

.actions-cell {
  padding: 8px 16px;
  width: 200px; /* 增加宽度以容纳按钮 */
  white-space: nowrap;
}

.action-group {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  opacity: 0.9;
  transition: opacity 0.2s;
  flex-wrap: nowrap; /* 禁止换行 */
}

.task-row:hover .action-group {
  opacity: 1;
}

.action-btn-text {
  background: white;
  border: 1px solid var(--border-color);
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 6px;
  transition: all 0.2s;
  white-space: nowrap;
  display: flex;
  align-items: center;
}

.action-btn-text:hover {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
  background: rgba(59, 130, 246, 0.05);
  transform: translateY(-1px);
}

.action-btn-text.delete:hover {
  border-color: var(--error);
  color: var(--error);
  background: rgba(239, 68, 68, 0.05);
}

.action-btn-text.monitor {
  color: var(--warning);
  border-color: rgba(245, 158, 11, 0.3);
}

.text-right { text-align: right; }

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@media (max-width: 768px) {
  .batch-task-table th:nth-child(1),
  .batch-task-table td:nth-child(1),
  .batch-task-table th:nth-child(5),
  .batch-task-table td:nth-child(5) {
    display: none;
  }
}
</style>
