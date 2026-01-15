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
// @ts-nocheck
defineProps({
  modelValue: String,
  modes: Array,
  title: String
})

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
