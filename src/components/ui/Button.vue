/**
 * Button 组件
 * 统一的按钮组件，支持多种类型、尺寸和状态
 */
<template>
  <button 
    :class="buttonClass" 
    :disabled="disabled || loading"
    :type="nativeType"
    @click="handleClick"
  >
    <span v-if="loading" class="button-loading">
      <svg class="loading-icon" viewBox="0 0 1024 1024">
        <path d="M512 74.667c-17.067 0-32 14.933-32 32v149.333c0 17.067 14.933 32 32 32s32-14.933 32-32V106.667c0-17.067-14.933-32-32-32z"></path>
      </svg>
    </span>
    <span class="button-content">
      <slot></slot>
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  type?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'default'
  size?: 'small' | 'medium' | 'large'
  disabled?: boolean
  loading?: boolean
  nativeType?: 'button' | 'submit' | 'reset'
  block?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'default',
  size: 'medium',
  disabled: false,
  loading: false,
  nativeType: 'button',
  block: false
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const buttonClass = computed(() => {
  return [
    'ui-button',
    `ui-button--${props.type}`,
    `ui-button--${props.size}`,
    {
      'is-disabled': props.disabled,
      'is-loading': props.loading,
      'is-block': props.block
    }
  ]
})

const handleClick = (event: MouseEvent) => {
  if (props.disabled || props.loading) {
    event.preventDefault()
    return
  }
  emit('click', event)
}
</script>

<style scoped>
.ui-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 16px;
  border: 1px solid transparent;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.5;
  cursor: pointer;
  transition: all 0.2s;
  outline: none;
  user-select: none;
}

/* 尺寸 */
.ui-button--small {
  padding: 4px 12px;
  font-size: 12px;
}

.ui-button--medium {
  padding: 8px 16px;
  font-size: 14px;
}

.ui-button--large {
  padding: 12px 20px;
  font-size: 16px;
}

/* 类型 */
.ui-button--default {
  background: #fff;
  border-color: #d9d9d9;
  color: #333;
}

.ui-button--default:hover:not(.is-disabled) {
  border-color: #4096ff;
  color: #4096ff;
}

.ui-button--primary {
  background: #1677ff;
  border-color: #1677ff;
  color: #fff;
}

.ui-button--primary:hover:not(.is-disabled) {
  background: #4096ff;
  border-color: #4096ff;
}

.ui-button--secondary {
  background: #f5f5f5;
  border-color: #f5f5f5;
  color: #333;
}

.ui-button--secondary:hover:not(.is-disabled) {
  background: #e8e8e8;
  border-color: #e8e8e8;
}

.ui-button--danger {
  background: #ff4d4f;
  border-color: #ff4d4f;
  color: #fff;
}

.ui-button--danger:hover:not(.is-disabled) {
  background: #ff7875;
  border-color: #ff7875;
}

.ui-button--success {
  background: #52c41a;
  border-color: #52c41a;
  color: #fff;
}

.ui-button--success:hover:not(.is-disabled) {
  background: #73d13d;
  border-color: #73d13d;
}

.ui-button--warning {
  background: #faad14;
  border-color: #faad14;
  color: #fff;
}

.ui-button--warning:hover:not(.is-disabled) {
  background: #ffc53d;
  border-color: #ffc53d;
}

/* 状态 */
.ui-button.is-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.ui-button.is-loading {
  cursor: not-allowed;
}

.ui-button.is-block {
  display: flex;
  width: 100%;
}

/* 加载图标 */
.button-loading {
  display: inline-flex;
  align-items: center;
}

.loading-icon {
  width: 14px;
  height: 14px;
  animation: rotate 1s linear infinite;
  fill: currentColor;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.button-content {
  display: inline-flex;
  align-items: center;
}
</style>
