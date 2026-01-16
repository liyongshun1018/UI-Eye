<template>
  <div class="regions-cards">
    <!-- 关键问题 -->
    <div v-if="criticalRegions.length > 0" class="region-group critical-group">
      <h3 class="group-title">
        <span class="priority-icon">🔴</span>
        关键问题 ({{ criticalRegions.length }})
      </h3>
      <div class="regions-list">
        <div 
          v-for="region in criticalRegions" 
          :key="region.id" 
          class="region-item critical"
        >
          <div class="region-header">
            <span class="region-number">{{ region.id }}</span>
            <span class="region-score" v-if="region.score">{{ region.score }}分</span>
          </div>
          
          <div class="region-info">
            <p class="region-desc">{{ region.description }}</p>
            <div class="region-details">
              <span class="detail-item">
                <span class="detail-label">位置:</span>
                <span class="detail-value">({{ region.x }}, {{ region.y }})</span>
              </span>
              <span class="detail-item">
                <span class="detail-label">尺寸:</span>
                <span class="detail-value">{{ region.width }}×{{ region.height }}px</span>
              </span>
              <span class="detail-item" v-if="region.pixelCount">
                <span class="detail-label">差异像素:</span>
                <span class="detail-value">{{ region.pixelCount }}</span>
              </span>
            </div>
          </div>
          
          <button class="btn-locate" @click="$emit('locate', region)">
            <span class="locate-icon">🎯</span>
            定位到区域
          </button>
        </div>
      </div>
    </div>

    <!-- 重要问题 -->
    <div v-if="highRegions.length > 0" class="region-group high-group">
      <h3 class="group-title">
        <span class="priority-icon">🟠</span>
        重要问题 ({{ highRegions.length }})
      </h3>
      <div class="regions-list">
        <div 
          v-for="region in highRegions" 
          :key="region.id" 
          class="region-item high"
        >
          <div class="region-header">
            <span class="region-number">{{ region.id }}</span>
            <span class="region-score" v-if="region.score">{{ region.score }}分</span>
          </div>
          
          <div class="region-info">
            <p class="region-desc">{{ region.description }}</p>
            <div class="region-details">
              <span class="detail-item">
                <span class="detail-label">位置:</span>
                <span class="detail-value">({{ region.x }}, {{ region.y }})</span>
              </span>
              <span class="detail-item">
                <span class="detail-label">尺寸:</span>
                <span class="detail-value">{{ region.width }}×{{ region.height }}px</span>
              </span>
            </div>
          </div>
          
          <button class="btn-locate" @click="$emit('locate', region)">
            <span class="locate-icon">🎯</span>
            定位到区域
          </button>
        </div>
      </div>
    </div>

    <!-- 次要问题（可折叠） -->
    <details v-if="mediumRegions.length > 0" class="region-group medium-group" open>
      <summary class="group-title">
        <span class="priority-icon">🟡</span>
        次要问题 ({{ mediumRegions.length }})
      </summary>
      <div class="regions-list">
        <div 
          v-for="region in mediumRegions" 
          :key="region.id" 
          class="region-item medium"
        >
          <div class="region-header">
            <span class="region-number">{{ region.id }}</span>
            <span class="region-score" v-if="region.score">{{ region.score }}分</span>
          </div>
          
          <div class="region-info">
            <p class="region-desc">{{ region.description }}</p>
            <div class="region-details">
              <span class="detail-item">
                <span class="detail-label">位置:</span>
                <span class="detail-value">({{ region.x }}, {{ region.y }})</span>
              </span>
              <span class="detail-item">
                <span class="detail-label">尺寸:</span>
                <span class="detail-value">{{ region.width }}×{{ region.height }}px</span>
              </span>
            </div>
          </div>
          
          <button class="btn-locate" @click="$emit('locate', region)">
            <span class="locate-icon">🎯</span>
            定位到区域
          </button>
        </div>
      </div>
    </details>

    <!-- 低优先级问题（可折叠，默认折叠） -->
    <details v-if="lowRegions.length > 0" class="region-group low-group">
      <summary class="group-title">
        <span class="priority-icon">🟢</span>
        低优先级 ({{ lowRegions.length }})
      </summary>
      <div class="regions-list">
        <div 
          v-for="region in lowRegions" 
          :key="region.id" 
          class="region-item low"
        >
          <div class="region-header">
            <span class="region-number">{{ region.id }}</span>
            <span class="region-score" v-if="region.score">{{ region.score }}分</span>
          </div>
          
          <div class="region-info">
            <p class="region-desc">{{ region.description }}</p>
            <div class="region-details">
              <span class="detail-item">
                <span class="detail-label">位置:</span>
                <span class="detail-value">({{ region.x }}, {{ region.y }})</span>
              </span>
              <span class="detail-item">
                <span class="detail-label">尺寸:</span>
                <span class="detail-value">{{ region.width }}×{{ region.height }}px</span>
              </span>
            </div>
          </div>
          
          <button class="btn-locate" @click="$emit('locate', region)">
            <span class="locate-icon">🎯</span>
            定位到区域
          </button>
        </div>
      </div>
    </details>
  </div>
