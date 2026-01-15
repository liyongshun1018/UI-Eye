import { ref, reactive } from 'vue'

// 全局对话框状态
const dialogState = reactive({
    visible: false,
    type: 'alert', // 'alert' | 'confirm' | 'success' | 'error'
    title: '',
    message: '',
    confirmText: '确定',
    cancelText: '取消',
    onConfirm: null,
    onCancel: null
})

// 重置状态
const resetDialog = () => {
    dialogState.visible = false
    dialogState.type = 'alert'
    dialogState.title = ''
    dialogState.message = ''
    dialogState.confirmText = '确定'
    dialogState.cancelText = '取消'
    dialogState.onConfirm = null
    dialogState.onCancel = null
}

// 显示对话框的通用方法
const showDialog = (options) => {
    return new Promise((resolve) => {
        Object.assign(dialogState, {
            visible: true,
            ...options,
            onConfirm: () => {
                resetDialog()
                resolve(true)
            },
            onCancel: () => {
                resetDialog()
                resolve(false)
            }
        })
    })
}

export function useDialog() {
    /**
     * 显示提示对话框
     * @param {string} message - 提示消息
     * @param {string} title - 标题（可选）
     */
    const showAlert = (message, title = '提示') => {
        return showDialog({
            type: 'alert',
            title,
            message,
            confirmText: '确定'
        })
    }

    /**
     * 显示确认对话框
     * @param {string} message - 确认消息
     * @param {string} title - 标题（可选）
     * @returns {Promise<boolean>} - 用户是否确认
     */
    const showConfirm = (message, title = '确认') => {
        return showDialog({
            type: 'confirm',
            title,
            message,
            confirmText: '确定',
            cancelText: '取消'
        })
    }

    /**
     * 显示成功对话框
     * @param {string} message - 成功消息
     * @param {string} title - 标题（可选）
     */
    const showSuccess = (message, title = '成功') => {
        return showDialog({
            type: 'success',
            title,
            message,
            confirmText: '确定'
        })
    }

    /**
     * 显示错误对话框
     * @param {string} message - 错误消息
     * @param {string} title - 标题（可选）
     */
    const showError = (message, title = '错误') => {
        return showDialog({
            type: 'error',
            title,
            message,
            confirmText: '确定'
        })
    }

    return {
        showAlert,
        showConfirm,
        showSuccess,
        showError,
        dialogState // 导出状态供组件使用
    }
}
