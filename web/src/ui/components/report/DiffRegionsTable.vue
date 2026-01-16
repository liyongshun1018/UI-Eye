<template>
  <div class="regions-table-wrapper">
    <table v-if="regions.length > 0" class="regions-table">
      <thead>
        <tr>
          <th class="col-priority">优先级</th>
          <th class="col-id">ID</th>
          <th class="col-desc">描述</th>
          <th class="col-position">位置</th>
          <th class="col-size">尺寸</th>
          <th class="col-pixels">差异像素</th>
          <th class="col-action">操作</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="region in regions"
          :key="region.id"
          :class="`priority-row priority-${region.priority}`"
        >
          <td class="col-priority">
            <span class="priority-badge" :class="`priority-${region.priority}`">
              {{ getPriorityLabel(region.priority) }}
            </span>
          </td>
          <td class="col-id">
            <span class="region-number">{{ region.id }}</span>
          </td>
          <td class="col-desc">
            <div class="desc-with-score">
              <span class="desc-text">{{ region.description }}</span>
              <div class="score-indicator" v-if="region.score">
                <div class="score-bar" :style="{ width: `${region.score}%`, backgroundColor: getScoreColor(region.score) }"></div>
                <span class="score-val">{{ region.score }}%</span>
              </div>
            </div>
          </td>
          <td class="col-position"><code>({{ region.x }}, {{ region.y }})</code></td>
          <td class="col-size"><code>{{ region.width }}×{{ region.height }}px</code></td>
          <td class="col-pixels"><code>{{ region.pixelCount?.toLocaleString() || 'N/A' }}</code></td>
          <td class="col-action">
            <button class="btn-locate-sm" @click="$emit('locate', region)">
              <span class="locate-icon">🎯</span>
              定位
            </button>
          </td>
        </tr>
      </tbody>
    </table>
    
    <div v-else class="no-regions">
      <span class="no-regions-icon">✨</span>
      <span>当前过滤条件下没有差异区域</span>
    </div>
  </div>
</template>

<script setup>
/**
 * DiffRegionsTable.vue - 差异区域表格视图
 * 以数据表格的形式展示所有检测到的差异，包含详细的坐标、尺寸及像素级差异统计。
 */

/**
 * 组件属性定义
 * @property {Array} regions - 差异区域对象数组
 */
defineProps({
  regions: {
    type: Array,
    required: true
  }
})

/**
 * 组件事件定义
 * @event locate - 当用户点击“定位”按钮时触发
 */
defineEmits(['locate'])

/**
 * 获取优先级文案
 * @param {string} priority - 优先级枚举值
 * @returns {string} 中文文案
 */
const getPriorityLabel = (priority) => {
  const labels = {
    critical: '关键',
    high: '重要',
    medium: '次要',
    low: '低'
  }
  return labels[priority] || priority
}

/**
 * 根据分数获取进度条颜色
 * @param {number} score - 权重分数 (0-100)
 * @returns {string} CSS 颜色值
 */
const getScoreColor = (score) => {
  if (score < 60) return '#DC2626' // 红色 (高风险)
  if (score < 85) return '#EA580C' // 橙色 (中等风险)
  return '#16A34A' // 绿色 (低风险)
}
</script>

<style scoped>
.regions-table-wrapper {
  margin-top: var(--spacing-md);
}

.regions-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.regions-table thead {
  background: var(--bg-tertiary);
  font-weight: var(--font-weight-semibold);
}

.regions-table th,
.regions-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
}

.regions-table th {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.regions-table tbody tr {
  transition: background 0.2s;
}

.regions-table tbody tr:hover {
  background: var(--bg-glass);
}

.regions-table tbody tr:last-child td {
  border-bottom: none;
}

.col-priority {
  width: 100px;
}

.col-id {
  width: 60px;
}

.col-desc {
  min-width: 250px;
}

.col-position {
  width: 100px;
}

.col-size {
  width: 100px;
}

.col-pixels {
  width: 90px;
}

.col-action {
  width: 100px;
}

.priority-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.priority-badge.priority-critical {
  background: #FEE2E2;
  color: #DC2626;
}

.priority-badge.priority-high {
  background: #FFEDD5;
  color: #EA580C;
}

.priority-badge.priority-medium {
  background: #FEF3C7;
  color: #CA8A04;
}

.priority-badge.priority-low {
  background: #D1FAE5;
  color: #16A34A;
}

.region-number {
  display: inline-block;
  padding: 4px 8px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  font-weight: 600;
  font-size: 13px;
  color: var(--text-primary);
}

.desc-with-score {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.desc-text {
  font-weight: 500;
  color: var(--text-primary);
}

.score-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 120px;
}

.score-bar {
  height: 4px;
  border-radius: 2px;
  background: var(--bg-tertiary);
  flex: 1;
}

.score-val {
  font-size: 11px;
  color: var(--text-tertiary);
  min-width: 30px;
}

.col-position,
.col-size,
.col-pixels {
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--text-secondary);
}

.btn-locate-sm {
  padding: 6px 12px;
  background: var(--accent-primary);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}

.btn-locate-sm:hover {
  background: var(--accent-secondary);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(99, 102, 241, 0.3);
}

.locate-icon {
  font-size: 14px;
}

.no-regions {
  padding: 48px 24px;
  text-align: center;
  color: var(--text-tertiary);
  font-size: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.no-regions-icon {
  font-size: 48px;
  opacity: 0.5;
}

@media (max-width: 1024px) {
  .regions-table {
    font-size: 13px;
  }
  
  .regions-table th,
  .regions-table td {
    padding: 8px 12px;
  }
  
  .col-desc {
    min-width: 150px;
  }
}
</style>