</template>

<script setup>
/**
 * DiffRegionsCards.vue - 差异区域卡片视图
 * 按优先级（关键、重要、次要、低）分组展示所有检测到的差异区域。
 */
import { computed } from 'vue'

/**
 * 组件属性定义
 * @property {Array} regions - 所有的差异区域对象数组
 * @property {string} activeFilter - 当前激活的优先级过滤器 ('all', 'critical', 'high')
 */
const props = defineProps({
  regions: {
    type: Array,
    required: true
  },
  activeFilter: String
})

/**
 * 组件事件定义
 * @event locate - 当用户点击“定位到区域”按钮时触发
 */
defineEmits(['locate'])

/** 关键问题列表：优先级为 critical 且符合当前过滤条件 */
const criticalRegions = computed(() => {
  const regions = props.regions.filter(r => r.priority === 'critical')
  if (props.activeFilter === 'all' || props.activeFilter === 'critical') {
    return regions
  }
  return []
})

/** 重要问题列表：优先级为 high 且符合当前过滤条件 */
const highRegions = computed(() => {
  const regions = props.regions.filter(r => r.priority === 'high')
  if (props.activeFilter === 'all' || props.activeFilter === 'critical' || props.activeFilter === 'high') {
    return regions
  }
  return []
})

/** 次要问题列表：仅在过滤条件为 'all' 时展示 */
const mediumRegions = computed(() => {
  if (props.activeFilter !== 'all') return []
  return props.regions.filter(r => r.priority === 'medium')
})

/** 低优先级问题列表：仅在过滤条件为 'all' 时展示 */
const lowRegions = computed(() => {
  if (props.activeFilter !== 'all') return []
  return props.regions.filter(r => r.priority === 'low')
})
</script>

<style scoped>
.regions-cards {
  margin-top: var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.region-group {
  background: white;
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  border: 2px solid var(--border-color);
}

.group-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 var(--spacing-md) 0;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}

details .group-title::before {
  content: '▶';
  font-size: 12px;
  transition: transform 0.2s;
}

details[open] .group-title::before {
  transform: rotate(90deg);
}

.priority-icon {
  font-size: 18px;
}

.regions-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--spacing-md);
}

.region-item {
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
  padding: var(--spacing-md);
  border: 2px solid transparent;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.region-item:hover {
  border-color: var(--accent-primary);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15);
  transform: translateY(-2px);
}

.region-item.critical {
  border-left: 4px solid #DC2626;
}

.region-item.high {
  border-left: 4px solid #EA580C;
}

.region-item.medium {
  border-left: 4px solid #CA8A04;
}

.region-item.low {
  border-left: 4px solid #16A34A;
}

.region-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.region-number {
  display: inline-block;
  padding: 4px 12px;
  background: var(--accent-primary);
  color: white;
  border-radius: var(--radius-sm);
  font-weight: 600;
  font-size: 13px;
}

.region-score {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-tertiary);
}

.region-info {
  flex: 1;
}

.region-desc {
  font-size: 14px;
  color: var(--text-primary);
  margin: 0 0 var(--spacing-sm) 0;
  line-height: 1.5;
}

.region-details {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

.detail-item {
  font-size: 12px;
  color: var(--text-tertiary);
}

.detail-label {
  font-weight: 600;
  margin-right: 4px;
}

.detail-value {
  font-family: 'Courier New', monospace;
}

.btn-locate {
  padding: 8px 16px;
  background: var(--accent-primary);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.btn-locate:hover {
  background: var(--accent-secondary);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(99, 102, 241, 0.3);
}

.locate-icon {
  font-size: 16px;
}

@media (max-width: 768px) {
  .regions-list {
    grid-template-columns: 1fr;
  }
}
</style>
