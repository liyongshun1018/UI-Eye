<template>
  <div class="diff-highlight-container">
    <div class="diff-image-wrapper">
      <img 
        :src="diffImage" 
        alt="差异高亮图" 
        class="diff-highlight-image"
        :style="{ transform: `scale(${zoomLevel})` }"
        @load="onImageLoad"
      />
      
      <!-- 区域高亮框 -->
      <div 
        v-if="props.highlightRegion" 
        class="region-highlight-box"
        :style="getHighlightStyle"
      >
        <span class="region-id-badge">{{ props.highlightRegion?.id }}</span>
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
          <div class="stat-value highlight">{{ similarity.toFixed(1) }}%</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🔴</div>
        <div class="stat-content">
          <div class="stat-label">差异像素</div>
          <div class="stat-value">{{ diffPixels.toLocaleString() }}</div>
        </div>
      </div>
    </div>
    
    <div class="diff-hint">
      <span class="hint-icon">💡</span>
      <span>红色区域标注了所有像素级差异点，可使用缩放查看细节</span>
    </div>
  </div>
</template>

<script setup>
/**
 * DiffHighlightComparison.vue - 差异高亮对比组件
 * 核心功能：展示像素级差异图，并支持特定差异区域（Region）的定位高亮和画面缩放。
 */
import { ref, computed } from 'vue'

/**
 * 组件属性定义
 * @property {string} diffImage - 标注了差异的图片 URL
 * @property {number} diffPixels - 总计差异像素点数量
 * @property {number} similarity - 整体页面相似度百分比
 * @property {Object} highlightRegion - 当前选中的需要红框定位的特定区域对象
 */
const props = defineProps({
  diffImage: String,
  diffPixels: Number,
  similarity: Number,
  highlightRegion: Object
})

/**
 * 组件事件定义
 * clear: 当点击工具栏的 X 按钮时，通知父组件清除当前选中的高亮区域
 */
defineEmits(['clear'])

// 响应式状态
const zoomLevel = ref(1)       // 当前缩放倍率，默认为 1
const naturalWidth = ref(0)    // 图片原始宽度（像素），用于坐标换算比例
const naturalHeight = ref(0)   // 图片原始高度（像素）

/**
 * 逻辑处理器：当图片加载完成时，提取其实际自然尺寸
 * 这是必须的，因为差异区域的坐标是基于原始图片的，我们需要将其转换为百分比。
 */
const onImageLoad = (e) => {
  const img = e.target
  naturalWidth.value = img.naturalWidth
  naturalHeight.value = img.naturalHeight
}

/**
 * 计算属性：计算高亮红框的具体 CSS 样式
 * 采用“百分比布局” + “缩放平移”方案，确保红框能随着图片缩放而同步移动。
 */
const getHighlightStyle = computed(() => {
  // 如果没有选中区域或图片尚未加载出原始尺寸，则不显示红框
  if (!props.highlightRegion || !naturalWidth.value) return {}
  
  return {
    // 基础定位：将像素坐标转换为相对于父容器的百分比
    left: `${(props.highlightRegion.x / naturalWidth.value) * 100}%`,
    top: `${(props.highlightRegion.y / naturalHeight.value) * 100}%`,
    width: `${(props.highlightRegion.width / naturalWidth.value) * 100}%`,
    height: `${(props.highlightRegion.height / naturalHeight.value) * 100}%`,
    
    // 缩放修正：红框自身的缩放必须跟随图片缩放率
    transform: `scale(${zoomLevel.value})`,
    // 关键点：保持左上角锚点一致，防止缩放后位置漂移
    transformOrigin: 'top left'
  }
})

/** 逻辑处理器：画面放大，最高限额 3 倍 */
const handleZoomIn = () => {
  if (zoomLevel.value < 3) {
    zoomLevel.value += 0.25
  }
}

/** 逻辑处理器：画面缩小，最低限额 0.5 倍 */
const handleZoomOut = () => {
  if (zoomLevel.value > 0.5) {
    zoomLevel.value -= 0.25
  }
}

/** 逻辑处理器：快捷重置缩放比例 */
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
}

.diff-highlight-image {
  max-width: 100%;
  height: auto;
  display: block;
  transition: transform 0.3s ease;
}

.diff-controls {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 30;
  display: flex;
  gap: 8px;
  justify-content: center;
  align-items: center;
  padding: 6px 12px;
  background: white;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.region-highlight-box {
  position: absolute;
  pointer-events: none;
  border: 3px solid #EF4444;
  box-shadow: 0 0 0 4000px rgba(0, 0, 0, 0.3), 0 0 20px #EF4444;
  border-radius: 4px;
  z-index: 20;
  animation: pulse-border 1.5s infinite;
  transition: all 0.3s ease;
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
  white-space: nowrap;
}

@keyframes pulse-border {
  0% { border-color: #EF4444; box-shadow: 0 0 0 4000px rgba(0, 0, 0, 0.3), 0 0 10px #EF4444; }
  50% { border-color: #F87171; box-shadow: 0 0 0 4000px rgba(0, 0, 0, 0.3), 0 0 30px #F87171; }
  100% { border-color: #EF4444; box-shadow: 0 0 0 4000px rgba(0, 0, 0, 0.3), 0 0 10px #EF4444; }
}

.zoom-btn {
  padding: 8px 16px;
  background: white;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.zoom-btn:hover {
  background: var(--bg-glass);
  border-color: var(--accent-primary);
}

.zoom-level {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  min-width: 60px;
  text-align: center;
}

.clear-btn {
  color: #EF4444;
  font-weight: bold;
}

.clear-btn:hover {
  background: #FEF2F2 !important;
  border-color: #EF4444 !important;
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

.stat-icon {
  font-size: 24px;
}

.stat-content {
  flex: 1;
}

.stat-label {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  margin-bottom: 4px;
}

.stat-value {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
}

.stat-value.highlight {
  font-size: var(--font-size-xl);
  color: var(--accent-primary);
}

.diff-hint {
  margin-top: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  background: rgba(99, 102, 241, 0.1);
  border-left: 3px solid var(--accent-primary);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  width: 100%;
  max-width: 600px;
}

.hint-icon {
  font-size: 16px;
}

@media (max-width: 768px) {
  .diff-stats-panel {
    grid-template-columns: 1fr;
  }
}
</style>
