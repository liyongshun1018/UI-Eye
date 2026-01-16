# Pinia 状态管理使用指南

本文档介绍如何使用 Pinia 进行状态管理。

---

## 📁 Store 结构

```
src/stores/
├── batch.js       # 批量任务状态
├── user.js        # 用户状态
├── app.js         # 应用全局状态
└── index.js       # 统一导出
```

---

## 🎯 使用方法

### 1. 批量任务 Store (batch.js)

#### 在组件中使用

```vue
<script setup>
import { useBatchStore } from '@/stores'
import { onMounted } from 'vue'

const batchStore = useBatchStore()

// 获取任务列表
onMounted(async () => {
  await batchStore.fetchTasks()
  await batchStore.fetchStats()
})

// 创建新任务
const handleCreateTask = async () => {
  try {
    await batchStore.createTask({
      name: '批量任务',
      urls: ['https://example.com']
    })
    console.log('任务创建成功')
  } catch (error) {
    console.error('创建失败:', error)
  }
}

// 删除任务
const handleDelete = async (id) => {
  await batchStore.deleteTask(id)
}
</script>

<template>
  <div>
    <!-- 显示加载状态 -->
    <div v-if="batchStore.loading">加载中...</div>
    
    <!-- 显示统计信息 -->
    <div>
      <p>总任务数：{{ batchStore.stats.total }}</p>
      <p>运行中：{{ batchStore.stats.running }}</p>
      <p>已完成：{{ batchStore.stats.completed }}</p>
    </div>
    
    <!-- 显示任务列表 -->
    <div v-for="task in batchStore.tasks" :key="task.id">
      <h3>{{ task.name }}</h3>
      <p>状态：{{ task.status }}</p>
      <button @click="handleDelete(task.id)">删除</button>
    </div>
    
    <!-- 使用计算属性 -->
    <div v-if="batchStore.hasRunningTasks">
      有 {{ batchStore.runningTasks.length }} 个任务正在运行
    </div>
  </div>
</template>
```

#### WebSocket 更新状态

```javascript
// 在 WebSocket 消息处理中
import { useBatchStore } from '@/stores'

const batchStore = useBatchStore()

socket.on('task:progress', (data) => {
  batchStore.updateTaskProgress(data.taskId, {
    success: data.success,
    failed: data.failed,
    total: data.total
  })
})

socket.on('task:status', (data) => {
  batchStore.updateTaskStatus(data.taskId, data.status)
})
```

---

### 2. 用户 Store (user.js)

```vue
<script setup>
import { useUserStore } from '@/stores'

const userStore = useUserStore()

// 登录
const handleLogin = async () => {
  try {
    await userStore.login({
      username: 'admin',
      password: '123456'
    })
    console.log('登录成功')
  } catch (error) {
    console.error('登录失败:', error)
  }
}

// 登出
const handleLogout = () => {
  userStore.logout()
}

// 检查权限
const canDelete = userStore.hasPermission('delete')
</script>

<template>
  <div>
    <!-- 显示用户信息 -->
    <div v-if="userStore.isLoggedIn">
      <p>欢迎，{{ userStore.userName }}</p>
      <button @click="handleLogout">退出登录</button>
    </div>
    <div v-else>
      <button @click="handleLogin">登录</button>
    </div>
    
    <!-- 权限控制 -->
    <button v-if="userStore.hasPermission('admin')">
      管理员功能
    </button>
  </div>
</template>
```

---

### 3. 应用 Store (app.js)

```vue
<script setup>
import { useAppStore } from '@/stores'
import { onMounted } from 'vue'

const appStore = useAppStore()

// 初始化主题
onMounted(() => {
  appStore.initTheme()
})

// 切换主题
const toggleTheme = () => {
  appStore.toggleTheme()
}

// 显示全局 Loading
const handleSubmit = async () => {
  appStore.showLoading('提交中...')
  try {
    await submitData()
  } finally {
    appStore.hideLoading()
  }
}
</script>

<template>
  <div :class="{ 'dark': appStore.isDarkMode }">
    <button @click="toggleTheme">
      {{ appStore.isDarkMode ? '☀️ 浅色' : '🌙 深色' }}
    </button>
    
    <!-- 全局 Loading -->
    <div v-if="appStore.loading" class="global-loading">
      {{ appStore.loadingText }}
    </div>
  </div>
</template>
```

