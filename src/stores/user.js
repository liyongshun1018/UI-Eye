/**
 * 用户状态管理
 * 管理用户信息、登录状态、权限等
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUserStore = defineStore('user', () => {
    // 状态
    const userInfo = ref(null)
    const token = ref(localStorage.getItem('token') || '')
    const permissions = ref([])

    // 计算属性
    const isLoggedIn = computed(() => {
        return !!token.value && !!userInfo.value
    })

    const userName = computed(() => {
        return userInfo.value?.name || '游客'
    })

    const userAvatar = computed(() => {
        return userInfo.value?.avatar || ''
    })

    const hasPermission = (permission) => {
        return permissions.value.includes(permission)
    }

    // Actions
    const setToken = (newToken) => {
        token.value = newToken
        if (newToken) {
            localStorage.setItem('token', newToken)
        } else {
            localStorage.removeItem('token')
        }
    }

    const setUserInfo = (info) => {
        userInfo.value = info
    }

    const setPermissions = (perms) => {
        permissions.value = perms
    }

    const login = async (credentials) => {
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

    const logout = () => {
        setToken('')
        setUserInfo(null)
        setPermissions([])
    }

    const updateUserInfo = (updates) => {
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
