<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div v-if="dialogState.visible" class="dialog-overlay" @click.self="handleCancel">
        <Transition name="dialog-slide">
          <div v-if="dialogState.visible" class="dialog-box" role="dialog" aria-modal="true">
            <!-- 图标 -->
            <div class="dialog-icon" :class="`icon-${dialogState.type}`">
              <span v-if="dialogState.type === 'alert'">ℹ️</span>
              <span v-else-if="dialogState.type === 'confirm'">⚠️</span>
              <span v-else-if="dialogState.type === 'success'">✅</span>
              <span v-else-if="dialogState.type === 'error'">❌</span>
            </div>

            <!-- 标题 -->
            <h3 class="dialog-title">{{ dialogState.title }}</h3>

            <!-- 消息内容 -->
            <p class="dialog-message">{{ dialogState.message }}</p>

            <!-- 按钮组 -->
            <div class="dialog-actions">
              <button
                v-if="dialogState.type === 'confirm'"
                class="dialog-btn dialog-btn-cancel"
                @click="handleCancel"
              >
                {{ dialogState.cancelText }}
              </button>
              <button
                class="dialog-btn dialog-btn-confirm"
                :class="`btn-${dialogState.type}`"
                @click="handleConfirm"
                autofocus
              >
                {{ dialogState.confirmText }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { onMounted, onBeforeUnmount } from 'vue'
import { useDialog } from '@modules/composables/useDialog.ts'

const { dialogState } = useDialog()

const handleConfirm = () => {
  if (dialogState.onConfirm) {
    dialogState.onConfirm()
  }
}

const handleCancel = () => {
  if (dialogState.onCancel) {
    dialogState.onCancel()
  }
}

// 键盘事件处理
const handleKeydown = (e) => {
  if (!dialogState.visible) return
  
  if (e.key === 'Escape') {
    handleCancel()
  } else if (e.key === 'Enter') {
    handleConfirm()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.dialog-box {
  background: white;
  border-radius: 16px;
  padding: 32px;
  max-width: 420px;
  width: 90%;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.dialog-icon {
  font-size: 56px;
  margin-bottom: 16px;
  line-height: 1;
}

.dialog-title {
  margin: 0 0 12px;
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
}

.dialog-message {
  margin: 0 0 24px;
  color: #6b7280;
  font-size: 15px;
  line-height: 1.6;
  white-space: pre-wrap;
}

.dialog-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.dialog-btn {
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 100px;
}

.dialog-btn-cancel {
  background: #f3f4f6;
  color: #374151;
}

.dialog-btn-cancel:hover {
  background: #e5e7eb;
}

.dialog-btn-confirm {
  color: white;
}

.btn-alert,
.btn-confirm {
  background: #3b82f6;
}

.btn-alert:hover,
.btn-confirm:hover {
  background: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.btn-success {
  background: #10b981;
}

.btn-success:hover {
  background: #059669;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
}

.btn-error {
  background: #ef4444;
}

.btn-error:hover {
  background: #dc2626;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
}

/* 动画 */
.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity 0.2s ease;
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}

.dialog-slide-enter-active {
  transition: all 0.3s ease;
}

.dialog-slide-leave-active {
  transition: all 0.2s ease;
}

.dialog-slide-enter-from {
  transform: translateY(-20px);
  opacity: 0;
}

.dialog-slide-leave-to {
  transform: translateY(10px);
  opacity: 0;
}
</style>
