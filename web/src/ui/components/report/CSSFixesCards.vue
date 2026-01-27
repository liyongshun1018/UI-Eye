<template>
  <div class="fixes-list">
    <div
      v-for="(fix, index) in fixes"
      :key="index"
      class="fix-item card-hover"
    >
      <div class="fix-header">
        <span class="fix-priority" :class="`priority-${fix.priority}`">
          {{ getPriorityLabel(fix.priority) }}
        </span>
        <span v-if="fix.regionId" class="region-badge">Region #{{ fix.regionId }}</span>
        <span class="fix-type">{{ getTypeLabel(fix.type) }}</span>
      </div>
      <h3 class="fix-description">{{ fix.description }}</h3>
      
      <!-- CSS 修复区块：仅在有 CSS 内容时显示 -->
      <div v-if="fix.suggestedCSS || fix.currentCSS" class="fix-code">
        <div class="code-block">
          <div class="code-label">当前样式</div>
          <code>{{ fix.selector }} { {{ fix.currentCSS }} }</code>
        </div>
        <div class="code-arrow">→</div>
        <div class="code-block">
          <div class="code-label">建议样式</div>
          <div class="suggested-css-container">
            <code>{{ fix.selector }} {</code>
            <div class="code-diff-lines">
              <code 
                v-for="(prop, propIdx) in getDiffProperties(fix.currentCSS, fix.suggestedCSS)" 
                :key="propIdx"
                :class="{ 
                  'diff-added': prop.type === 'added', 
                  'diff-changed': prop.type === 'changed' 
                }"
              >
                &nbsp;&nbsp;{{ prop.name }}: {{ prop.newValue }};
              </code>
            </div>
            <code>}</code>
          </div>
        </div>
      </div>

      <!-- 文字版业务建议区块 -->
      <div v-if="fix.advice" class="fix-advice-box">
        <div class="advice-label">💡 业务改进建议</div>
        <p class="advice-text">{{ fix.advice }}</p>
      </div>

      <p v-if="fix.impact" class="fix-impact">{{ fix.impact }}</p>
      
      <div class="card-actions">
        <button class="btn btn-primary btn-sm" @click="$emit('preview', fix)">
          <span class="icon">👁️</span> 查看原页面
        </button>
        <button v-if="fix.suggestedCSS" class="btn btn-secondary btn-sm" @click="$emit('copy', fix.suggestedCSS)">
          <span class="icon">📋</span> 复制代码
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * CSSFixesCards.vue - CSS 修复建议卡片视图
 * 以卡片形式展示每条修复建议，突出显示样式变更（Diff）效果。
 */

/**
 * 组件属性定义
 * @property {Array} fixes - 修复建议数组
 */
defineProps({
  fixes: {
    type: Array,
    required: true
  }
})

/**
 * 组件事件定义
 * @event copy - 点击复制按钮时触发
 * @event preview - 点击预览按钮时触发
 */
defineEmits(['copy', 'preview'])

/**
 * 获取优先级文案
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
 * 获取类型文案
 * @param {string} type - 修复类型枚举值
 * @returns {string} 中文文案
 */
const getTypeLabel = (type) => {
  const labels = {
    layout: '布局',
    color: '颜色',
    typography: '字体',
    spacing: '间距',
    size: '尺寸',
    feature: '功能',
    content: '内容',
    other: '其他'
  }
  return labels[type] || type
}

/**
 * 计算样式的差异属性
 * 通过解析当前样式和建议样式的字符串，找出被修改、新增或保持不变的属性。
 * @param {string} current - 当前样式字符串
 * @param {string} suggested - 建议样式字符串
 * @returns {Array} 差异对象数组
 */
const getDiffProperties = (current, suggested) => {
  /** 解析样式字符串为键值对象 */
  const parseStr = (str) => {
    const props = {}
    str.split(';').forEach(item => {
      const [key, val] = item.split(':').map(s => s.trim())
      if (key && val) props[key] = val
    })
    return props
  }

  const currentProps = parseStr(current)
  const suggestedProps = parseStr(suggested)
  
  return Object.entries(suggestedProps).map(([key, val]) => {
    if (!currentProps[key]) {
      return { name: key, newValue: val, type: 'added' }
    }
    if (currentProps[key] !== val) {
      return { name: key, newValue: val, oldValue: currentProps[key], type: 'changed' }
    }
    return { name: key, newValue: val, type: 'unchanged' }
  })
}
</script>

<style scoped>
.fixes-list {
  margin-top: var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.fix-item {
  background: white;
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  border: 2px solid var(--border-color);
  transition: all 0.2s;
}

.fix-item:hover {
  border-color: var(--accent-primary);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15);
}

.fix-header {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.fix-priority {
  padding: 4px 12px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 600;
}

.fix-priority.priority-critical {
  background: #FEE2E2;
  color: #DC2626;
}

.fix-priority.priority-high {
  background: #FFEDD5;
  color: #EA580C;
}

.fix-priority.priority-medium {
  background: #FEF3C7;
  color: #CA8A04;
}

.fix-priority.priority-low {
  background: #D1FAE5;
  color: #16A34A;
}

.fix-type {
  padding: 4px 12px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
}

.fix-description {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 12px 0;
}

.fix-code {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.code-block {
  flex: 1;
  min-width: 200px;
  background: var(--bg-secondary);
  padding: 12px;
  border-radius: var(--radius-sm);
  position: relative;
}

.code-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-tertiary);
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

code {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  color: var(--text-primary);
  display: block;
  word-break: break-all;
}

.suggested-css-container {
  display: flex;
  flex-direction: column;
}

.code-diff-lines {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.diff-added {
  background: #D1FAE5;
  color: #065F46;
  border-left: 2px solid #10B981;
}

.diff-changed {
  background: #DBEAFE;
  color: #1E40AF;
  border-left: 2px solid #3B82F6;
}

.code-arrow {
  font-size: 20px;
  color: var(--accent-primary);
  font-weight: bold;
}

.btn-copy {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 4px 10px;
  background: var(--accent-primary);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 11px;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-copy:hover {
  background: var(--accent-secondary);
  transform: translateY(-1px);
}

.region-badge {
  padding: 4px 10px;
  background: var(--accent-primary);
  color: white;
  border-radius: var(--radius-sm);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}

.fix-advice-box {
  background: #F0F9FF;
  border: 1px dashed #7DD3FC;
  border-radius: var(--radius-sm);
  padding: 12px;
  margin-bottom: 12px;
}

.advice-label {
  font-size: 11px;
  font-weight: 700;
  color: #0369A1;
  margin-bottom: 4px;
}

.advice-text {
  font-size: 14px;
  color: #0C4A6E;
  line-height: 1.5;
  margin: 0;
}

.fix-impact {
  font-size: 13px;
  color: #4338CA;
  margin: 0 0 12px 0;
  padding: 8px 12px;
  background: #EEF2FF;
  border-left: 3px solid var(--accent-primary);
  border-radius: var(--radius-sm);
}

@media (max-width: 768px) {
  .fix-code {
    flex-direction: column;
  }
  
  .code-arrow {
    transform: rotate(90deg);
  }
}
</style>
