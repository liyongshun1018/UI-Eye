<template>
  <div class="diff-regions-section card glass">
    <div class="section-header">
      <div class="header-left">
        <h2 class="section-title">
          差异区域分析
          <span class="regions-count">({{ regions.length }} 个区域)</span>
        </h2>
      </div>
      
      <div class="header-right">
        <!-- 视图切换 -->
        <div class="view-switcher">
          <button
            class="view-btn"
            :class="{ active: viewMode === 'card' }"
            @click="viewMode = 'card'"
            title="卡片视图"
          >
            📋 卡片
          </button>
          <button
            class="view-btn"
            :class="{ active: viewMode === 'table' }"
            @click="viewMode = 'table'"
            title="表格视图"
          >
            📊 表格
          </button>
        </div>
        
        <!-- 优先级过滤器 -->
        <div class="priority-filter">
          <button 
            v-for="filter in priorityFilters" 
            :key="filter.value"
            class="filter-btn"
            :class="{ active: activePriorityFilter === filter.value }"
            @click="activePriorityFilter = filter.value"
          >
            {{ filter.label }}
          </button>
        </div>
      </div>
    </div>
    
    <div class="regions-hint">
      <span class="hint-icon">💡</span>
      <span>已智能聚合并按优先级排序，点击可定位到对应位置</span>
    </div>
    
    <!-- 卡片视图 -->
    <DiffRegionsCards
      v-if="viewMode === 'card'"
      :regions="filteredRegions"
      :active-filter="activePriorityFilter"
      @locate="$emit('locate', $event)"
    />
    
    <!-- 表格视图 -->
    <DiffRegionsTable
      v-else
      :regions="filteredRegions"
      @locate="$emit('locate', $event)"
    />
  </div>
</template>

<script setup>
/**
 * DiffRegionsSection.vue - 差异区域分析区块
 * 负责展示经过后台算法聚类后的所有差异区域列表。
 * 支持两种查看模式（卡片/表格）以及优先级筛选。
 */
// @ts-nocheck
import { ref, computed } from 'vue'
import DiffRegionsCards from './DiffRegionsCards.vue'
import DiffRegionsTable from './DiffRegionsTable.vue'

/**
 * 组件属性
 * @property {Array} regions - 由后端分析出的差异区域数组
 */
const props = defineProps({
  regions: {
    type: Array,
    required: true
  }
})

/**
 * 声明事件
 * locate: 当子组件触发定位请求时，将该请求透传给父页面（Report.vue），由其控制图片组件滚动。
 */
defineEmits(['locate'])

// 响应式状态控制
const viewMode = ref('table')          // 当前视图模式：'card' (卡片) | 'table' (表格)
const activePriorityFilter = ref('all') // 当前活跃的优先级过滤器标识

/** 过滤器选项定义 */
const priorityFilters = [
  { label: '全部', value: 'all' },
  { label: '关键', value: 'critical' },
  { label: '重要', value: 'high' }
]

/**
 * 计算属性：基于当前选中的过滤器对原始区域数据进行实时筛选
 * @returns {Array} 过滤后的差异区域列表
 */
const filteredRegions = computed(() => {
  if (activePriorityFilter.value === 'all') {
    return props.regions
  } else if (activePriorityFilter.value === 'critical') {
    // 仅显示最高优先级（关键）的差异
    return props.regions.filter(r => r.priority === 'critical')
  } else if (activePriorityFilter.value === 'high') {
    // 显示关键和重要（High）的差异，过滤掉中低优先级
    return props.regions.filter(r => r.priority === 'critical' || r.priority === 'high')
  }
  return []
})
</script>

<style scoped>
.diff-regions-section {
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-lg);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-md);
  gap: var(--spacing-md);
  flex-wrap: wrap;
}

.header-left {
  flex: 1;
  min-width: 200px;
}

.header-right {
  display: flex;
  gap: var(--spacing-md);
  flex-wrap: wrap;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.regions-count {
  font-size: 14px;
  font-weight: 400;
  color: var(--text-tertiary);
}

.view-switcher {
  display: flex;
  gap: 4px;
  background: var(--bg-tertiary);
  padding: 4px;
  border-radius: var(--radius-md);
}

.view-btn {
  padding: 6px 12px;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.view-btn:hover {
  background: rgba(99, 102, 241, 0.1);
  color: var(--text-primary);
}

.view-btn.active {
  background: white;
  color: var(--accent-primary);
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.priority-filter {
  display: flex;
  gap: 8px;
}

.filter-btn {
  padding: 8px 16px;
  background: var(--bg-secondary);
  border: 2px solid transparent;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.filter-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.filter-btn.active {
  background: var(--accent-primary);
  color: white;
  border-color: var(--accent-primary);
}

.regions-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(99, 102, 241, 0.1);
  border-left: 3px solid var(--accent-primary);
  border-radius: var(--radius-sm);
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: var(--spacing-md);
}

.hint-icon {
  font-size: 16px;
}

@media (max-width: 1024px) {
  .section-header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .header-right {
    flex-direction: column;
  }
  
  .priority-filter {
    width: 100%;
  }
  
  .filter-btn {
    flex: 1;
  }
}
</style>
