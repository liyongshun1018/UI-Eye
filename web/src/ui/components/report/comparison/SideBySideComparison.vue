<template>
  <div class="side-by-side-container">
    <div class="comparison-side">
      <div class="side-label">设计稿</div>
      <div class="image-box">
        <img
          :src="designImage"
          alt="设计稿"
          class="side-image"
          :style="{ transform: `scale(${zoomLevel})` }"
        />
      </div>
    </div>
    
    <div class="comparison-divider">
      <div class="divider-line"></div>
      <div class="diff-stats-badge">
        <div class="stats-item">
          <span class="stats-label">差异像素</span>
          <span class="stats-value">{{ diffPixels.toLocaleString() }}</span>
        </div>
        <div class="stats-item">
          <span class="stats-label">相似度</span>
          <span class="stats-value highlight">{{ similarity.toFixed(1) }}%</span>
        </div>
      </div>
    </div>
    
    <div class="comparison-side">
      <div class="side-label">实际页面</div>
      <div class="image-box">
        <img
          :src="actualImage"
          alt="实际页面"
          class="side-image"
          :style="{ transform: `scale(${zoomLevel})` }"
        />
      </div>
    </div>
    
    <!-- 缩放控制 -->
    <div class="diff-controls">
      <button class="zoom-btn" @click="handleZoomIn" title="放大">🔍+</button>
      <button class="zoom-btn" @click="handleZoomOut" title="缩小">🔍-</button>
      <button class="zoom-btn" @click="handleResetZoom" title="重置">↺</button>
      <span class="zoom-level">{{ Math.round(zoomLevel * 100) }}%</span>
    </div>
    
    <!-- 差异提示 -->
    <div class="diff-hint-box">
      <span class="hint-icon">💡</span>
      <span class="hint-text">左右对比查看差异，可使用缩放查看细节</span>
    </div>
  </div>
</template>

<script setup>
/**
 * SideBySideComparison.vue - 并排对比组件
 * 核心功能：将设计稿与实际页面图片左右并列展示，方便用户肉眼观察排版差异。
 * 支持同步缩放以查看微观像素细节。
 */
import { ref } from 'vue'

/**
 * 组件属性定义
 * @property {string} designImage - 设计稿图片的 URL
 * @property {string} actualImage - 实际抓取的页面截图 URL
 * @property {number} diffPixels - 两个图片之间的像素差异点总数
 * @property {number} similarity - 整体视觉相似度百分比
 */
defineProps({
  designImage: String,
  actualImage: String,
  diffPixels: Number,
  similarity: Number
})

/** 响应式状态：当前的缩放级别，默认为 1（原始尺寸比例） */
const zoomLevel = ref(1)

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
.side-by-side-container {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  grid-template-rows: auto 1fr;
  gap: 16px;
  min-height: 400px;
  position: relative;
}

.comparison-side {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.side-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  text-align: center;
  padding: 8px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
}

.image-box {
  flex: 1;
  background: white;
  border-radius: var(--radius-sm);
  border: 2px solid var(--border-color);
  overflow: auto;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 16px;
}

.side-image {
  max-width: 100%;
  height: auto;
  display: block;
  transition: transform 0.3s ease;
}

.comparison-divider {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 16px 0;
}

.divider-line {
  width: 2px;
  flex: 1;
  background: linear-gradient(to bottom, transparent, var(--border-color), transparent);
}

.diff-stats-badge {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: white;
  border-radius: var(--radius-md);
  border: 2px solid var(--border-color);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 20;
  pointer-events: none;
}


.stats-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stats-label {
  font-size: 12px;
  color: var(--text-tertiary);
  white-space: nowrap;
}

.stats-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}

.stats-value.highlight {
  color: var(--accent-primary);
  font-size: 20px;
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

.diff-hint-box {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(99, 102, 241, 0.1);
  border-left: 3px solid var(--accent-primary);
  border-radius: var(--radius-sm);
  font-size: 14px;
  color: var(--text-secondary);
}

.hint-icon {
  font-size: 16px;
}

@media (max-width: 1024px) {
  .side-by-side-container {
    grid-template-columns: 1fr;
    grid-template-rows: auto;
  }
  
  .comparison-divider {
    flex-direction: row;
    padding: 0 16px;
  }
  
  .divider-line {
    width: auto;
    height: 2px;
    flex: 1;
    background: linear-gradient(to right, transparent, var(--border-color), transparent);
  }
}
</style>
