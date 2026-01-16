<template>
  <div class="comparison-mode-selector">
    <h2 class="section-title">{{ title }}</h2>
    <div class="mode-switcher">
      <button
        v-for="mode in modes"
        :key="mode.value"
        class="mode-btn"
        :class="{ active: modelValue === mode.value }"
        @click="$emit('update:modelValue', mode.value)"
      >
        {{ mode.icon }} {{ mode.label }}
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
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.mode-switcher {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.mode-btn {
  padding: 8px 16px;
  background: var(--bg-secondary);
  border: 2px solid transparent;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.mode-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.mode-btn.active {
  background: var(--accent-primary);
  color: white;
  border-color: var(--accent-primary);
}

@media (max-width: 768px) {
  .comparison-mode-selector {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .mode-switcher {
    width: 100%;
  }
  
  .mode-btn {
    flex: 1;
    min-width: 0;
  }
}
</style>
