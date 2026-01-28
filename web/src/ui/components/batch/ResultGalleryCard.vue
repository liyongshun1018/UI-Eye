<template>
  <div 
    class="result-gallery-card glass" 
    @click="$emit('click')"
    @mouseenter="startHover"
    @mouseleave="stopHover"
  >
    <!-- 缩略图区域 -->
    <div class="card-thumbnail">
      <!-- 成功状态：显示对比图 -->
      <div v-if="item.status === 'completed'" class="thumbnail-wrapper">
        <img 
          :src="currentImage" 
          loading="lazy" 
          alt="Result Thumbnail"
          class="thumb-img"
          :class="{ 'is-hovering': isHovering }"
        />
        <div class="hover-overlay">
          <button class="btn-view">查看报告</button>
        </div>
        
        <!-- 差异点标记（如果有） -->
        <div v-if="item.diffCount > 0" class="diff-badge">
          {{ item.diffCount }} 处差异
        </div>
        
        <!-- Hover 提示 -->
        <div class="hover-hint-badge" v-if="isHovering">
          {{ showingType === 'diff' ? 'Diff' : 'Actual' }}
        </div>
      </div>

      <!-- 失败/进行中状态 -->
      <div v-else class="status-placeholder" :class="item.status">
        <div class="status-icon">{{ getStatusIcon(item.status) }}</div>
        <span class="status-text">{{ getStatusText(item.status) }}</span>
      </div>
    </div>

    <!-- 卡片底部信息 -->
    <div class="card-footer">
      <div class="url-info" :title="item.url">
        {{ getShortUrl(item.url) }}
      </div>
      
      <!-- 差异可视化条 (健康条) -->
      <div v-if="item.status === 'completed'" class="diff-viz-bar">
        <div 
          class="viz-fill" 
          :class="getSimilarityClass(item.similarity)"
          :style="{ width: item.similarity + '%' }"
        ></div>
      </div>

      <div class="metrics-row" v-if="item.status === 'completed'">
        <div class="metric-group">
          <span class="metric-label">还原度</span>
          <span class="metric-value" :class="getSimilarityClass(item.similarity)">
            {{ item.similarity?.toFixed(1) }}%
          </span>
        </div>
        <div class="status-dot completed"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { getSimilarityClass } from '@core/utils/similarity'

const props = defineProps({
  item: {
    type: Object,
    required: true
  }
})

defineEmits(['click'])

const isHovering = ref(false)
const showingType = ref('actual') // 'actual' | 'diff'
let hoverTimer = null

// 智能获取图片源
const resolveImagePath = (item, type = 'actual') => {
  if (!item) return ''
  
  // 1. 尝试直接获取完整 URL 字段
  if (type === 'diff') {
    if (item.diffImage) return item.diffImage
    if (item.diff_image_path) return item.diff_image_path
  } else {
    if (item.thumbnailUrl) return item.thumbnailUrl
    if (item.actualImage) return item.actualImage
    if (item.screenshot_path) return item.screenshot_path
  }

  // 2. 尝试通过 filename 构造
  const filename = item.filename || (item.path ? item.path.split(/[\/\\]/).pop() : null)
  if (filename) {
    return `/api/batch/screenshots/${filename}`
  }

  return ''
}

const actualImg = computed(() => resolveImagePath(props.item, 'actual'))
const diffImg = computed(() => {
  const diff = resolveImagePath(props.item, 'diff')
  return diff || props.item.targetImage || actualImg.value
})

const currentImage = computed(() => {
  if (isHovering.value && showingType.value === 'diff') {
    return diffImg.value
  }
  return actualImg.value
})

const startHover = () => {
  isHovering.value = true
  // 简单的轮播效果：Hover 时每隔 0.8s 切换一次
  showingType.value = 'diff' 
  hoverTimer = setInterval(() => {
    showingType.value = showingType.value === 'actual' ? 'diff' : 'actual'
  }, 800)
}

const stopHover = () => {
  isHovering.value = false
  showingType.value = 'actual'
  if (hoverTimer) {
    clearInterval(hoverTimer)
    hoverTimer = null
  }
}

const getShortUrl = (url) => {
  try {
    const urlObj = new URL(url)
    return urlObj.pathname === '/' ? urlObj.host : urlObj.pathname
  } catch (e) {
    return url
  }
}

const getStatusIcon = (status) => {
  const map = {
    pending: '⏳',
    running: '🔄',
    failed: '❌'
  }
  return map[status] || '❓'
}

const getStatusText = (status) => {
  const map = {
    pending: '等待中',
    running: '分析中...',
    failed: '任务失败'
  }
  return map[status] || status
}
</script>

<style scoped>
.result-gallery-card {
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: white;
  border: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
}

.result-gallery-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px -8px rgba(0, 0, 0, 0.15);
  border-color: var(--accent-primary);
}

/* 缩略图区域 */
.card-thumbnail {
  aspect-ratio: 4/3; /* 保持统一比例 */
  background: #f8fafc;
  position: relative;
  overflow: hidden;
  border-bottom: 1px solid var(--border-color);
}

.thumbnail-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
}

.thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top; /* 通常网页重点在顶部 */
  transition: transform 0.5s ease;
}

.result-gallery-card:hover .thumb-img {
  transform: scale(1.05);
}

.hover-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}

.result-gallery-card:hover .hover-overlay {
  opacity: 1;
}

.btn-view {
  background: white;
  color: var(--text-primary);
  border: none;
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: 700;
  font-size: 13px;
  transform: translateY(10px);
  transition: transform 0.2s;
}

.result-gallery-card:hover .btn-view {
  transform: translateY(0);
}

.diff-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  background: #ef4444;
  color: white;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 700;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

/* 占位状态 */
.status-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  gap: 8px;
}

.status-icon {
  font-size: 24px;
}

.status-placeholder.running .status-icon {
  animation: spin 2s linear infinite;
}

@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

/* 底部信息 */
.card-footer {
  padding: 12px;
  background: white;
}

.url-info {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: var(--font-mono);
}

.diff-viz-bar {
  width: 100%;
  height: 4px;
  background: #f1f5f9;
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 12px;
}

.viz-fill {
  height: 100%;
  transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
}

.viz-fill.similarity-excellent { background: #10b981; }
.viz-fill.similarity-good { background: #3b82f6; }
.viz-fill.similarity-warning { background: #f59e0b; }
.viz-fill.similarity-poor { background: #ef4444; }

.metrics-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.metric-group {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.metric-label {
  font-size: 11px;
  color: var(--text-tertiary);
}

.metric-value {
  font-size: 16px;
  font-weight: 800;
  font-family: var(--font-mono);
}

.metric-value.similarity-excellent { color: #10b981; }
.metric-value.similarity-good { color: #3b82f6; }
.metric-value.similarity-warning { color: #f59e0b; }
.metric-value.similarity-poor { color: #ef4444; }

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.status-dot.completed { background: #10b981; }

.hover-hint-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
  backdrop-filter: blur(4px);
  animation: fadeIn 0.2s;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.thumb-img.is-hovering {
  transition: transform 0.8s ease;
}
</style>
