/**
 * Upload 组件
 * 文件上传组件，支持拖拽、多文件、进度显示
 */
<template>
  <div class="ui-upload">
    <div
      :class="uploadAreaClass"
      @drop.prevent="handleDrop"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @click="triggerFileInput"
    >
      <input
        ref="fileInputRef"
        type="file"
        :accept="accept"
        :multiple="multiple"
        :disabled="disabled"
        style="display: none"
        @change="handleFileChange"
      />
      
      <slot name="trigger">
        <div class="upload-trigger">
          <svg class="upload-icon" viewBox="0 0 1024 1024" width="48" height="48">
            <path d="M518.3 459a8 8 0 0 0-12.6 0l-112 141.7a7.98 7.98 0 0 0 6.3 12.9h73.9V856c0 4.4 3.6 8 8 8h60c4.4 0 8-3.6 8-8V613.7H624c6.7 0 10.4-7.7 6.3-12.9L518.3 459z" fill="currentColor"></path>
            <path d="M811.4 366.7C765.6 245.9 648.9 160 512.2 160S258.8 245.8 213 366.6C127.3 389.1 64 467.2 64 560c0 110.5 89.5 200 200 200h472c110.5 0 200-89.5 200-200 0-92.7-63.1-170.7-148.6-193.3zM512 714c-4.4 0-8-3.6-8-8V502.7h-73.9c-6.7 0-10.4-7.7-6.3-12.9l112-141.7c3.5-4.4 9.7-4.4 13.2 0l112 141.7c4.1 5.2.4 12.9-6.3 12.9H584V706c0 4.4-3.6 8-8 8h-64z" fill="currentColor"></path>
          </svg>
          <p class="upload-text">
            <span v-if="isDragging" class="dragging-text">释放以上传文件</span>
            <span v-else>
              点击或拖拽文件到此处上传
              <br />
              <span class="upload-hint">{{ acceptHint }}</span>
            </span>
          </p>
        </div>
      </slot>
    </div>

    <div v-if="fileList.length > 0" class="file-list">
      <div
        v-for="(file, index) in fileList"
        :key="file.uid"
        class="file-item"
      >
        <div class="file-info">
          <svg class="file-icon" viewBox="0 0 1024 1024" width="16" height="16">
            <path d="M854.6 288.6L639.4 73.4c-6-6-14.1-9.4-22.6-9.4H192c-17.7 0-32 14.3-32 32v832c0 17.7 14.3 32 32 32h640c17.7 0 32-14.3 32-32V311.3c0-8.5-3.4-16.7-9.4-22.7zM790.2 326H602V137.8L790.2 326zm1.8 562H232V136h302v216a42 42 0 0 0 42 42h216v494z" fill="currentColor"></path>
          </svg>
          <span class="file-name">{{ file.name }}</span>
          <span class="file-size">{{ formatFileSize(file.size) }}</span>
        </div>

        <div class="file-actions">
          <span v-if="file.status === 'uploading'" class="file-progress">
            {{ file.progress }}%
          </span>
          <span v-else-if="file.status === 'success'" class="file-status success">
            <svg viewBox="0 0 1024 1024" width="14" height="14">
              <path d="M912 190h-69.9c-9.8 0-19.1 4.5-25.1 12.2L404.7 724.5 207 474a32 32 0 0 0-25.1-12.2H112c-6.7 0-10.4 7.7-6.3 12.9l273.9 347c12.8 16.2 37.4 16.2 50.3 0l488.4-618.9c4.1-5.1.4-12.8-6.3-12.8z" fill="currentColor"></path>
            </svg>
          </span>
          <span v-else-if="file.status === 'error'" class="file-status error">
            <svg viewBox="0 0 1024 1024" width="14" height="14">
              <path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm165.4 618.2l-66-.3L512 563.4l-99.3 118.4-66.1.3c-4.4 0-8-3.5-8-8 0-1.9.7-3.7 1.9-5.2l130.1-155L340.5 359a8.32 8.32 0 0 1-1.9-5.2c0-4.4 3.6-8 8-8l66.1.3L512 464.6l99.3-118.4 66-.3c4.4 0 8 3.5 8 8 0 1.9-.7 3.7-1.9 5.2L553.5 514l130 155c1.2 1.5 1.9 3.3 1.9 5.2 0 4.4-3.6 8-8 8z" fill="currentColor"></path>
            </svg>
          </span>
          
          <button
            class="remove-btn"
            @click="handleRemove(index)"
          >
            <svg viewBox="0 0 1024 1024" width="14" height="14">
              <path d="M360 184h-8c4.4 0 8-3.6 8-8v8h304v-8c0 4.4 3.6 8 8 8h-8v72h72v-80c0-35.3-28.7-64-64-64H352c-35.3 0-64 28.7-64 64v80h72v-72zm504 72H160c-17.7 0-32 14.3-32 32v32c0 4.4 3.6 8 8 8h60.4l24.7 523c1.6 34.1 29.8 61 63.9 61h454c34.2 0 62.3-26.8 63.9-61l24.7-523H888c4.4 0 8-3.6 8-8v-32c0-17.7-14.3-32-32-32zM731.3 840H292.7l-24.2-512h487l-24.2 512z" fill="currentColor"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * Upload 组件 - 文件上传组件
 * 
 * @description 支持点击/拖拽上传文件，提供多文件管理、进度实时展示、文件校验等功能。
 * 
 * @typedef {Object} FileItem - 文件项信息
 * @property {string} uid - 唯一标识符
 * @property {string} name - 文件名称
 * @property {number} size - 文件大小 (bytes)
 * @property {string} type - 文件 MIME 类型
 * @property {string} status - 上传状态: 'ready' | 'uploading' | 'success' | 'error'
 * @property {number} progress - 上传进度 (0-100)
 * @property {string} [url] - 文件访问地址 (上传成功后由后端返回)
 * @property {File} raw - 原始 File 对象
 * 
 * @property {string} [accept='*'] - 接受上传的文件类型
 * @property {boolean} [multiple=false] - 是否支持多选
 * @property {boolean} [disabled=false] - 是否禁用上传
 * @property {number} [maxSize] - 单个文件最大大小 (单位: MB)
 * @property {number} [maxCount] - 允许上传的文件最大数量
 * @property {boolean} [autoUpload=true] - 选择文件后是否自动开启上传
 * @property {string} [action] - 文件上传接口地址
 */
