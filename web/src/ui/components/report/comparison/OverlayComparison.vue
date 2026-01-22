<template>
  <div class="overlay-container">
    <div class="overlay-viewport">
      <img 
        :src="designImage" 
        alt="设计稿" 
        class="base-layer" 
        ref="baseImg"
        :style="{ transform: `scale(${zoomLevel})` }"
      />
      <img 
        :src="actualImage" 
        alt="实际页面" 
        class="overlay-layer"
        ref="overlayImg"
        :style="{ 
          opacity: overlayOpacity,
          transform: `scale(${zoomLevel})`
        }"
      />
    </div>

    <!-- 缩放控制 -->
    <div class="diff-controls">
      <button class="zoom-btn" @click="handleZoomIn" title="放大">🔍+</button>
      <button class="zoom-btn" @click="handleZoomOut" title="缩小">🔍-</button>
      <button class="zoom-btn" @click="handleResetZoom" title="重置">↺</button>
      <span class="zoom-level">{{ Math.round(zoomLevel * 100) }}%</span>
    </div>
    
    <div class="overlay-controls">
      <div class="control-group">
        <label class="control-label">
          <span class="label-icon">🎨</span>
          <span>透明度</span>
          <span class="opacity-value">{{ Math.round(overlayOpacity * 100) }}%</span>
        </label>
        <input 
          type="range" 
          v-model.number="overlayOpacity" 
          min="0" 
          max="1" 
          step="0.05"
          class="opacity-slider"
        />
        <div class="slider-labels">
          <span>设计稿</span>
          <span>实际页面</span>
        </div>
      </div>
      
      <div class="quick-actions">
        <button class="quick-btn" @click="overlayOpacity = 0.5">50%</button>
        <button class="quick-btn" @click="toggleOverlay">切换</button>
      </div>
    </div>
    
    <div class="overlay-hint">
      <span class="hint-icon">💡</span>
      <span>拖动滑块调节透明度，重影效果可快速发现位移和尺寸差异</span>
    </div>
  </div>
</template>

<script setup>
/**
 * OverlayComparison.vue - 重叠对比组件
 * 核心功能：将两张图片重叠放置，通过调节上层图片的透明度（Opacity），
 * 产生“重影”效果，帮助用户快速捕捉细微的位移、字号差异或颜色偏差。
 */
import { ref, onMounted, nextTick } from 'vue'

const props = defineProps({
  designImage: String,
  actualImage: String
})

const baseImg = ref(null)
const overlayImg = ref(null)

// 响应式状态
const overlayOpacity = ref(0.5) // 上层图片透明度 (0: 完全透明/看底层, 1: 完全不透明/看顶层)
const zoomLevel = ref(1)        // 当前画面的放大倍率

/** 
 * 逻辑处理器：快速切换透明度 
 * 在全透明和全不透明之间循环，产生闪烁对比效果
 */
const toggleOverlay = () => {
  overlayOpacity.value = overlayOpacity.value > 0.5 ? 0 : 1
}

/** 逻辑处理器：画面放大 */
const handleZoomIn = () => {
  if (zoomLevel.value < 3) {
    zoomLevel.value += 0.25
  }
}

/** 逻辑处理器：画面缩小 */
const handleZoomOut = () => {
  if (zoomLevel.value > 0.5) {
    zoomLevel.value -= 0.25
  }
}

/** 逻辑处理器：快捷重置 */
const handleResetZoom = () => {
  zoomLevel.value = 1
}
</script>

<style scoped>
.overlay-container {
  background: #f8fafc;
  border-radius: var(--radius-md);
  padding: var(--spacing-lg);
  min-height: 400px;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  width: 100%;
}

.overlay-viewport {
  position: relative;
  background: white;
  border-radius: var(--radius-sm);
  border: 2px solid var(--border-color);
  overflow: auto;
  display: grid;
  place-items: start center;
  margin-top: 48px;
  max-width: 100%;
  /* 移除高度限制，依靠图片的物理高度支撑撑开，确保不被压缩 */
  height: auto;
}

.base-layer {
  grid-area: 1 / 1;
  display: block;
  /* 移除限制，确保原始尺寸渲染 */
  width: auto;
  height: auto;
  object-fit: none; /* 防止任何形式的拉伸 */
  transition: transform 0.3s ease;
  transform-origin: top center;
  z-index: 1;
}

.overlay-layer {
  grid-area: 1 / 1;
  display: block;
  /* 移除 max-width，允许 JS 强行同步尺寸 */
  width: auto;
  height: auto;
  object-fit: fill; /* 确保强制拉伸到基准图大小 */
  transition: opacity 0.3s ease, transform 0.3s ease;
  pointer-events: none;
  z-index: 2;
  transform-origin: top center;
}

.diff-controls {
  position: absolute;
  top: 24px;
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

.overlay-controls {
  width: 100%;
  max-width: 600px; /* Synchronized width */
  margin-top: var(--spacing-lg);
  padding: var(--spacing-md) var(--spacing-lg); /* More compact padding */
  background: white;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.control-label {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
}

.label-icon {
  font-size: 18px;
}

.opacity-value {
  margin-left: auto;
  color: var(--accent-primary);
  font-weight: var(--font-weight-bold);
}

.opacity-slider {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: var(--bg-tertiary);
  outline: none;
  appearance: none;
  -webkit-appearance: none;
}

.opacity-slider::-webkit-slider-thumb {
  appearance: none;
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--accent-primary);
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.opacity-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--accent-primary);
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.slider-labels {
  display: flex;
  justify-content: space-between;
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
}

.quick-actions {
  display: flex;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-md);
}

.quick-btn {
  flex: 1;
  padding: var(--spacing-sm);
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all 0.2s;
}

.quick-btn:hover {
  background: var(--accent-primary);
  color: white;
  border-color: var(--accent-primary);
}

.overlay-hint {
  width: 100%;
  max-width: 600px; /* Synchronized width */
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
}

.hint-icon {
  font-size: 16px;
}
</style>
