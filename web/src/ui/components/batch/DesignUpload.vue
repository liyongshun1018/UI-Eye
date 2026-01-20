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
    
    <!-- 多图模式 -->
    <div v-else class="multi-upload-section">
      <div v-if="!urls || urls.length === 0" class="empty-hint">
        请先在上方输入 URL 列表，然后再为各页面配置设计稿。
      </div>
      <div v-else class="url-design-list">
        <div v-for="url in urls" :key="url" class="url-design-item">
          <div class="url-name" :title="url">{{ truncateUrl(url) }}</div>
          <div class="design-action">
            <div v-if="modelValue.urlDesignMap[url]" class="design-preview-mini">
              <img :src="modelValue.urlDesignMap[url]" class="mini-img" />
              <button class="btn-remove" @click="handleRemoveMap(url)">×</button>
            </div>
            <Upload
              v-else
              accept="image/*"
              :max-size="10"
              :action="uploadAction"
              :show-file-list="false"
              @success="(file, res) => handleMultiUploadSuccess(url, res)"
            >
              <template #trigger>
                <button type="button" class="btn-upload-mini">上传设计稿</button>
              </template>
            </Upload>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * 设计稿上传组件
 * 
 * @description 该组件用于批量视觉对比任务中设计稿的管理。支持“单设计稿模式”（全局同一参考图）和“多设计稿模式”（每条 URL 独立参考图）。
 * 
 * @typedef {Object} DesignUploadData - 设计稿上传数据结构
 * @property {'single' | 'multiple'} mode - 对比模式
 * @property {string} designSource - 单图模式下的设计稿地址
 * @property {Record<string, string>} urlDesignMap - 多图模式下的 URL -> 路径映射
 */
import { Upload, Button } from '@ui/components/ui'
import { DESIGN_MODE } from '@core/constants'

const props = defineProps({
  // 选中的设计稿数据
  modelValue: {
    type: Object,
    required: true,
    default: () => ({
      mode: 'single',
      designSource: '',
      urlDesignMap: {}
    })
  },
  // 当前任务中的 URL 列表（多图模式使用）
  urls: {
    type: Array,
    default: () => []
  },
  // 上传接口基地址
  uploadAction: {
    type: String,
    default: '/api/upload'
  }
})

const emit = defineEmits(['update:modelValue'])

/**
 * 可选的设计稿模式定义
 */
const designModes = [
  {
    value: DESIGN_MODE.SINGLE,
    label: '单设计稿',
    desc: '简单快捷：所有被截图的 URL 都将与该设计稿进行像素级对比',
    icon: 'M854.6 288.6L639.4 73.4c-6-6-14.1-9.4-22.6-9.4H192c-17.7 0-32 14.3-32 32v832c0 17.7 14.3 32 32 32h640c17.7 0 32-14.3 32-32V311.3c0-8.5-3.4-16.7-9.4-22.7zM790.2 326H602V137.8L790.2 326zm1.8 562H232V136h302v216a42 42 0 0 0 42 42h216v494z'
  },
  {
    value: DESIGN_MODE.MULTIPLE,
    label: '多设计稿',
    desc: '精准对比：允许为不同的路径映射不同的设计参考图',
    icon: 'M880 112H144c-17.7 0-32 14.3-32 32v736c0 17.7 14.3 32 32 32h736c17.7 0 32-14.3 32-32V144c0-17.7-14.3-32-32-32zm-40 728H184V184h656v656z'
  }
]

/**
 * 切换设计稿模式
 * @param {'single' | 'multiple'} mode 
 */
const handleModeChange = (mode) => {
  emit('update:modelValue', {
    ...props.modelValue,
    mode,
    // 切换模式时保留数据，但可以在这里做一些重置逻辑
    urlDesignMap: mode === 'multiple' ? (props.modelValue.urlDesignMap || {}) : props.modelValue.urlDesignMap
  })
}

/**
 * 文件上传成功回调
 * @param {any} file - 原始文件对象
 * @param {any} response - 服务端返回的数据
 */
const handleUploadSuccess = (file, response) => {
  emit('update:modelValue', {
    ...props.modelValue,
    designSource: response.url || response.path
  })
}

/**
 * 多图模式文件上传成功回调
 */
const handleMultiUploadSuccess = (url, response) => {
  const newMap = { ...props.modelValue.urlDesignMap }
  newMap[url] = response.url || response.path
  emit('update:modelValue', {
    ...props.modelValue,
    urlDesignMap: newMap
  })
}

/**
 * 移除某个 URL 的设计稿映射
 */
const handleRemoveMap = (url) => {
  const newMap = { ...props.modelValue.urlDesignMap }
  delete newMap[url]
  emit('update:modelValue', {
    ...props.modelValue,
    urlDesignMap: newMap
  })
}

/**
 * 辅助函数：截断过长的 URL 用于显示
 */
const truncateUrl = (url) => {
  if (url.length <= 40) return url
  return url.substring(0, 20) + '...' + url.substring(url.length - 15)
}

/**
 * 文件上传失败回调
 * @param {any} file 
 * @param {Error} error 
 */
const handleUploadError = (file, error) => {
  console.error('设计稿上传失败，请检查网络或后端配置:', error)
}

/**
 * 点击重新上传，重置 source
 */
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
  border: 2px dashed #d9d9d9;
  border-radius: 8px;
  background: #fafafa;
  cursor: pointer;
  transition: all 0.3s;
}

.upload-placeholder:hover {
  border-color: #1677ff;
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

.multi-upload-section {
  background: #f9fafb;
  border-radius: 8px;
  padding: 20px;
  border: 1px solid #e5e7eb;
}

.empty-hint {
  text-align: center;
  color: #9ca3af;
  padding: 20px;
  font-size: 14px;
}

.url-design-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.url-design-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: white;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.url-name {
  font-family: monospace;
  font-size: 13px;
  color: #4b5563;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.design-action {
  flex-shrink: 0;
  margin-left: 20px;
}

.design-preview-mini {
  position: relative;
  width: 40px;
  height: 40px;
}

.mini-img {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid #d1d5db;
}

.btn-remove {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 16px;
  height: 16px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 50%;
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-upload-mini {
  padding: 6px 12px;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 12px;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-upload-mini:hover {
  border-color: #1677ff;
  color: #1677ff;
}
</style>
