<template>
  <div class="comparison-mode-selector">
    <div class="section-title-group">
      <span class="title-icon">👁️</span>
      <h2 class="section-title">{{ title }}</h2>
    </div>
    <div class="mode-switcher-pill">
      <button
        v-for="mode in modes"
        :key="mode.value"
        class="mode-btn"
        :class="{ active: modelValue === mode.value }"
        @click="$emit('update:modelValue', mode.value)"
      >
        <span class="btn-icon">{{ mode.icon }}</span>
        <span class="btn-label">{{ mode.label }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
/**
 * ComparisonModeSelector.vue - 对比模式选择器组件
 * 提供“高亮对比”、“并排对比”、“滑块对比”和“叠加对比”四个维度切换功能。
 */

/**
 * 组件属性定义
 * @property {string} modelValue - 当前激活的模式值 (v-model)
 * @property {Array} modes - 可选模式列表，包含 value, label, icon
 * @property {string} title - 区块标题
 */
defineProps({
  modelValue: String,
  modes: Array,
  title: String
})

/**
 * 组件事件定义
 * @event update:modelValue - 当用户点击切换按钮时触发，用于双向绑定
 */
defineEmits(['update:modelValue'])
</script>

<style scoped>
.comparison-mode-selector {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
  width: 100%;
  overflow: visible;
}

.section-title-group {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.title-icon {
  font-size: 1.25rem;
}

.section-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  letter-spacing: -0.01em;
}


/* 仿分段选择器样式的药丸容器 */
.mode-switcher-pill {
  display: flex;
  background: #f1f5f9;
  padding: 4px;
  border-radius: 14px;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05);
  gap: 4px;
  max-width: 100%;
  overflow-x: auto;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE 10+ */
  flex-shrink: 1;
}

.mode-switcher-pill::-webkit-scrollbar {
  display: none; /* Safari and Chrome */
}

.mode-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: transparent;
  border: none;
  border-radius: 10px;
  color: var(--text-secondary);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
  flex-shrink: 0;
}

.mode-btn:hover {
  color: var(--accent-primary);
  background: rgba(255, 255, 255, 0.5);
}

.mode-btn.active {
  background: white;
  color: var(--accent-primary);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04);
}

.btn-icon {
  font-size: 1.1rem;
}

@media (max-width: 1024px) {
  .comparison-mode-selector {
    justify-content: center;
    gap: 20px;
  }
}

@media (max-width: 640px) {
  .comparison-mode-selector {
    flex-direction: column;
    align-items: stretch;
  }
  
  .section-title-group {
    justify-content: center;
  }

  .mode-switcher-pill {
    justify-content: flex-start;
  }
  
  .mode-btn {
    flex: 1;
    justify-content: center;
    padding: 8px 12px;
  }
}
</style>
