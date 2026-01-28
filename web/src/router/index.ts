import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import Home from '@/ui/views/Home.vue'
import Compare from '@/ui/views/Compare.vue'
import Report from '@/ui/views/Report.vue'

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
        component: () => import('../ui/views/History.vue')
    },
    {
        path: '/batch-tasks',
        name: 'BatchTaskList',
        component: () => import('../ui/views/BatchTaskList.vue'),
        meta: { title: 'UI-Eye - 批量任务列表' }
    },
    {
        path: '/batch-screenshot',
        name: 'BatchScreenshot',
        component: () => import('../ui/views/BatchScreenshot.vue'),
        meta: { title: 'UI-Eye - 创建批量任务' }
    },
    {
        path: '/batch-tasks/:id',
        name: 'BatchTaskMonitor',
        component: () => import('../ui/views/BatchTaskMonitor.vue'),
        meta: { title: 'UI-Eye - 任务监控' }
    },
    {
        path: '/batch-tasks/:id/detail',
        name: 'BatchTaskDetail',
        component: () => import('../ui/views/BatchTaskDetail.vue'),
        meta: { title: 'UI-Eye - 批量对比报告' }
    },
    {
        path: '/scripts',
        name: 'ScriptList',
        component: () => import('../ui/views/ScriptList.vue'),
        meta: { title: 'UI-Eye - 脚本管理' }
    },
    {
        path: '/scripts/:id',
        name: 'ScriptEditor',
        component: () => import('../ui/views/ScriptEditor.vue'),
        meta: { title: 'UI-Eye - 脚本编辑' }
    },
    {
        path: '/intro',
        name: 'Intro',
        component: () => import('../ui/views/Intro.vue'),
        meta: { title: 'UI-Eye - 项目介绍' }
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
