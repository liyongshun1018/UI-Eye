<template>
  <div class="slider-comparison-container">
    <div class="slider-viewport" ref="sliderViewport" @mousedown="startSliderDrag">
      <!-- 底层：实际页面 -->
      <img 
        :src="actualImage" 
        alt="实际页面" 
        class="slider-base" 
        ref="sliderBase" 
        :style="{ transform: `scale(${zoomLevel})` }"
        @load="syncImages" 
      />
      
      <!-- 顶层：设计稿（通过 clip-path 裁剪） -->
      <img 
        :src="designImage" 
        alt="设计稿" 
        class="slider-overlay"
        ref="sliderOverlay"
        :style="{ 
          clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)`,
          transform: `scale(${zoomLevel})`
        }"
        @load="syncImages"
      />
      
      <!-- 左侧标签：设计稿 -->
      <div class="slider-label slider-label-left">
        <span class="label-icon">🎨</span>
        <span class="label-text">设计稿</span>
      </div>
      
      <!-- 右侧标签：实际页面 -->
      <div class="slider-label slider-label-right">
        <span class="label-text">实际页面</span>
        <span class="label-icon">🖥️</span>
      </div>
      
      <!-- 拨杆 -->
      <div 
        class="slider-handle"
        :style="{ left: `${sliderPosition}%` }"
      >
        <div class="handle-line"></div>
        <div class="handle-grip">⇄</div>
      </div>
    </div>

    <!-- 缩放控制 -->
    <div class="diff-controls">
      <button class="zoom-btn" @click="handleZoomIn" title="放大">🔍+</button>
      <button class="zoom-btn" @click="handleZoomOut" title="缩小">🔍-</button>
      <button class="zoom-btn" @click="handleResetZoom" title="重置">↺</button>
      <span class="zoom-level">{{ Math.round(zoomLevel * 100) }}%</span>
    </div>
    
    <div class="slider-hint">
      <span class="hint-icon">💡</span>
      <span>拖动滑块左右对比，线条偏移一目了然</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted } from 'vue'

defineProps<{
  designImage: string
  actualImage: string
}>()

const sliderPosition = ref(50)
const isDragging = ref(false)
const sliderViewport = ref<HTMLElement | null>(null)
const sliderBase = ref<HTMLImageElement | null>(null)
const sliderOverlay = ref<HTMLImageElement | null>(null)

const startSliderDrag = (e: MouseEvent) => {
  isDragging.value = true
  updateSliderPosition(e)
  
  document.addEventListener('mousemove', onSliderDrag)
  document.addEventListener('mouseup', stopSliderDrag)
}

const onSliderDrag = (e: MouseEvent) => {
  if (!isDragging.value) return
  updateSliderPosition(e)
}

const stopSliderDrag = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', onSliderDrag)
  document.removeEventListener('mouseup', stopSliderDrag)
}

const zoomLevel = ref(1)

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

const updateSliderPosition = (e: MouseEvent) => {
  const viewport = sliderViewport.value
  if (!viewport) return
  
  const rect = viewport.getBoundingClientRect()
  const x = e.clientX - rect.left
  const percentage = (x / rect.width) * 100
  sliderPosition.value = Math.max(0, Math.min(100, percentage))
}

// 同步拨杆图片尺寸
const syncImages = () => {
  const base = sliderBase.value
  const overlay = sliderOverlay.value
  
  if (!base || !overlay) return
  
  const checkBothLoaded = () => {
    if (base.complete && overlay.complete) {
      const baseWidth = base.offsetWidth
      const baseHeight = base.offsetHeight
      
      overlay.style.width = `${baseWidth}px`
      overlay.style.height = `${baseHeight}px`
    } else {
      setTimeout(checkBothLoaded, 50)
    }
  }
  
  checkBothLoaded()
}

onMounted(() => {
  nextTick(() => {
    setTimeout(() => {
      syncImages()
    }, 100)
  })
})
</script>

<style scoped>
.slider-comparison-container {
  position: relative;
  background: #f8fafc;
  border-radius: var(--radius-md);
  padding: var(--spacing-lg);
  min-height: 600px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.slider-viewport {
  position: relative;
  background: white;
  border-radius: var(--radius-sm);
  border: 2px solid var(--border-color);
  overflow: hidden;
  display: inline-block;
  cursor: ew-resize;
  user-select: none;
}

.slider-base {
  display: block;
  max-width: 100%;
  height: auto;
  position: relative;
  z-index: 1;
  transition: transform 0.3s ease;
}

.slider-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: top left;
  z-index: 2;
  pointer-events: none;
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

.slider-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 4px;
  background: transparent;
  cursor: ew-resize;
  z-index: 10;
  transform: translateX(-50%);
  pointer-events: none;
}

.handle-line {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 2px;
  background: var(--accent-primary);
  transform: translateX(-50%);
  box-shadow: 0 0 8px rgba(99, 102, 241, 0.5);
}

.handle-grip {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 40px;
  height: 40px;
  background: var(--accent-primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 20px;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
  pointer-events: auto;
  cursor: ew-resize;
}

.slider-label {
  position: absolute;
  top: 16px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: var(--radius-md);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 5;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(99, 102, 241, 0.2);
}

.slider-label-left {
  left: 16px;
}

.slider-label-right {
  right: 16px;
}

.label-icon {
  font-size: 18px;
}

.label-text {
  white-space: nowrap;
}

.slider-hint {
  width: 100%;
  max-width: fit-content;
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
