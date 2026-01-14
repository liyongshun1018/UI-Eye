import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import Home from '@/views/Home.vue'
import Compare from '@/views/Compare.vue'
import Report from '@/views/Report.vue'

const routes: RouteRecordRaw[] = [
    {
        path: '/',
        name: 'Home',
        component: Home,
        meta: { title: 'UI-Eye - 首页' }
    },
    {
        path: '/compare',
        name: 'Compare',
        component: Compare,
        meta: { title: 'UI-Eye - 开始对比' }
    },
    {
        path: '/report/:id',
        name: 'Report',
        component: Report,
        meta: { title: 'UI-Eye - 对比报告' }
    },
    {
        path: '/history',
        name: 'history',
        component: () => import('../views/History.vue')
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

// 路由守卫 - 更新页面标题
router.beforeEach((to, from, next) => {
    document.title = (to.meta.title as string) || 'UI-Eye'
    next()
})

export default router
