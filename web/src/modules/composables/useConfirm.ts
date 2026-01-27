/**
 * useConfirm - 确认对话框 Composable
 * 提供统一的确认对话框功能
 */

import { ref } from 'vue'

interface ConfirmOptions {
    title?: string
    message: string
    confirmText?: string
    cancelText?: string
    type?: 'danger' | 'warning' | 'info'
}

interface ConfirmState {
    show: boolean
    title: string
    message: string
    confirmText: string
    cancelText: string
    type: 'danger' | 'warning' | 'info'
    resolve: ((value: boolean) => void) | null
}

const state = ref<ConfirmState>({
    show: false,
    title: '确认操作',
    message: '',
    confirmText: '确认',
    cancelText: '取消',
    type: 'info',
    resolve: null
})

export function useConfirm() {
    /**
     * 显示确认对话框
     * @param options 对话框选项
     * @returns Promise<boolean> 用户是否确认
     */
    const confirm = (options: ConfirmOptions): Promise<boolean> => {
        return new Promise((resolve) => {
            state.value = {
                show: true,
                title: options.title || '确认操作',
                message: options.message,
                confirmText: options.confirmText || '确认',
                cancelText: options.cancelText || '取消',
                type: options.type || 'info',
                resolve
            }
        })
    }

    /**
     * 用户确认
     */
    const handleConfirm = () => {
        if (state.value.resolve) {
            state.value.resolve(true)
        }
        state.value.show = false
        state.value.resolve = null
    }

    /**
     * 用户取消
     */
    const handleCancel = () => {
        if (state.value.resolve) {
            state.value.resolve(false)
        }
        state.value.show = false
        state.value.resolve = null
    }

    /**
     * 快捷方法：删除确认
     */
    const confirmDelete = (itemName?: string): Promise<boolean> => {
        return confirm({
            title: '确认删除',
            message: itemName
                ? `确定要删除"${itemName}"吗？删除后无法恢复。`
                : '确定要删除吗？删除后无法恢复。',
            confirmText: '删除',
            cancelText: '取消',
            type: 'danger'
        })
    }

    return {
        state,
        confirm,
        confirmDelete,
        handleConfirm,
        handleCancel
    }
}
