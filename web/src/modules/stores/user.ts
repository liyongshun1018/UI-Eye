/**
 * 用户状态管理
 * 管理用户信息、登录状态、权限等
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'

// 用户信息接口
export interface UserInfo {
    id: number
    name: string
    email: string
    avatar?: string
    [key: string]: any
}

// 登录凭证接口
export interface LoginCredentials {
    username?: string
    email?: string
    password: string
    [key: string]: any
}

export const useUserStore = defineStore('user', () => {
    // 状态
    const userInfo: Ref<UserInfo | null> = ref(null)
    const token: Ref<string> = ref(localStorage.getItem('token') || '')
    const permissions: Ref<string[]> = ref([])

    // 计算属性
    const isLoggedIn: ComputedRef<boolean> = computed(() => {
        return !!token.value && !!userInfo.value
    })

    const userName: ComputedRef<string> = computed(() => {
        return userInfo.value?.name || '游客'
    })

    const userAvatar: ComputedRef<string> = computed(() => {
        return userInfo.value?.avatar || ''
    })

    const hasPermission = (permission: string): boolean => {
        return permissions.value.includes(permission)
    }

    // Actions
    const setToken = (newToken: string): void => {
        token.value = newToken
        if (newToken) {
            localStorage.setItem('token', newToken)
        } else {
            localStorage.removeItem('token')
        }
    }

    const setUserInfo = (info: UserInfo | null): void => {
        userInfo.value = info
    }

    const setPermissions = (perms: string[]): void => {
        permissions.value = perms
    }

    const login = async (credentials: LoginCredentials): Promise<boolean> => {
        try {
            // TODO: 调用登录 API
            // const response = await loginAPI(credentials)
            // setToken(response.token)
            // setUserInfo(response.userInfo)
            // setPermissions(response.permissions)

            // 临时模拟
            setToken('mock-token')
            setUserInfo({
                id: 1,
                name: '管理员',
                email: 'admin@example.com',
                avatar: ''
            })
            setPermissions(['admin'])

            return true
        } catch (error) {
            console.error('登录失败:', error)
            throw error
        }
    }

    const logout = (): void => {
        setToken('')
        setUserInfo(null)
        setPermissions([])
    }

    const updateUserInfo = (updates: Partial<UserInfo>): void => {
        if (userInfo.value) {
            userInfo.value = { ...userInfo.value, ...updates }
        }
    }

    return {
        // 状态
        userInfo,
        token,
        permissions,

        // 计算属性
        isLoggedIn,
        userName,
        userAvatar,

        // Actions
        setToken,
        setUserInfo,
        setPermissions,
        login,
        logout,
        updateUserInfo,
        hasPermission
    }
})
