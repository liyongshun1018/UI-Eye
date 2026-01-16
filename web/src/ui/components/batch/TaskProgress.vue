<template>
  <div class="task-progress">
    <div class="progress-header">
      <span class="progress-label">{{ label }}</span>
      <span class="progress-percentage">{{ percentage }}%</span>
    </div>
    <div class="progress-bar-container">
      <div 
        class="progress-bar" 
        :style="{ width: percentage + '%' }"
        :class="statusClass"
      ></div>
    </div>
    <div v-if="showStats" class="progress-stats">
      <span>总数: {{ total }}</span>
      <span>成功: {{ success }}</span>
      <span v-if="failed > 0" class="failed">失败: {{ failed }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  label: {
    type: String,
    default: '进度'
  },
  total: {
    type: Number,
    required: true
  },
  success: {
    type: Number,
    default: 0
  },
  failed: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    default: 'running',
    validator: (value) => ['pending', 'running', 'completed', 'failed'].includes(value)
  },
  showStats: {
    type: Boolean,
    default: true
  }
})

const percentage = computed(() => {
  if (props.total === 0) return 0
  return Math.round((props.success / props.total) * 100)
})

const statusClass = computed(() => {
  return `status-${props.status}`
})
</script>

<style scoped>
.task-progress {
  width: 100%;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.progress-label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.progress-percentage {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.progress-bar-container {
  width: 100%;
  height: 24px;
  background: #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
}

.progress-bar {
  height: 100%;
  border-radius: 12px;
  transition: width 0.3s ease, background 0.3s ease;
  position: relative;
}

.progress-bar.status-pending {
  background: linear-gradient(90deg, #fbbf24, #f59e0b);
}

.progress-bar.status-running {
  background: linear-gradient(90deg, #60a5fa, #3b82f6);
  animation: pulse 2s ease-in-out infinite;
}

.progress-bar.status-completed {
  background: linear-gradient(90deg, #4ade80, #22c55e);
}

.progress-bar.status-failed {
  background: linear-gradient(90deg, #f87171, #ef4444);
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}

.progress-stats {
  display: flex;
  gap: 16px;
  margin-top: 8px;
  font-size: 13px;
  color: #6b7280;
}

.progress-stats .failed {
  color: #ef4444;
  font-weight: 500;
}
</style>
