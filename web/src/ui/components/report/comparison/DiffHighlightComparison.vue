<template>
  <div class="diff-highlight-container">
    <div class="diff-image-wrapper">
      <div class="image-viewport" :style="{ transform: `scale(${zoomLevel})` }">
        <img 
          :src="diffImage" 
          alt="差异高亮图" 
          class="diff-highlight-image"
          @load="onImageLoad"
        />
        
        <!-- 全量差异区域 SVG 交互层 -->
        <svg 
          v-if="naturalWidth > 0"
          class="diff-svg-overlay"
          :viewBox="`0 0 ${naturalWidth} ${naturalHeight}`"
        >
          <rect 
            v-for="region in regions"
            :key="region.id"
            :x="region.x"
            :y="region.y"
            :width="region.width"
            :height="region.height"
            class="region-rect"
            :class="{ 
              'is-active': props.highlightRegion?.id === region.id,
              [`priority-${region.priority}`]: true 
            }"
            @click.stop="$emit('locate', region)"
          >
            <title>差异区域 #{{ region.id }}: {{ region.description }} ({{ region.priority }})</title>
          </rect>
        </svg>

        <!-- 当前选中区域的 Spotlight 聚焦效果 -->
        <div 
          v-if="props.highlightRegion" 
          class="region-highlight-box"
          :style="getHighlightStyleInternal"
        >
          <span class="region-id-badge">{{ props.highlightRegion?.id }}</span>
        </div>
      </div>
    </div>
    
    <div class="diff-controls">
      <button class="zoom-btn" @click="handleZoomIn" title="放大">🔍+</button>
      <button class="zoom-btn" @click="handleZoomOut" title="缩小">🔍-</button>
      <button class="zoom-btn" @click="handleResetZoom" title="重置">↺</button>
      <button 
        v-if="props.highlightRegion" 
        class="zoom-btn clear-btn" 
        @click="$emit('clear')" 
        title="清除高亮"
      >
        ❌
      </button>
      <span class="zoom-level">{{ Math.round(zoomLevel * 100) }}%</span>
    </div>
    
    <div class="diff-stats-panel">
      <div class="stat-card">
        <div class="stat-icon">📊</div>
        <div class="stat-content">
          <div class="stat-label">相似度</div>
          <div class="stat-value highlight">{{ similarity?.toFixed(1) ?? '0.0' }}%</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🔴</div>
        <div class="stat-content">
          <div class="stat-label">差异像素</div>
          <div class="stat-value">{{ diffPixels?.toLocaleString() ?? '0' }}</div>
        </div>
      </div>
    </div>
    
    <div class="diff-hint">
      <span class="hint-icon">💡</span>
      <span>直接在图上点击差异区可快速定位，使用滚轮/按钮可缩放查看细节</span>
    </div>
  </div>
</template>

<script setup>
/**
 * DiffHighlightComparison.vue - 差异高亮对比组件
 * 核心功能：展示像素级差异图，并支持特定差异区域（Region）的定位高亮和画面缩放。
 * 升级：集成了 SVG 交互层，支持全量差异区域的点击联动。
 */
import { ref, computed } from 'vue'

const props = defineProps({
  diffImage: String,
  diffPixels: Number,
  similarity: Number,
  regions: {
    type: Array,
    default: () => []
  },
  highlightRegion: Object
})

defineEmits(['clear', 'locate'])

const zoomLevel = ref(1)
const naturalWidth = ref(0)
const naturalHeight = ref(0)

const onImageLoad = (e) => {
  const img = e.target
  naturalWidth.value = img.naturalWidth
  naturalHeight.value = img.naturalHeight
}

/**
 * 内部聚焦点样式计算
 * 注意：由于外层 image-viewport 已经应用了 zoomLevel 缩放，
 * 这里不需要再次在 transform 中设置缩放，只需处理 viewBox 映射即可。
 */
