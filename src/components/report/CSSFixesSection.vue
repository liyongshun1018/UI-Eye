<template>
  <div class="fixes-section card glass">
    <div class="fixes-header">
      <h2 class="section-title">
        CSS 修复建议
        <span class="fixes-count">({{ fixes.length }} 项)</span>
      </h2>
      
      <div class="header-actions">
        <!-- 视图切换 -->
        <div class="view-switcher">
          <button
            class="view-btn"
            :class="{ active: viewMode === 'card' }"
            @click="viewMode = 'card'"
            title="卡片视图"
          >
            📋 卡片
          </button>
          <button
            class="view-btn"
            :class="{ active: viewMode === 'table' }"
            @click="viewMode = 'table'"
            title="表格视图"
          >
            📊 表格
          </button>
        </div>
        
        <button class="btn-copy-all" @click="copyAllFixes" v-if="fixes.length > 0">
          📋 复制所有修复
        </button>
      </div>
    </div>
    
    <div v-if="fixes.length === 0" class="no-fixes">
      <div class="icon">✅</div>
      <p>太棒了！未发现明显差异</p>
    </div>
    
    <template v-else>
      <!-- 卡片视图 -->
      <CSSFixesCards
        v-if="viewMode === 'card'"
        :fixes="fixes"
        @copy="copyCode"
      />
      
      <!-- 表格视图 -->
      <CSSFixesTable
        v-else
        :fixes="fixes"
        @copy="copyCode"
      />
    </template>
  </div>
</template>

<script setup>
// @ts-nocheck
import { ref } from 'vue'
import CSSFixesCards from './CSSFixesCards.vue'
import CSSFixesTable from './CSSFixesTable.vue'

const props = defineProps({
  fixes: {
    type: Array,
    required: true
  }
})

const viewMode = ref('table')

const copyCode = (code) => {
  navigator.clipboard.writeText(code).then(() => {
    // 可以添加成功提示
    console.log('已复制到剪贴板')
  })
}

const copyAllFixes = () => {
  const allCSS = props.fixes
    .map(fix => `${fix.selector} {\n  ${fix.suggestedCSS}\n}`)
    .join('\n\n')
  
  navigator.clipboard.writeText(allCSS).then(() => {
    console.log('已复制所有修复到剪贴板')
  })
}
</script>

<style scoped>
.fixes-section {
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-lg);
}

.fixes-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
  gap: var(--spacing-md);
  flex-wrap: wrap;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.fixes-count {
  font-size: 14px;
  font-weight: 400;
  color: var(--text-tertiary);
}

.header-actions {
  display: flex;
  gap: var(--spacing-md);
  align-items: center;
}

.view-switcher {
  display: flex;
  gap: 4px;
  background: var(--bg-tertiary);
  padding: 4px;
  border-radius: var(--radius-md);
}

.view-btn {
  padding: 6px 12px;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.view-btn:hover {
  background: rgba(99, 102, 241, 0.1);
  color: var(--text-primary);
}

.view-btn.active {
  background: white;
  color: var(--accent-primary);
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.btn-copy-all {
  padding: 8px 16px;
  background: var(--accent-primary);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-copy-all:hover {
  background: var(--accent-secondary);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(99, 102, 241, 0.3);
}

.no-fixes {
  padding: 48px 24px;
  text-align: center;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
}

.no-fixes .icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.no-fixes p {
  font-size: 16px;
  color: var(--text-secondary);
  margin: 0;
}

@media (max-width: 768px) {
  .fixes-header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .header-actions {
    flex-direction: column;
  }
  
  .btn-copy-all {
    width: 100%;
  }
}
</style>
