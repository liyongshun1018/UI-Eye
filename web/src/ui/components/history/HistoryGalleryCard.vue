<template>
  <div 
    class="history-gallery-card glass" 
    @click="$emit('click')"
    @mouseenter="startHover"
    @mouseleave="stopHover"
  >
    <!-- 缩略图区域 -->
    <div class="card-thumbnail">
      <!-- 成功状态：显示对比图轮播 -->
      <div v-if="report.status === 'completed'" class="thumbnail-wrapper">
        <img 
          :src="currentImage" 
          loading="lazy" 
          alt="Report Thumbnail"
          class="thumb-img"
          :class="{ 'is-hovering': isHovering }"
        />
        <div class="hover-overlay">
          <button class="btn btn-primary btn-sm">查看报告</button>
        </div>
        
        <!-- Hover 提示 -->
        <div class="hover-hint-badge" v-if="isHovering">
          {{ showingType === 'diff' ? 'Diff' : 'Actual' }}
        </div>
      </div>

      <!-- 失败/处理中状态 -->
      <div v-else class="status-placeholder" :class="report.status">
        <div class="status-icon">{{ getStatusIcon(report.status) }}</div>
        <span class="status-text">{{ getStatusText(report.status) }}</span>
      </div>
    </div>

    <!-- 卡片底部信息 -->
    <div class="card-footer">
      <div class="url-info" :title="report.config?.url">
        {{ getShortUrl(report.config?.url) }}
      </div>
      
      <!-- 差异可视化条 (健康条) -->
      <div v-if="report.status === 'completed'" class="diff-viz-bar">
        <div 
          class="viz-fill" 
          :class="getSimilarityClass(report.similarity)"
          :style="{ width: report.similarity + '%' }"
        ></div>
      </div>

      <div class="metrics-row">
        <div class="metric-group" v-if="report.status === 'completed'">
          <span class="metric-label">还原度</span>
          <span class="metric-value" :class="getSimilarityClass(report.similarity)">
            {{ report.similarity?.toFixed(1) }}%
          </span>
        </div>
        <div class="time-info">
          {{ formatDateShort(report.timestamp) }}
        </div>
      </div>
    </div>
    
    <!-- 删除按钮 (悬浮显示) -->
    <button class="btn-delete-float" @click.stop="$emit('delete')">
      🗑️
    </button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { getSimilarityClass } from '@core/utils/similarity'
import { formatDate } from '@core/utils'

const props = defineProps({
  report: {
    type: Object,
    required: true
  }
})

defineEmits(['click', 'delete'])

const isHovering = ref(false)
const showingType = ref('actual') // 'actual' | 'diff'
let hoverTimer = null

const actualImg = computed(() => props.report.images?.actual || '')
const diffImg = computed(() => props.report.images?.diff || actualImg.value)

const currentImage = computed(() => {
  if (isHovering.value && showingType.value === 'diff') {
    return diffImg.value
  }
  return actualImg.value
})

const startHover = () => {
  if (props.report.status !== 'completed') return
  isHovering.value = true
  showingType.value = 'diff' 
  hoverTimer = setInterval(() => {
    showingType.value = showingType.value === 'actual' ? 'diff' : 'actual'
  }, 1000)
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
  if (!url) return '未知页面'
  try {
    const urlObj = new URL(url)
    return urlObj.pathname === '/' ? urlObj.host : urlObj.pathname
  } catch (e) {
    return url
  }
}

const formatDateShort = (ts) => {
  if (!ts) return ''
  const date = new Date(ts)
  const today = new Date()
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString([], { month: '2-digit', day: '2-digit' })
}

const getStatusIcon = (status) => {
  const map = {
    pending: '⏳',
    processing: '🔄',
    failed: '❌'
  }
  return map[status] || '❓'
}

const getStatusText = (status) => {
  const map = {
    pending: '等待中',
    processing: '分析中...',
    failed: '任务失败'
  }
  return map[status] || status
}
</script>

<style scoped>
.history-gallery-card {
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: white;
  border: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  position: relative;
}

.history-gallery-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px -10px rgba(0, 0, 0, 0.2);
  border-color: var(--accent-primary);
}

/* 缩略图区域 */
.card-thumbnail {
  aspect-ratio: 16/10;
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
  object-position: top;
  transition: transform 0.5s ease;
}

.history-gallery-card:hover .thumb-img {
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

.history-gallery-card:hover .hover-overlay {
  opacity: 1;
}

/* 底部信息 */
.card-footer {
  padding: 14px;
  background: white;
}

.url-info {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
  transition: width 0.6s ease;
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

.time-info {
  font-size: 11px;
  color: var(--text-tertiary);
  font-weight: 600;
}

/* 状态占位 */
.status-placeholder {
  width: 100%; height: 100%;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 8px; color: var(--text-tertiary);
}

.status-icon { font-size: 24px; }

.status-placeholder.processing .status-icon {
  animation: spin 2s linear infinite;
}

@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

/* 悬浮提示 */
.hover-hint-badge {
  position: absolute; top: 8px; left: 8px;
  background: rgba(0, 0, 0, 0.6); color: white;
  font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 600;
  backdrop-filter: blur(4px);
}

/* 删除按钮 */
.btn-delete-float {
  position: absolute; top: 8px; right: 8px;
  width: 28px; height: 28px;
  background: white; border: none; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  opacity: 0; transform: scale(0.8);
  transition: all 0.2s;
  cursor: pointer;
}

.history-gallery-card:hover .btn-delete-float {
  opacity: 0.8; transform: scale(1);
}

.btn-delete-float:hover {
  opacity: 1 !important; transform: scale(1.1) !important;
  background: #fee2e2; color: #ef4444; border-color: #ef4444;
}
</style>
