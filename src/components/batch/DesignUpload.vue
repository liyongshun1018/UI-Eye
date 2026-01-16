/**
 * 设计稿上传组件
 * 用于批量任务的设计稿上传
 */
<template>
  <div class="design-upload">
    <div class="section-header">
      <h3 class="section-title">设计稿配置</h3>
      <p class="section-desc">上传设计稿用于视觉对比</p>
    </div>

    <div class="design-mode">
      <label class="mode-label">设计稿模式</label>
      <div class="mode-options">
        <label
          v-for="mode in designModes"
          :key="mode.value"
          :class="['mode-option', { active: modelValue.mode === mode.value }]"
        >
          <input
            type="radio"
            :value="mode.value"
            :checked="modelValue.mode === mode.value"
            @change="handleModeChange(mode.value)"
          />
          <div class="mode-content">
            <svg class="mode-icon" viewBox="0 0 1024 1024" width="20" height="20">
              <path :d="mode.icon" fill="currentColor"></path>
            </svg>
            <div class="mode-info">
              <div class="mode-name">{{ mode.label }}</div>
              <div class="mode-desc">{{ mode.desc }}</div>
            </div>
          </div>
        </label>
      </div>
    </div>

    <div v-if="modelValue.mode === 'single'" class="upload-section">
      <Upload
        accept="image/*"
        :max-size="10"
        :action="uploadAction"
        @success="handleUploadSuccess"
        @error="handleUploadError"
      >
        <template #trigger>
          <div v-if="!modelValue.designSource" class="upload-placeholder">
            <svg viewBox="0 0 1024 1024" width="48" height="48">
              <path d="M518.3 459a8 8 0 0 0-12.6 0l-112 141.7a7.98 7.98 0 0 0 6.3 12.9h73.9V856c0 4.4 3.6 8 8 8h60c4.4 0 8-3.6 8-8V613.7H624c6.7 0 10.4-7.7 6.3-12.9L518.3 459z" fill="currentColor"></path>
            </svg>
            <p>点击或拖拽上传设计稿</p>
            <p class="hint">支持 PNG、JPG 格式，大小不超过 10MB</p>
          </div>
          <div v-else class="preview-container">
            <img :src="modelValue.designSource" alt="设计稿预览" class="preview-image" />
            <div class="preview-overlay">
              <Button type="secondary" size="small" @click.stop="handleReupload">
                重新上传
              </Button>
            </div>
          </div>
        </template>
      </Upload>
    </div>

    <div v-else class="multi-upload-hint">
      <svg viewBox="0 0 1024 1024" width="16" height="16">
        <path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm-32 232c0-4.4 3.6-8 8-8h48c4.4 0 8 3.6 8 8v272c0 4.4-3.6 8-8 8h-48c-4.4 0-8-3.6-8-8V296zm32 440a48.01 48.01 0 0 1 0-96 48.01 48.01 0 0 1 0 96z" fill="currentColor"></path>
      </svg>
      <span>多设计稿模式下，需要为每个URL单独指定设计稿（暂未实现）</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import { Upload, Button } from '@/components/ui'
import { DESIGN_MODE } from '@/constants'

interface DesignUploadData {
  mode: 'single' | 'multiple'
  designSource: string
}

interface Props {
  modelValue: DesignUploadData
  uploadAction?: string
}

const props = withDefaults(defineProps<Props>(), {
  uploadAction: '/api/upload'
})

const emit = defineEmits<{
  'update:modelValue': [value: DesignUploadData]
}>()

const designModes = [
  {
    value: DESIGN_MODE.SINGLE,
    label: '单设计稿',
    desc: '所有URL共用一个设计稿',
    icon: 'M854.6 288.6L639.4 73.4c-6-6-14.1-9.4-22.6-9.4H192c-17.7 0-32 14.3-32 32v832c0 17.7 14.3 32 32 32h640c17.7 0 32-14.3 32-32V311.3c0-8.5-3.4-16.7-9.4-22.7zM790.2 326H602V137.8L790.2 326zm1.8 562H232V136h302v216a42 42 0 0 0 42 42h216v494z'
  },
  {
    value: DESIGN_MODE.MULTIPLE,
    label: '多设计稿',
    desc: '每个URL对应一个设计稿',
    icon: 'M880 112H144c-17.7 0-32 14.3-32 32v736c0 17.7 14.3 32 32 32h736c17.7 0 32-14.3 32-32V144c0-17.7-14.3-32-32-32zm-40 728H184V184h656v656z'
  }
]

const handleModeChange = (mode: 'single' | 'multiple') => {
  emit('update:modelValue', {
    ...props.modelValue,
    mode,
    designSource: mode === 'multiple' ? '' : props.modelValue.designSource
  })
}

const handleUploadSuccess = (file: any, response: any) => {
  emit('update:modelValue', {
    ...props.modelValue,
    designSource: response.url || response.path
  })
}

const handleUploadError = (file: any, error: Error) => {
  console.error('上传失败:', error)
}

const handleReupload = () => {
  emit('update:modelValue', {
    ...props.modelValue,
    designSource: ''
  })
}
</script>

<style scoped>
.design-upload {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.section-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.section-desc {
  margin: 0;
  font-size: 14px;
  color: #999;
}

.design-mode {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mode-label {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.mode-options {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.mode-option {
  position: relative;
  display: flex;
  padding: 16px;
  border: 2px solid #e8e8e8;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.mode-option:hover {
  border-color: #1677ff;
  background: #f0f7ff;
}

.mode-option.active {
  border-color: #1677ff;
  background: #e6f4ff;
}

.mode-option input[type="radio"] {
  position: absolute;
  opacity: 0;
}

.mode-content {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
}

.mode-icon {
  flex-shrink: 0;
  color: #1677ff;
}

.mode-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mode-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.mode-desc {
  font-size: 12px;
  color: #999;
}

.upload-section {
  margin-top: 8px;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px;
  color: #1677ff;
}

.upload-placeholder p {
  margin: 0;
  font-size: 14px;
  color: #666;
}

.upload-placeholder .hint {
  font-size: 12px;
  color: #999;
}

.preview-container {
  position: relative;
  display: inline-block;
  max-width: 400px;
}

.preview-image {
  width: 100%;
  height: auto;
  border-radius: 8px;
  display: block;
}

.preview-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 8px;
  opacity: 0;
  transition: opacity 0.2s;
}

.preview-container:hover .preview-overlay {
  opacity: 1;
}

.multi-upload-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #fff7e6;
  border: 1px solid #ffd591;
  border-radius: 6px;
  color: #fa8c16;
  font-size: 14px;
}

.multi-upload-hint svg {
  flex-shrink: 0;
}
</style>
