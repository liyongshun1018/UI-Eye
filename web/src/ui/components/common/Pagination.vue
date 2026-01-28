<template>
  <div class="pagination-container" v-if="totalPages > 0">
    <!-- Meta Info -->
    <div class="pagination-meta" v-if="showMeta">
      显示 <span class="font-mono">{{ (currentPage - 1) * pageSize + 1 }}</span> - 
      <span class="font-mono">{{ Math.min(currentPage * pageSize, total) }}</span> 
      条，共 <span class="font-mono">{{ total }}</span> 条
    </div>

    <!-- Controls -->
    <div class="pagination-controls">
      <button 
        class="page-nav-btn" 
        :disabled="currentPage === 1"
        @click="changePage(currentPage - 1)"
        title="上一页"
      >
        <span class="icon">←</span>
      </button>

      <div class="page-numbers">
        <template v-for="(page, index) in displayPages" :key="index">
          <span v-if="page === '...'" class="ellipsis">...</span>
          <button 
            v-else
            class="page-num-btn"
            :class="{ active: currentPage === page }"
            @click="changePage(page)"
          >
            {{ page }}
          </button>
        </template>
      </div>

      <button 
        class="page-nav-btn" 
        :disabled="currentPage === totalPages"
        @click="changePage(currentPage + 1)"
        title="下一页"
      >
        <span class="icon">→</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  currentPage: {
    type: Number,
    required: true
  },
  total: {
    type: Number,
    required: true
  },
  pageSize: {
    type: Number,
    default: 10
  },
  showMeta: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update:currentPage', 'change'])

const totalPages = computed(() => Math.ceil(props.total / props.pageSize))

const displayPages = computed(() => {
  const total = totalPages.value
  const current = props.currentPage
  const delta = 2
  const range = []
  const rangeWithDots = []
  let l

  range.push(1)

  if (total <= 1) return [1]

  for (let i = current - delta; i <= current + delta; i++) {
    if (i < total && i > 1) {
      range.push(i)
    }
  }
  range.push(total)

  for (let i of range) {
    if (l) {
      if (i - l === 2) {
        rangeWithDots.push(l + 1)
      } else if (i - l !== 1) {
        rangeWithDots.push('...')
      }
    }
    rangeWithDots.push(i)
    l = i
  }

  return rangeWithDots
})

const changePage = (page) => {
  if (page < 1 || page > totalPages.value) return
  emit('update:currentPage', page)
  emit('change', page)
}
</script>

<style scoped>
.pagination-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 0;
  margin-top: 1rem;
  border-top: 1px solid var(--border-color);
}

.pagination-meta {
  font-size: 0.875rem;
  color: var(--text-tertiary);
  font-weight: 500;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-left: auto; /* Push to right if meta is missing or flex behavior needed */
}

/* Base Button Styles */
.page-nav-btn, .page-num-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 36px; /* Touch friendly */
  min-width: 36px;
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  font-family: var(--font-mono);
}

.page-nav-btn:hover:not(:disabled), 
.page-num-btn:hover:not(.active) {
  background: var(--bg-tertiary);
  color: var(--accent-primary);
}

.page-nav-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.page-num-btn.active {
  background: var(--accent-gradient);
  color: white;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
  border-color: transparent;
}

.ellipsis {
  color: var(--text-tertiary);
  padding: 0 0.25rem;
  font-size: 0.9rem;
}

.icon {
  font-size: 1.1rem;
  line-height: 1;
}

/* Mobile Responsiveness */
@media (max-width: 640px) {
  .pagination-container {
    flex-direction: column;
    gap: 1rem;
    align-items: center;
  }
  
  .pagination-controls {
    width: 100%;
    justify-content: center;
    margin-left: 0;
  }

  .pagination-meta {
    margin-bottom: 0.5rem;
  }
}
</style>