import { ref, computed } from 'vue'
import { formatFileSize } from '@core/utils/format'

const props = defineProps({
  // 接受上传的文件类型
  accept: {
    type: String,
    default: '*'
  },
  // 是否支持多选
  multiple: {
    type: Boolean,
    default: false
  },
  // 是否禁用上传
  disabled: {
    type: Boolean,
    default: false
  },
  // 单个文件最大大小 (MB)
  maxSize: Number,
  // 最大上传文件数
  maxCount: Number,
  // 是否选择后即上传
  autoUpload: {
    type: Boolean,
    default: true
  },
  // 上传接口地址
  action: String
})

const emit = defineEmits(['change', 'success', 'error', 'remove', 'exceed'])

/** @type {import('vue').Ref<HTMLInputElement|null>} */
const fileInputRef = ref(null)
/** @type {import('vue').Ref<FileItem[]>} */
const fileList = ref([])
/** @type {import('vue').Ref<boolean>} */
const isDragging = ref(false)

/**
 * 根据状态和属性计算上传区域的 CSS 类名
 */
const uploadAreaClass = computed(() => [
  'upload-area',
  {
    'is-dragging': isDragging.value,
    'is-disabled': props.disabled
  }
])

/**
 * 格式化并展示接受的文件类型提示
 */
const acceptHint = computed(() => {
  if (props.accept === '*') return '支持所有文件类型'
  if (props.accept.includes('image')) return '支持图片文件'
  return `支持 ${props.accept} 文件`
})

/**
 * 手动触发隐藏的 input 选择框
 */
const triggerFileInput = () => {
  if (props.disabled) return
  fileInputRef.value?.click()
}

/**
 * 处理文件选择变更事件
 * @param {Event} event 
 */
const handleFileChange = (event) => {
  const files = Array.from(event.target.files || [])
  handleFiles(files)
  // 清空 value 使得选择同一文件时也能触发 change
  event.target.value = ''
}

/**
 * 处理拖拽释放事件
 * @param {DragEvent} event 
 */
const handleDrop = (event) => {
  isDragging.value = false
  if (props.disabled) return
  
  const files = Array.from(event.dataTransfer?.files || [])
  handleFiles(files)
}

/**
 * 统一处理并校验选择的文件
 * @param {File[]} files 
 */
const handleFiles = (files) => {
  if (files.length === 0) return

  // 检查上传文件总数是否超出限制
  if (props.maxCount && fileList.value.length + files.length > props.maxCount) {
    emit('exceed', files)
    return
  }

  // 包装为 FileItem 对象
  const newFiles = files.map(file => ({
    uid: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: file.name,
    size: file.size,
    type: file.type,
    status: 'ready',
    progress: 0,
    raw: file
  }))

  // 逐一验证并筛选合格文件
  const validFiles = newFiles.filter(file => validateFile(file))
  
  fileList.value.push(...validFiles)
  emit('change', fileList.value)

  // 如果配置了自动上传且有目标接口，则立刻启动
  if (props.autoUpload && props.action) {
    validFiles.forEach(file => uploadFile(file))
  }
}

