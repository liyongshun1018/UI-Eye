<template>
  <span class="status-badge-compact" :class="statusClass">
    <span class="status-dot"></span>
    {{ statusLabel }}
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: {
    type: String,
    required: true
  }
})

const statusLabel = computed(() => {
  const labels = {
    pending: '待执行',
    running: '进行中',
    completed: '已完成',
    failed: '已失败'
  }
  return labels[props.status] || props.status
})

const statusClass = computed(() => `status-${props.status}`)
</script>

<style scoped>
.status-badge-compact {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

/* 待执行 */
.status-pending {
  background: #fef3c7;
  color: #92400e;
}
.status-pending .status-dot {
  background: #f59e0b;
}

/* 进行中 */
.status-running {
  background: #dbeafe;
  color: #1e40af;
}
.status-running .status-dot {
  background: #3b82f6;
  animation: pulse-dot 1.5s infinite;
}

/* 已完成 */
.status-completed {
  background: #d1fae5;
  color: #065f46;
}
.status-completed .status-dot {
  background: #10b981;
}

/* 已失败 */
.status-failed {
  background: #fee2e2;
  color: #991b1b;
}
.status-failed .status-dot {
  background: #ef4444;
}

@keyframes pulse-dot {
  0% { transform: scale(0.9); opacity: 0.8; }
  50% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(0.9); opacity: 0.8; }
}
</style>
