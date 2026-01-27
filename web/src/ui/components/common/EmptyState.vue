<template>
  <div class="empty-state">
    <div class="empty-icon">{{ icon }}</div>
    <h3 class="empty-title">{{ title }}</h3>
    <p class="empty-description">{{ description }}</p>
    <slot name="action">
      <button v-if="actionText" class="btn btn-primary" @click="onAction">
        {{ actionText }}
      </button>
    </slot>
  </div>
</template>

<script setup lang="ts">
/**
 * EmptyState - 空状态组件
 * 用于列表为空时的引导界面
 */

defineProps<{
  icon?: string
  title: string
  description: string
  actionText?: string
}>()

const emit = defineEmits<{
  action: []
}>()

const onAction = () => emit('action')
</script>

<style scoped>
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  background: #f8fafc;
  border-radius: 16px;
  border: 2px dashed #cbd5e1;
  margin: 2rem 0;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1.5rem;
  opacity: 0.6;
  filter: grayscale(20%);
}

.empty-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 0.75rem;
}

.empty-description {
  font-size: 0.9375rem;
  color: #64748b;
  line-height: 1.6;
  margin-bottom: 2rem;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 10px;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(37, 99, 235, 0.4);
}

/* 响应式 */
@media (max-width: 640px) {
  .empty-state {
    padding: 3rem 1.5rem;
  }

  .empty-icon {
    font-size: 3rem;
  }

  .empty-title {
    font-size: 1.125rem;
  }

  .empty-description {
    font-size: 0.875rem;
  }
}
</style>
