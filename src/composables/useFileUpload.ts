/**
 * 文件上传 Composable
 * 提供文件上传相关的状态和方法
 */
import { ref } from 'vue'
import { upload } from '@/utils/request'

export interface UploadFile {
    uid: string
    name: string
    size: number
    type: string
    status: 'ready' | 'uploading' | 'success' | 'error'
    progress: number
    url?: string
    raw: File
    error?: string
}

export interface UseFileUploadOptions {
    maxSize?: number // MB
    accept?: string
    autoUpload?: boolean
    action?: string
    onSuccess?: (file: UploadFile, response: any) => void
    onError?: (file: UploadFile, error: Error) => void
}

export function useFileUpload(options: UseFileUploadOptions = {}) {
    const {
        maxSize,
        accept,
        autoUpload = false,
        action,
        onSuccess,
        onError
    } = options

    const fileList = ref<UploadFile[]>([])
    const uploading = ref(false)

    /**
     * 添加文件
     */
    const addFiles = (files: File[]) => {
        const newFiles: UploadFile[] = files.map(file => ({
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

        // 自动上传
        if (autoUpload && action) {
            validFiles.forEach(file => uploadFile(file))
        }

        return validFiles
    }

    /**
     * 验证文件
     */
    const validateFile = (file: UploadFile): boolean => {
        // 检查文件大小
        if (maxSize && file.size > maxSize * 1024 * 1024) {
            file.status = 'error'
            file.error = `文件大小不能超过 ${maxSize}MB`
            if (onError) {
                onError(file, new Error(file.error))
            }
            return false
        }

        // 检查文件类型
        if (accept && accept !== '*' && !accept.includes(file.type)) {
            file.status = 'error'
            file.error = '文件类型不支持'
            if (onError) {
                onError(file, new Error(file.error))
            }
            return false
        }

        return true
    }

    /**
     * 上传文件
     */
    const uploadFile = async (file: UploadFile) => {
        if (!action) return

        file.status = 'uploading'
        file.progress = 0
        uploading.value = true

        try {
            const formData = new FormData()
            formData.append('file', file.raw)

            const response = await upload(action, formData, (percent) => {
                file.progress = percent
            })

            file.status = 'success'
            file.url = response.url || response.path

            if (onSuccess) {
                onSuccess(file, response)
            }
        } catch (error) {
            file.status = 'error'
            file.error = (error as Error).message

            if (onError) {
                onError(file, error as Error)
            }
        } finally {
            uploading.value = fileList.value.some(f => f.status === 'uploading')
        }
    }

    /**
     * 移除文件
     */
    const removeFile = (uid: string) => {
        const index = fileList.value.findIndex(f => f.uid === uid)
        if (index > -1) {
            fileList.value.splice(index, 1)
        }
    }

    /**
     * 清空文件列表
     */
    const clearFiles = () => {
        fileList.value = []
    }

    /**
     * 手动上传所有文件
     */
    const submitFiles = () => {
        if (!action) return

        fileList.value
            .filter(f => f.status === 'ready')
            .forEach(f => uploadFile(f))
    }

    /**
     * 获取成功上传的文件
     */
    const getSuccessFiles = () => {
        return fileList.value.filter(f => f.status === 'success')
    }

    return {
        fileList,
        uploading,
        addFiles,
        uploadFile,
        removeFile,
        clearFiles,
        submitFiles,
        getSuccessFiles
    }
}
