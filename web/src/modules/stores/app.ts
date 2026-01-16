/**
 * 应用全局状态管理
 * 管理主题、语言、侧边栏等全局 UI 状态
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'

// 主题类型
export type Theme = 'light' | 'dark'

// 语言类型
export type Language = 'zh-CN' | 'en-US'

export const useAppStore = defineStore('app', () => {
    // 状态
    const theme: Ref<Theme> = ref((localStorage.getItem('theme') as Theme) || 'light')
    const language: Ref<Language> = ref((localStorage.getItem('language') as Language) || 'zh-CN')
    const sidebarCollapsed: Ref<boolean> = ref(false)
    const loading: Ref<boolean> = ref(false)
    const loadingText: Ref<string> = ref('')

    // 计算属性
    const isDarkMode: ComputedRef<boolean> = computed(() => {
        return theme.value === 'dark'
    })

    // Actions
    const setTheme = (newTheme: Theme): void => {
        theme.value = newTheme
        localStorage.setItem('theme', newTheme)

        // 更新 HTML 的 class
        if (newTheme === 'dark') {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
    }

    const toggleTheme = (): void => {
        setTheme(isDarkMode.value ? 'light' : 'dark')
    }

    const setLanguage = (lang: Language): void => {
        language.value = lang
        localStorage.setItem('language', lang)
    }

    const toggleSidebar = (): void => {
        sidebarCollapsed.value = !sidebarCollapsed.value
    }

    const showLoading = (text: string = '加载中...'): void => {
        loading.value = true
        loadingText.value = text
    }

    const hideLoading = (): void => {
        loading.value = false
        loadingText.value = ''
    }

    // 初始化主题
    const initTheme = (): void => {
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
