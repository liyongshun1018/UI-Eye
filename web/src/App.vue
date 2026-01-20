<template>
  <div id="app" class="app-container">
    <!-- 导航栏 -->
    <nav class="navbar">
      <div class="navbar-container">
        <router-link to="/" class="navbar-brand">
          <span class="brand-icon">👁️</span>
          <span class="brand-text">UI-Eye</span>
        </router-link>
        
        <div class="navbar-menu">
          <div class="nav-links">
            <router-link to="/" class="nav-item">🏠 首页</router-link>
            <router-link to="/compare" class="nav-item">🚀 开始对比</router-link>
            <router-link to="/batch-tasks" class="nav-item">📦 批量任务</router-link>
            <RouterLink to="/scripts" class="nav-item">📜 交互脚本</RouterLink>
            <RouterLink to="/history" class="nav-item">📊 对比历史</RouterLink>
          </div>
        </div>
      </div>
    </nav>

    <!-- 主内容区域 -->
    <main class="main-content">
      <router-view />
    </main>

    <!-- 全局对话框容器 -->
    <DialogContainer />
  </div>
</template>

<script setup>
import DialogContainer from './ui/components/common/DialogContainer.vue'

/**
 * App.vue - 应用根组件
 * 承载全局导航栏和路由视图入口。
 * 提供响应式的布局基础，包括置顶导航和自适应主内容区。
 */
</script>

<style scoped>
.app-container {
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* 导航栏 - 添加渐变背景 */
.navbar {
  position: sticky;
  top: 0;
  z-index: 100;
  background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%);
  box-shadow: 0 4px 12px rgba(14, 165, 233, 0.2);
}

.navbar-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 var(--spacing-md);
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
}

.navbar-brand {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  text-decoration: none;
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: white;
  transition: all var(--transition-base);
}

.navbar-brand:hover {
  transform: scale(1.05);
  opacity: 0.9;
}

.brand-icon {
  font-size: 1.5rem;
}

.brand-text {
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.navbar-menu {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
}

.nav-links {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
}

.nav-item {
  position: relative;
  text-decoration: none;
  color: rgba(255, 255, 255, 0.9);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  padding: var(--spacing-xs) var(--spacing-sm);
  transition: all var(--transition-base);
}

.nav-item:hover {
  color: white;
  transform: translateY(-1px);
}

.nav-item.router-link-active {
  color: white;
  font-weight: var(--font-weight-semibold);
}

.nav-item.router-link-active::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 0;
  right: 0;
  height: 3px;
  background: white;
  border-radius: var(--radius-full);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

/* 主内容区域 */
.main-content {
  flex: 1;
}

/* 响应式 */
@media (max-width: 768px) {
  .navbar-container {
    padding: 0 var(--spacing-sm);
  }

  .navbar-menu {
    gap: var(--spacing-md);
  }

  .nav-links {
    gap: var(--spacing-sm);
  }

  .nav-item {
    font-size: var(--font-size-sm);
    padding: var(--spacing-xs);
  }

  .brand-text {
    display: none;
  }
}
</style>
