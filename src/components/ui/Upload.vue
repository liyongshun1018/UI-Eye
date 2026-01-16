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

<script setup lang="ts">
import { ref, computed } from 'vue'
import { formatFileSize } from '@/utils/format'

interface FileItem {
  uid: string
  name: string
  size: number
  type: string
  status: 'ready' | 'uploading' | 'success' | 'error'
  progress: number
  url?: string
  raw: File
}

interface Props {
  accept?: string
  multiple?: boolean
  disabled?: boolean
  maxSize?: number // MB
  maxCount?: number
  autoUpload?: boolean
  action?: string // 上传地址
}

const props = withDefaults(defineProps<Props>(), {
  accept: '*',
  multiple: false,
  disabled: false,
  autoUpload: true
})

const emit = defineEmits<{
  change: [files: FileItem[]]
  success: [file: FileItem, response: any]
  error: [file: FileItem, error: Error]
  remove: [file: FileItem]
  exceed: [files: File[]]
}>()

const fileInputRef = ref<HTMLInputElement>()
const fileList = ref<FileItem[]>([])
const isDragging = ref(false)

const uploadAreaClass = computed(() => [
  'upload-area',
  {
    'is-dragging': isDragging.value,
    'is-disabled': props.disabled
  }
])

const acceptHint = computed(() => {
  if (props.accept === '*') return '支持所有文件类型'
  if (props.accept.includes('image')) return '支持图片文件'
  return `支持 ${props.accept} 文件`
})

const triggerFileInput = () => {
  if (props.disabled) return
  fileInputRef.value?.click()
}

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = Array.from(target.files || [])
  handleFiles(files)
  // 清空input，允许重复选择同一文件
  target.value = ''
}

const handleDrop = (event: DragEvent) => {
  isDragging.value = false
  if (props.disabled) return
  
  const files = Array.from(event.dataTransfer?.files || [])
  handleFiles(files)
}

const handleFiles = (files: File[]) => {
  if (files.length === 0) return

  // 检查数量限制
  if (props.maxCount && fileList.value.length + files.length > props.maxCount) {
    emit('exceed', files)
    return
  }

  const newFiles: FileItem[] = files.map(file => ({
    uid: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: file.name,
    size: file.size,
    type: file.type,
    status: 'ready',
    progress: 0,
    raw: file
  }))

  // 验证文件
  const validFiles = newFiles.filter(file => validateFile(file))
  
  fileList.value.push(...validFiles)
  emit('change', fileList.value)

  // 自动上传
  if (props.autoUpload && props.action) {
    validFiles.forEach(file => uploadFile(file))
  }
}

const validateFile = (file: FileItem): boolean => {
  // 检查文件大小
  if (props.maxSize && file.size > props.maxSize * 1024 * 1024) {
    file.status = 'error'
    emit('error', file, new Error(`文件大小不能超过 ${props.maxSize}MB`))
    return false
  }

  // 检查文件类型
  if (props.accept !== '*' && !props.accept.includes(file.type)) {
    file.status = 'error'
    emit('error', file, new Error('文件类型不支持'))
    return false
  }

  return true
}

const uploadFile = async (file: FileItem) => {
  if (!props.action) return

  file.status = 'uploading'
  file.progress = 0

  try {
    const formData = new FormData()
    formData.append('file', file.raw)

    const xhr = new XMLHttpRequest()

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        file.progress = Math.round((event.loaded / event.total) * 100)
      }
    }

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

    xhr.onerror = () => {
      file.status = 'error'
      emit('error', file, new Error('网络错误'))
    }

    xhr.open('POST', props.action)
    xhr.send(formData)
  } catch (error) {
    file.status = 'error'
    emit('error', file, error as Error)
  }
}

const handleRemove = (index: number) => {
  const file = fileList.value[index]
  fileList.value.splice(index, 1)
  emit('remove', file)
  emit('change', fileList.value)
}

// 暴露方法
defineExpose({
  clearFiles: () => {
    fileList.value = []
    emit('change', [])
  },
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
