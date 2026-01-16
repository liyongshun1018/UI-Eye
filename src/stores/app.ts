/**
 * 应用全局状态管理
 * 管理主题、语言、侧边栏等全局 UI 状态
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAppStore = defineStore('app', () => {
    // 状态
    const theme = ref(localStorage.getItem('theme') || 'light')
    const language = ref(localStorage.getItem('language') || 'zh-CN')
    const sidebarCollapsed = ref(false)
    const loading = ref(false)
    const loadingText = ref('')

    // 计算属性
    const isDarkMode = computed(() => {
        return theme.value === 'dark'
    })

    // Actions
    const setTheme = (newTheme) => {
        theme.value = newTheme
        localStorage.setItem('theme', newTheme)

        // 更新 HTML 的 class
        if (newTheme === 'dark') {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
    }

    const toggleTheme = () => {
        setTheme(isDarkMode.value ? 'light' : 'dark')
    }

    const setLanguage = (lang) => {
        language.value = lang
        localStorage.setItem('language', lang)
    }

    const toggleSidebar = () => {
        sidebarCollapsed.value = !sidebarCollapsed.value
    }

    const showLoading = (text = '加载中...') => {
        loading.value = true
        loadingText.value = text
    }

    const hideLoading = () => {
        loading.value = false
        loadingText.value = ''
    }

    // 初始化主题
    const initTheme = () => {
        if (theme.value === 'dark') {
            document.documentElement.classList.add('dark')
        }
    }

    return {
        // 状态
        theme,
        language,
        sidebarCollapsed,
        loading,
        loadingText,

        // 计算属性
        isDarkMode,

        // Actions
        setTheme,
        toggleTheme,
        setLanguage,
        toggleSidebar,
        showLoading,
        hideLoading,
        initTheme
    }
})