/**
 * 文件基本信息校验
 * @param {FileItem} file 
 * @returns {boolean}
 */
const validateFile = (file) => {
  // 校验文件大小 (单文件)
  if (props.maxSize && file.size > props.maxSize * 1024 * 1024) {
    file.status = 'error'
    emit('error', file, new Error(`文件大小不能超过 ${props.maxSize}MB`))
    return false
  }

  // 校验文件后缀/类型
  if (props.accept !== '*') {
    const acceptTypes = props.accept.split(',').map(t => t.trim())
    let isValid = false

    for (const acceptType of acceptTypes) {
      // 支持通配符，如 image/*
      if (acceptType.includes('/*')) {
        const baseType = acceptType.split('/')[0]
        if (file.type.startsWith(baseType + '/')) {
          isValid = true
          break
        }
      }
      // 支持扩展名，如 .png
      else if (acceptType.startsWith('.')) {
        if (file.name.toLowerCase().endsWith(acceptType.toLowerCase())) {
          isValid = true
          break
        }
      }
      // 支持完整 MIME 类型，如 image/png
      else if (file.type === acceptType) {
        isValid = true
        break
      }
    }

    if (!isValid) {
      file.status = 'error'
      emit('error', file, new Error('文件类型不支持'))
      return false
    }
  }

  return true
}

/**
 * 原生请求方式执行文件上传逻辑
 * @param {FileItem} file 
 */
const uploadFile = async (file) => {
  if (!props.action) return

  file.status = 'uploading'
  file.progress = 0

  try {
    const formData = new FormData()
    formData.append('file', file.raw)

    const xhr = new XMLHttpRequest()

    // 监听进度变更
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        file.progress = Math.round((event.loaded / event.total) * 100)
      }
    }

    // 处理请求响应
    xhr.onload = () => {
      if (xhr.status === 200) {
        file.status = 'success'
        const response = JSON.parse(xhr.responseText)
        file.url = response.url
        emit('success', file, response)
      } else {
        file.status = 'error'
        emit('error', file, new Error('上传失败'))
      }
    }

    // 捕获网络层错误
    xhr.onerror = () => {
      file.status = 'error'
      emit('error', file, new Error('网络错误'))
    }

    xhr.open('POST', props.action)
    xhr.send(formData)
  } catch (error) {
    file.status = 'error'
    emit('error', file, error)
  }
}

/**
 * 移除已选中的文件或上传失败的文件
 * @param {number} index 
 */
const handleRemove = (index) => {
  const file = fileList.value[index]
  fileList.value.splice(index, 1)
  emit('remove', file)
  emit('change', fileList.value)
}

/**
 * 对外暴露的能力和方法
 */
defineExpose({
  /** 清空已显示的所有文件 */
  clearFiles: () => {
    fileList.value = []
    emit('change', [])
  },
  /** 手动触发表单中所有还未上传的文件进行上传 */
  submit: () => {
    fileList.value
      .filter(f => f.status === 'ready')
      .forEach(f => uploadFile(f))
  }
})
</script>

<style scoped>
.ui-upload {
  width: 100%;
}

.upload-area {
  border: 2px dashed #d9d9d9;
  border-radius: 8px;
  padding: 32px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  background: #fafafa;
}

.upload-area:hover:not(.is-disabled) {
  border-color: #1677ff;
  background: #f0f7ff;
}

.upload-area.is-dragging {
  border-color: #1677ff;
  background: #e6f4ff;
}

.upload-area.is-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.upload-trigger {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.upload-icon {
  color: #1677ff;
}

.upload-text {
  margin: 0;
  font-size: 14px;
  color: #666;
  line-height: 1.6;
}

.dragging-text {
  color: #1677ff;
  font-weight: 500;
}

.upload-hint {
  font-size: 12px;
  color: #999;
}

.file-list {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.file-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  background: #fff;
  transition: all 0.2s;
}

.file-item:hover {
  background: #fafafa;
}

.file-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.file-icon {
  flex-shrink: 0;
  color: #1677ff;
}

.file-name {
  flex: 1;
  font-size: 14px;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  flex-shrink: 0;
  font-size: 12px;
  color: #999;
}

.file-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.file-progress {
  font-size: 12px;
  color: #1677ff;
}

.file-status {
  display: flex;
  align-items: center;
}

.file-status.success {
  color: #52c41a;
}

.file-status.error {
  color: #ff4d4f;
}

.remove-btn {
  display: flex;
  align-items: center;
  padding: 4px;
  border: none;
  background: none;
  color: #999;
  cursor: pointer;
  transition: color 0.2s;
}

.remove-btn:hover {
  color: #ff4d4f;
}
</style>
