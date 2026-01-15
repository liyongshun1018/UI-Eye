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
// @ts-nocheck
import { ref, computed } from 'vue'

const props = defineProps({
  diffImage: String,
  diffPixels: Number,
  similarity: Number,
  highlightRegion: Object
})

defineEmits(['clear'])

const zoomLevel = ref(1)
const naturalWidth = ref(0)
const naturalHeight = ref(0)

const onImageLoad = (e) => {
  const img = e.target
  naturalWidth.value = img.naturalWidth
  naturalHeight.value = img.naturalHeight
}

const getHighlightStyle = computed(() => {
  if (!props.highlightRegion || !naturalWidth.value) return {}
  
  return {
    left: `${(props.highlightRegion.x / naturalWidth.value) * 100}%`,
    top: `${(props.highlightRegion.y / naturalHeight.value) * 100}%`,
    width: `${(props.highlightRegion.width / naturalWidth.value) * 100}%`,
    height: `${(props.highlightRegion.height / naturalHeight.value) * 100}%`,
    transform: `scale(${zoomLevel.value})`,
    transformOrigin: 'top left'
  }
})

const handleZoomIn = () => {
  if (zoomLevel.value < 3) {
    zoomLevel.value += 0.25
  }
}

const handleZoomOut = () => {
  if (zoomLevel.value > 0.5) {
    zoomLevel.value -= 0.25
  }
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