---

## 🔄 迁移指南

### 从组件内部状态迁移到 Store

**之前（组件内部状态）：**
```vue
<script setup>
import { ref, onMounted } from 'vue'
import batchTaskService from '@/services/batchTaskService'

const tasks = ref([])
const loading = ref(false)

const fetchTasks = async () => {
  loading.value = true
  try {
    const response = await batchTaskService.getTasks()
    tasks.value = response.tasks
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchTasks()
})
</script>
```

**现在（使用 Store）：**
```vue
<script setup>
import { useBatchStore } from '@/stores'
import { onMounted } from 'vue'

const batchStore = useBatchStore()

onMounted(() => {
  batchStore.fetchTasks()
})
</script>

<template>
  <div v-if="batchStore.loading">加载中...</div>
  <div v-for="task in batchStore.tasks" :key="task.id">
    {{ task.name }}
  </div>
</template>
```

---

## 📋 待迁移组件

### 高优先级
- [ ] `BatchTaskList.vue` - 使用 batch store
- [ ] `BatchTaskMonitor.vue` - 使用 batch store
- [ ] `BatchScreenshot.vue` - 使用 batch store

### 中优先级
- [ ] `App.vue` - 使用 app store（主题切换）
- [ ] 所有需要访问批量任务数据的组件

---

## 🎯 最佳实践

### 1. Store 的选择

```javascript
// ✅ 推荐：全局共享的状态放在 Store
const batchStore = useBatchStore()
const tasks = batchStore.tasks

// ❌ 不推荐：组件私有的状态不要放在 Store
const localSearchKeyword = ref('')  // 这个应该留在组件内
```

### 2. 计算属性的使用

```javascript
// ✅ 推荐：使用 Store 的计算属性
const runningTasks = batchStore.runningTasks

// ❌ 不推荐：在组件中重复计算
const runningTasks = computed(() => {
  return batchStore.tasks.filter(t => t.status === 'running')
})
```

### 3. 异步操作

```javascript
// ✅ 推荐：使用 async/await
const handleCreate = async () => {
  try {
    await batchStore.createTask(taskData)
    // 成功处理
  } catch (error) {
    // 错误处理
  }
}

// ❌ 不推荐：不处理错误
const handleCreate = () => {
  batchStore.createTask(taskData)  // 没有错误处理
}
```

### 4. 多个 Store 组合使用

```javascript
import { useBatchStore, useUserStore, useAppStore } from '@/stores'

const batchStore = useBatchStore()
const userStore = useUserStore()
const appStore = useAppStore()

// 可以在一个组件中使用多个 Store
```

---

## 🔧 高级用法

### 1. Store 之间的通信

```javascript
// 在 batch store 中访问 user store
import { useUserStore } from './user'

export const useBatchStore = defineStore('batch', () => {
  const createTask = async (taskData) => {
    const userStore = useUserStore()
    
    // 添加用户信息
    const data = {
      ...taskData,
      userId: userStore.userInfo?.id
    }
    
    // 创建任务...
  }
  
  return { createTask }
})
```

### 2. 持久化状态

```javascript
// 在 store 中保存到 localStorage
export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '')
  
  const setToken = (newToken) => {
    token.value = newToken
    localStorage.setItem('token', newToken)
  }
  
  return { token, setToken }
})
```

### 3. 重置 Store

```javascript
const batchStore = useBatchStore()

// 重置所有状态
batchStore.reset()
```

---

## 📊 预期收益

使用 Pinia 后：
- ✅ 组件间通信简化 70%+
- ✅ 代码重复减少 40%+
- ✅ 状态管理更清晰
- ✅ 调试更容易（Vue DevTools 支持）

---

**下一步：** 开始逐步迁移组件，使用 Pinia 管理状态！