const getHighlightStyleInternal = computed(() => {
  if (!props.highlightRegion || !naturalWidth.value) return {}
  
  return {
    left: `${(props.highlightRegion.x / naturalWidth.value) * 100}%`,
    top: `${(props.highlightRegion.y / naturalHeight.value) * 100}%`,
    width: `${(props.highlightRegion.width / naturalWidth.value) * 100}%`,
    height: `${(props.highlightRegion.height / naturalHeight.value) * 100}%`,
    transformOrigin: 'top left'
  }
})

const handleZoomIn = () => {
  if (zoomLevel.value < 3) zoomLevel.value += 0.25
}

const handleZoomOut = () => {
  if (zoomLevel.value > 0.5) zoomLevel.value -= 0.25
}

const handleResetZoom = () => {
  zoomLevel.value = 1
}
</script>

<style scoped>
.diff-highlight-container {
  position: relative;
  background: #f8fafc;
  border-radius: var(--radius-md);
  padding: var(--spacing-lg);
  min-height: 600px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.diff-image-wrapper {
  background: white;
  border-radius: var(--radius-sm);
  border: 2px solid var(--border-color);
  overflow: hidden;
  display: inline-block;
  padding: var(--spacing-md);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
}

.image-viewport {
  position: relative;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  transform-origin: top center; /* 统一为顶部居中 */
}

.diff-highlight-image {
  max-width: none;
  height: auto;
  display: block;
}

/* SVG 交互叠层 */
.diff-svg-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 10;
}

.region-rect {
  pointer-events: all;
  fill: rgba(99, 102, 241, 0);
  stroke-width: 1.5;
  cursor: pointer;
  transition: all 0.2s ease;
}

/* 根据优先级着色 */
.region-rect.priority-critical { stroke: #EF4444; }
.region-rect.priority-high { stroke: #F97316; }
.region-rect.priority-medium { stroke: #EAB308; }
.region-rect.priority-low { stroke: #22C55E; }

.region-rect:hover {
  fill: rgba(99, 102, 241, 0.1);
  stroke-width: 3;
}

.region-rect.is-active {
  stroke-width: 0; /* 激活时使用 Spotlight 替代 */
}

/* Spotlight 聚焦框 (原逻辑保持并优化) */
.region-highlight-box {
  position: absolute;
  pointer-events: none;
  border: 3px solid #EF4444;
  box-shadow: 0 0 0 4000px rgba(0, 0, 0, 0.4), 0 0 20px #EF4444;
  border-radius: 4px;
  z-index: 20;
  animation: pulse-border 1.5s infinite;
}

.region-id-badge {
  position: absolute;
  top: -28px;
  left: -3px;
  background: #EF4444;
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
}

@keyframes pulse-border {
  0% { border-color: #EF4444; box-shadow: 0 0 0 4000px rgba(0, 0, 0, 0.4), 0 0 10px rgba(239, 68, 68, 0.5); }
  50% { border-color: #F87171; box-shadow: 0 0 0 4000px rgba(0, 0, 0, 0.4), 0 0 30px rgba(239, 68, 68, 0.8); }
  100% { border-color: #EF4444; box-shadow: 0 0 0 4000px rgba(0, 0, 0, 0.4), 0 0 10px rgba(239, 68, 68, 0.5); }
}

/* 控制按钮与面板 */
.diff-controls {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 8px 16px;
  background: white;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-full);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}

.zoom-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border: 1px solid var(--border-color);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
}

.zoom-btn:hover {
  background: #f1f5f9;
  border-color: var(--accent-primary);
  transform: scale(1.1);
}

.zoom-btn.clear-btn {
  color: #EF4444;
  border-color: #FEE2E2;
}

.zoom-level {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 8px;
}

.diff-stats-panel {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-md);
  margin-top: var(--spacing-lg);
  width: 100%;
  max-width: 600px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: white;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-color);
}

.stat-label {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
}

.stat-value {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
}

.stat-value.highlight { color: var(--accent-primary); }

.diff-hint {
  margin-top: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  background: rgba(99, 102, 241, 0.05);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

@media (max-width: 768px) {
  .diff-stats-panel { grid-template-columns: 1fr; }
}
</style>
