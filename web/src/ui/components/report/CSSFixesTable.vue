<template>
  <div class="css-fixes-table-wrapper">
    <table class="css-fixes-table">
      <thead>
        <tr>
          <th class="col-priority">优先级</th>
          <th class="col-type">类型</th>
          <th class="col-selector">选择器</th>
          <th class="col-current">当前样式</th>
          <th class="col-suggested">建议样式</th>
          <th class="col-action">操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(fix, index) in fixes" :key="index">
          <td class="col-priority">
            <span class="priority-badge" :class="`priority-${fix.priority}`">
              {{ getPriorityLabel(fix.priority) }}
            </span>
          </td>
          <td class="col-type">
            <span class="type-badge">{{ getTypeLabel(fix.type) }}</span>
          </td>
          <td class="col-selector">
            <code>{{ fix.selector }}</code>
          </td>
          <td class="col-current">
            <code>{{ fix.currentCSS }}</code>
          </td>
          <td class="col-suggested">
            <div class="code-diff">
              <code 
                v-for="(prop, propIdx) in getDiffProperties(fix.currentCSS, fix.suggestedCSS)" 
                :key="propIdx"
                :class="{ 
                  'diff-added': prop.type === 'added', 
                  'diff-changed': prop.type === 'changed' 
                }"
                :title="prop.type === 'changed' ? `从 ${prop.oldValue} 修改为 ${prop.newValue}` : ''"
              >
                {{ prop.name }}: {{ prop.newValue }};
              </code>
            </div>
          </td>
          <td class="col-action">
            <div class="action-buttons">
               <button 
                 class="btn-icon btn-primary" 
                 @click="$emit('preview', fix)"
                 title="查看原页面"
               >
                 👁️
               </button>
               <button 
                 class="btn-icon btn-secondary" 
                 @click="$emit('copy', fix.suggestedCSS)"
                 title="复制代码"
               >
                 📋
               </button>
             </div>
           </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
/**
 * CSSFixesTable.vue - CSS 修复建议表格视图
 * 以紧凑的表格形式展示修复建议，适合快速浏览大量差异。
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
    size: '尺寸'
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
  /**
   * 内部工具：CSS 字符串解析器
   * 业务背景：处理 AI 建议或原始样式中的 'key:value; key:value' 格式字符串。
   * 防御逻辑：增加了对 !str 的判断，防止在处理插件导出的“非完整”数据时因空字符串导致逻辑崩溃。
   */
  const parseStr = (str) => {
    const props = {}
    if (!str) return props // 关键防御：如果输入为空（如插件导出暂无具体 CSS），直接返回空对象
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
.css-fixes-table-wrapper {
  margin-top: var(--spacing-md);
  overflow-x: auto;
}

.css-fixes-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.css-fixes-table thead {
  background: var(--bg-tertiary);
}

.css-fixes-table th,
.css-fixes-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
}

.css-fixes-table th {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.css-fixes-table tbody tr {
  transition: background 0.2s;
}

.css-fixes-table tbody tr:hover {
  background: var(--bg-glass);
}

.css-fixes-table tbody tr:last-child td {
  border-bottom: none;
}

.col-priority {
  width: 80px;
}

.col-type {
  width: 80px;
}

.col-selector {
  width: 150px;
}

.col-current,
.col-suggested {
  min-width: 200px;
}

.col-action {
  width: 120px;
  white-space: nowrap;
}

.action-buttons {
  display: flex;
  gap: 4px;
  justify-content: flex-start;
  align-items: center;
}

.action-buttons .btn {
  white-space: nowrap;
  flex-shrink: 0;
}

.btn-icon {
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn-icon.btn-primary {
  background: var(--accent-primary);
  color: white;
}

.btn-icon.btn-primary:hover {
  background: var(--accent-secondary);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(99, 102, 241, 0.3);
}

.btn-icon.btn-secondary {
  background: #f1f5f9;
  color: var(--text-secondary);
}

.btn-icon.btn-secondary:hover {
  background: #e2e8f0;
  color: var(--text-primary);
}

.priority-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  font-size: 11px;
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

.type-badge {
  display: inline-block;
  padding: 4px 10px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
}

code {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  background: var(--bg-tertiary);
  padding: 4px 8px;
  border-radius: var(--radius-xs);
  color: var(--text-primary);
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

code.suggested {
  background: #D1FAE5;
  color: #16A34A;
  font-weight: 600;
}

.code-diff {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.code-diff code {
  margin-bottom: 2px;
}

.diff-added {
  background: #D1FAE5 !important;
  color: #065F46 !important;
  border: 1px solid #10B981;
}

.diff-changed {
  background: #DBEAFE !important;
  color: #1E40AF !important;
  border: 1px solid #3B82F6;
}

.btn-copy-sm {
  padding: 6px 12px;
  background: var(--accent-primary);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-copy-sm:hover {
  background: var(--accent-secondary);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(99, 102, 241, 0.3);
}

@media (max-width: 1024px) {
  .css-fixes-table {
    font-size: 12px;
  }
  
  .css-fixes-table th,
  .css-fixes-table td {
    padding: 8px 12px;
  }
  
  code {
    font-size: 11px;
  }
}
</style>
