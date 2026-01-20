<template>
  <div class="report-header card glass">
    <div class="header-main">
      <h1 class="report-title">对比报告</h1>
      <div class="report-meta">
        <span>{{ formattedDate }}</span>
        <span>·</span>
        <span>{{ url }}</span>
      </div>
    </div>
    <div class="score-display">
      <div class="score-circle">
        <svg viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" class="score-bg" />
          <circle
            cx="50"
            cy="50"
            r="45"
            class="score-fill"
            :style="{ strokeDashoffset: scoreOffset }"
          />
        </svg>
        <div class="score-text">
          <div class="score-value">{{ similarity.toFixed(1) }}%</div>
          <div class="score-label">还原度</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * ReportHeader.vue - 报告头部组件
 * 展示报告的核心元数据，包括所属 URL、生成时间，以及一个极具视觉冲击力的“还原度”环形仪表盘。
 */
import { computed } from 'vue'
import { formatDate } from '@core/utils/format'

/**
 * 组件属性定义
 * @property {number} similarity - 整体相似度百分比 (0-100)
 * @property {number} timestamp - 报告生成的毫秒级时间戳
 * @property {string} url - 对比的目标在线地址
 */
const props = defineProps({
  similarity: Number,
  timestamp: Number,
  url: String
})

/**
 * 计算环形进度条的 CSS stroke-dashoffset
 * 原理：通过相似度百分比计算出环形路径（周长约为 283px）需要被“偏移”掉的空白长度。
 * @returns {number} 环形描边的偏移量
 */
const scoreOffset = computed(() => {
  const circumference = 2 * Math.PI * 45 // 45 是 circle 标签中定义的半径 r
  return circumference - (props.similarity / 100) * circumference
})

/** 
 * 格式化日期显示 
 */
const formattedDate = computed(() => {
  return formatDate(props.timestamp)
})
</script>

<style scoped>
.report-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  margin-bottom: 16px;
  gap: 24px;
}

.header-main {
  flex: 1;
}

.report-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 8px 0;
}

.report-meta {
  display: flex;
  gap: 8px;
  font-size: 14px;
  color: var(--text-secondary);
}

.score-display {
  flex-shrink: 0;
}

.score-circle {
  position: relative;
  width: 120px;
  height: 120px;
}

.score-circle svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.score-bg {
  fill: none;
  stroke: var(--bg-tertiary);
  stroke-width: 8;
}

.score-fill {
  fill: none;
  stroke: var(--accent-primary);
  stroke-width: 8;
  stroke-linecap: round;
  stroke-dasharray: 283;
  transition: stroke-dashoffset 0.6s ease;
}

.score-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.score-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--accent-primary);
  line-height: 1;
  margin-bottom: 4px;
}

.score-label {
  font-size: 12px;
  color: var(--text-tertiary);
}

@media (max-width: 768px) {
  .report-header {
    flex-direction: column;
    gap: 16px;
  }
}
</style>
