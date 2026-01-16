import { ref, reactive } from 'vue'

// 对话框类型
export type DialogType = 'alert' | 'confirm' | 'success' | 'error'

// 对话框状态接口
export interface DialogState {
    visible: boolean
    type: DialogType
    title: string
    message: string
    confirmText: string
    cancelText: string
    onConfirm: (() => void) | null
    onCancel: (() => void) | null
}

// 对话框选项接口
export interface DialogOptions {
    type: DialogType
    title: string
    message: string
    confirmText?: string
    cancelText?: string
}

// 全局对话框状态
const dialogState = reactive<DialogState>({
    visible: false,
    type: 'alert',
    title: '',
    message: '',
    confirmText: '确定',
    cancelText: '取消',
    onConfirm: null,
    onCancel: null
})

// 重置状态
const resetDialog = (): void => {
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
const showDialog = (options: Partial<DialogOptions>): Promise<boolean> => {
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
     */
    const showAlert = (message: string, title: string = '提示'): Promise<boolean> => {
        return showDialog({
            type: 'alert',
            title,
            message,
            confirmText: '确定'
        })
    }

    /**
     * 显示确认对话框
     */
    const showConfirm = (message: string, title: string = '确认'): Promise<boolean> => {
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
     */
    const showSuccess = (message: string, title: string = '成功'): Promise<boolean> => {
        return showDialog({
            type: 'success',
            title,
            message,
            confirmText: '确定'
        })
    }

    /**
     * 显示错误对话框
     */
    const showError = (message: string, title: string = '错误'): Promise<boolean> => {
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
