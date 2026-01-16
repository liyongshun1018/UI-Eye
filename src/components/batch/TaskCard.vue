<template>
  <div class="task-card" :class="{ 'clickable': clickable }" @click="handleClick">
    <div class="task-header">
      <div class="task-title">
        <span class="task-icon">📸</span>
        <h3>{{ task.name }}</h3>
      </div>
      <span class="status-badge" :class="`status-${task.status}`">
        {{ statusText }}
      </span>
    </div>

    <div class="task-body">
      <TaskProgress
        :total="task.total"
        :success="task.success"
        :failed="task.failed"
        :status="task.status"
        :show-stats="false"
      />

      <div class="task-meta">
        <div class="meta-item">
          <span class="meta-label">总数:</span>
          <span class="meta-value">{{ task.total }}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">成功:</span>
          <span class="meta-value success">{{ task.success }}</span>
        </div>
        <div v-if="task.failed > 0" class="meta-item">
          <span class="meta-label">失败:</span>
          <span class="meta-value failed">{{ task.failed }}</span>
        </div>
        <div v-if="task.duration" class="meta-item">
          <span class="meta-label">耗时:</span>
          <span class="meta-value">{{ task.duration.toFixed(1) }}s</span>
        </div>
      </div>

      <div class="task-footer">
        <span class="task-time">{{ formatDate(task.createdAt) }}</span>
        <div class="task-actions">
          <button
            v-if="task.status === 'completed'"
            class="btn-secondary"
            @click.stop="$emit('view', task.id)"
          >
            查看详情
          </button>
          <button
            v-if="task.status === 'running'"
            class="btn-secondary"
            @click.stop="$emit('monitor', task.id)"
          >
            监控
          </button>
          <button
            v-if="['completed', 'failed'].includes(task.status)"
            class="btn-danger"
            @click.stop="$emit('delete', task.id)"
          >
            删除
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatDate } from '@/utils'
import TaskProgress from './TaskProgress.vue'

const props = defineProps({
  task: {
    type: Object,
    required: true
  },
  clickable: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['click', 'view', 'monitor', 'delete'])

const statusText = computed(() => {
  const statusMap = {
    pending: '待执行',
    running: '运行中',
    completed: '已完成',
    failed: '失败'
  }
  return statusMap[props.task.status] || props.task.status
})

const handleClick = () => {
  if (props.clickable) {
    emit('click', props.task.id)
  }
}
</script>

<style scoped>
.task-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.2s ease;
}

.task-card.clickable {
  cursor: pointer;
}

.task-card.clickable:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.task-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.task-icon {
  font-size: 20px;
}

.task-title h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
}

.status-pending {
  background: #fef3c7;
  color: #92400e;
}

.status-running {
  background: #dbeafe;
  color: #1e40af;
}

.status-completed {
  background: #d1fae5;
  color: #065f46;
}

.status-failed {
  background: #fee2e2;
  color: #991b1b;
}

.task-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.task-meta {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.meta-item {
  display: flex;
  gap: 4px;
  font-size: 13px;
}

.meta-label {
  color: #6b7280;
}

.meta-value {
  color: #1f2937;
  font-weight: 500;
}

.meta-value.success {
  color: #22c55e;
}

.meta-value.failed {
  color: #ef4444;
}

.task-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  padding-top: 12px;
  border-top: 1px solid #e5e7eb;
}

.task-time {
  font-size: 12px;
  color: #9ca3af;
}

.task-actions {
  display: flex;
  gap: 8px;
}

.btn-secondary,
.btn-danger {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

.btn-danger {
  background: #fee2e2;
  color: #991b1b;
}

.btn-danger:hover {
  background: #fecaca;
}
</style>
