/**
 * Input 组件
 * 统一的输入框组件，支持验证、前后缀等
 */
<template>
  <div :class="wrapperClass">
    <label v-if="label" class="input-label">
      {{ label }}
      <span v-if="required" class="required-mark">*</span>
    </label>
    
    <div class="input-container">
      <span v-if="$slots.prefix || prefix" class="input-prefix">
        <slot name="prefix">{{ prefix }}</slot>
      </span>
      
      <input
        ref="inputRef"
        :class="inputClass"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :maxlength="maxlength"
        @input="handleInput"
        @blur="handleBlur"
        @focus="handleFocus"
        @keyup.enter="handleEnter"
      />
      
      <span v-if="$slots.suffix || suffix" class="input-suffix">
        <slot name="suffix">{{ suffix }}</slot>
      </span>
      
      <span v-if="clearable && modelValue && !disabled" class="input-clear" @click="handleClear">
        <svg viewBox="0 0 1024 1024" width="14" height="14">
          <path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm165.4 618.2l-66-.3L512 563.4l-99.3 118.4-66.1.3c-4.4 0-8-3.5-8-8 0-1.9.7-3.7 1.9-5.2l130.1-155L340.5 359a8.32 8.32 0 0 1-1.9-5.2c0-4.4 3.6-8 8-8l66.1.3L512 464.6l99.3-118.4 66-.3c4.4 0 8 3.5 8 8 0 1.9-.7 3.7-1.9 5.2L553.5 514l130 155c1.2 1.5 1.9 3.3 1.9 5.2 0 4.4-3.6 8-8 8z" fill="currentColor"></path>
        </svg>
      </span>
    </div>
    
    <div v-if="error || hint" class="input-message">
      <span v-if="error" class="error-message">{{ error }}</span>
      <span v-else-if="hint" class="hint-message">{{ hint }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  modelValue?: string | number
  type?: 'text' | 'password' | 'number' | 'email' | 'url' | 'tel'
  label?: string
  placeholder?: string
  disabled?: boolean
  readonly?: boolean
  required?: boolean
  clearable?: boolean
  maxlength?: number
  error?: string
  hint?: string
  prefix?: string
  suffix?: string
  size?: 'small' | 'medium' | 'large'
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  disabled: false,
  readonly: false,
  required: false,
  clearable: false,
  size: 'medium'
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
  blur: [event: FocusEvent]
  focus: [event: FocusEvent]
  enter: [event: KeyboardEvent]
}>()

const inputRef = ref<HTMLInputElement>()
const isFocused = ref(false)

const wrapperClass = computed(() => [
  'ui-input-wrapper',
  `ui-input--${props.size}`,
  {
    'is-disabled': props.disabled,
    'is-focused': isFocused.value,
    'has-error': props.error
  }
])

const inputClass = computed(() => [
  'ui-input',
  {
    'has-prefix': props.prefix || props.$slots?.prefix,
    'has-suffix': props.suffix || props.$slots?.suffix || props.clearable
  }
])

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
}

const handleBlur = (event: FocusEvent) => {
  isFocused.value = false
  emit('blur', event)
}

const handleFocus = (event: FocusEvent) => {
  isFocused.value = true
  emit('focus', event)
}

const handleEnter = (event: KeyboardEvent) => {
  emit('enter', event)
}

const handleClear = () => {
  emit('update:modelValue', '')
  inputRef.value?.focus()
}

// 暴露方法
defineExpose({
  focus: () => inputRef.value?.focus(),
  blur: () => inputRef.value?.blur()
})
</script>

<style scoped>
.ui-input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.input-label {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.required-mark {
  color: #ff4d4f;
  margin-left: 2px;
}

.input-container {
  position: relative;
  display: flex;
  align-items: center;
}

.ui-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-size: 14px;
  line-height: 1.5;
  color: #333;
  background: #fff;
  transition: all 0.2s;
  outline: none;
}

.ui-input:hover:not(:disabled) {
  border-color: #4096ff;
}

.ui-input:focus {
  border-color: #1677ff;
  box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.1);
}

.ui-input:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
  color: #999;
}

.ui-input.has-prefix {
  padding-left: 36px;
}

.ui-input.has-suffix {
  padding-right: 36px;
}

.input-prefix,
.input-suffix {
  position: absolute;
  display: flex;
  align-items: center;
  color: #999;
  font-size: 14px;
}

.input-prefix {
  left: 12px;
}

.input-suffix {
  right: 12px;
}

.input-clear {
  position: absolute;
  right: 12px;
  display: flex;
  align-items: center;
  cursor: pointer;
  color: #999;
  transition: color 0.2s;
}

.input-clear:hover {
  color: #666;
}

/* 尺寸 */
.ui-input--small .ui-input {
  padding: 4px 8px;
  font-size: 12px;
}

.ui-input--large .ui-input {
  padding: 12px 16px;
  font-size: 16px;
}

/* 状态 */
.ui-input-wrapper.is-focused .ui-input {
  border-color: #1677ff;
  box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.1);
}

.ui-input-wrapper.has-error .ui-input {
  border-color: #ff4d4f;
}

.ui-input-wrapper.has-error .ui-input:focus {
  box-shadow: 0 0 0 2px rgba(255, 77, 79, 0.1);
}

/* 消息 */
.input-message {
  font-size: 12px;
  line-height: 1.5;
}

.error-message {
  color: #ff4d4f;
}

.hint-message {
  color: #999;
}
</style>
