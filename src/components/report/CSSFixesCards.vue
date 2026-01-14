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
        <span class="fix-type">{{ getTypeLabel(fix.type) }}</span>
      </div>
      <h3 class="fix-description">{{ fix.description }}</h3>
      <div class="fix-code">
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
          <button class="btn-copy" @click="$emit('copy', fix.suggestedCSS)">
            复制
          </button>
        </div>
      </div>
      <p v-if="fix.impact" class="fix-impact">{{ fix.impact }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CSSFix } from '../../types/index'

defineProps<{
  fixes: CSSFix[]
}>()

defineEmits<{
  copy: [code: string]
}>()

const getPriorityLabel = (priority: string) => {
  const labels: Record<string, string> = {
    critical: '关键',
    high: '重要',
    medium: '次要',
    low: '低'
  }
  return labels[priority] || priority
}

const getTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    layout: '布局',
    color: '颜色',
    typography: '字体',
    spacing: '间距',
    size: '尺寸'
  }
  return labels[type] || type
}

interface DiffProperty {
  name: string
  newValue: string
  oldValue?: string
  type: 'added' | 'changed' | 'unchanged'
}

const getDiffProperties = (current: string, suggested: string): DiffProperty[] => {
  const parseStr = (str: string) => {
    const props: Record<string, string> = {}
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

.fix-impact {
  font-size: 13px;
  color: var(--text-tertiary);
  margin: 0;
  padding: 8px 12px;
  background: rgba(99, 102, 241, 0.05);
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
