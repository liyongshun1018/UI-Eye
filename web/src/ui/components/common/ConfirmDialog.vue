<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show" class="modal-overlay" @click="onCancel">
        <div class="modal-container" @click.stop>
          <div class="modal-content">
            <!-- 图标 -->
            <div class="modal-icon" :class="`modal-icon-${type}`">
              <span v-if="type === 'danger'">⚠️</span>
              <span v-else-if="type === 'warning'">⚡</span>
              <span v-else>ℹ️</span>
            </div>

            <!-- 标题 -->
            <h3 class="modal-title">{{ title }}</h3>

            <!-- 消息 -->
            <p class="modal-message">{{ message }}</p>

            <!-- 操作按钮 -->
            <div class="modal-actions">
              <button 
                class="btn btn-secondary" 
                @click="onCancel"
              >
                {{ cancelText }}
              </button>
              <button 
                class="btn"
                :class="type === 'danger' ? 'btn-danger' : 'btn-primary'"
                @click="onConfirm"
              >
                {{ confirmText }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * ConfirmDialog - 确认对话框组件
 * 全局确认对话框，支持不同类型的确认操作
 */

defineProps<{
  show: boolean
  title: string
  message: string
  confirmText: string
  cancelText: string
  type: 'danger' | 'warning' | 'info'
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const onConfirm = () => emit('confirm')
const onCancel = () => emit('cancel')

// ESC 键关闭
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    onCancel()
  }
}

// 监听键盘事件
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', handleKeydown)
}
</script>

<style scoped>
/* 遮罩层 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
}

/* 容器 */
.modal-container {
  width: 100%;
  max-width: 420px;
  animation: modalSlideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* 内容 */
.modal-content {
  background: white;
  border-radius: 20px;
  padding: 2rem;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

/* 图标 */
.modal-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 1.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
}

.modal-icon-danger {
  background: #fee2e2;
  color: #ef4444;
}

.modal-icon-warning {
  background: #fef3c7;
  color: #f59e0b;
}

.modal-icon-info {
  background: #dbeafe;
  color: #3b82f6;
}

/* 标题 */
.modal-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 0.75rem;
}

/* 消息 */
.modal-message {
  font-size: 0.9375rem;
  color: #64748b;
  line-height: 1.6;
  margin-bottom: 2rem;
}

/* 操作按钮 */
.modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
}

.btn {
  flex: 1;
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
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover {
  background: #dc2626;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

.btn-secondary {
  background: white;
  color: #475569;
  border: 2px solid #e2e8f0;
}

.btn-secondary:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}

/* 动画 */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-container {
  animation: modalSlideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-leave-active .modal-container {
  animation: modalSlideOut 0.2s ease-out;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes modalSlideOut {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
}

/* 响应式 */
@media (max-width: 640px) {
  .modal-content {
    padding: 1.5rem;
  }

  .modal-actions {
    flex-direction: column-reverse;
  }

  .btn {
    width: 100%;
  }
}
</style>
