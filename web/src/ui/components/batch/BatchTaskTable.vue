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
                class="action-btn-text" 
                @click="$emit('view', task.id)"
              >
                报告详情
              </button>
              <button 
                v-if="task.status === 'running'"
                class="action-btn-text monitor" 
                @click="$emit('monitor', task.id)"
              >
                实时监控
              </button>
              <button 
                v-if="['completed', 'failed'].includes(task.status)"
                class="action-btn-text delete" 
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
  overflow: hidden;
  border: 1px solid var(--border-color);
  background: rgba(255, 255, 255, 0.4);
}

.batch-task-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.batch-task-table th {
  text-align: center;
  padding: 12px 16px;
  background: rgba(248, 250, 252, 0.8);
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid var(--border-color);
}

.task-row {
  transition: background 0.2s;
  border-bottom: 1px solid rgba(226, 232, 240, 0.6);
}

.task-row:hover {
  background: rgba(241, 245, 249, 0.5);
}

.task-row:last-child {
  border-bottom: none;
}

.batch-task-table td {
  padding: 10px 16px;
  vertical-align: middle;
}

.id-cell {
  color: var(--text-tertiary);
  font-family: var(--font-mono);
  font-size: 12px;
}

.task-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.type-icon {
  font-size: 16px;
}

.task-name {
  font-weight: 500;
  color: var(--text-primary);
  max-width: 240px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
  background: #e2e8f0;
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
  background: #f87171;
}

.progress-text {
  font-size: 12px;
  font-weight: 600;
  font-family: var(--font-mono);
  min-width: 45px;
  text-align: right;
}

.success-count { color: #10b981; }
.separator { color: var(--text-tertiary); margin: 0 2px; }
.total-count { color: var(--text-secondary); }

.time-cell {
  color: var(--text-tertiary);
  font-size: 12px;
}

.no-wrap {
  white-space: nowrap;
}

.actions-cell {
  padding: 8px 16px;
  width: 180px;
}

.action-group {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.action-btn-text {
  background: transparent;
  border: none;
  font-size: 13px;
  font-weight: 600;
  color: var(--accent-primary);
  cursor: pointer;
  padding: 4px 0;
  transition: all 0.2s;
  white-space: nowrap;
}

.action-btn-text:hover {
  text-decoration: underline;
  opacity: 0.8;
}

.action-btn-text.delete {
  color: var(--error);
}

.action-btn-text.monitor {
  color: #f59e0b;
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
