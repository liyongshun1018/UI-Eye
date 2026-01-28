<template>
  <div id="app" class="app-container">
    <!-- 大观通栏导航栏 -->
    <nav class="navbar">
      <div class="navbar-container">
        <!-- Logo 区域 -->
        <router-link to="/" class="navbar-brand">
          <div class="logo-circle">
            <svg class="logo-svg" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <linearGradient id="logo-gradient" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#3b82f6" />
                <stop offset="100%" stop-color="#8b5cf6" />
              </linearGradient>
              <path 
                d="M20 8C12 8 5 14 2 20C5 26 12 32 20 32C28 32 35 26 38 20C35 14 28 8 20 8ZM20 28C15.58 28 12 24.42 12 20C12 15.58 15.58 12 20 12C24.42 12 28 15.58 28 20C28 24.42 24.42 28 20 28ZM20 16C17.79 16 16 17.79 16 20C16 22.21 17.79 24 20 24C22.21 24 24 22.21 24 20C24 17.79 22.21 16 20 16Z" 
                fill="url(#logo-gradient)"
              />
            </svg>
          </div>
          <span class="brand-text">UI-Eye</span>
          <span class="brand-version">Pro</span>
        </router-link>
        
        <!-- 导航菜单 -->
        <div class="nav-links">
          <router-link to="/" class="nav-item">
            <span class="nav-text">平台首页</span>
          </router-link>
          <router-link to="/compare" class="nav-item">
            <span class="nav-text">单次审计</span>
          </router-link>
          <router-link to="/batch-tasks" class="nav-item">
            <span class="nav-text">批量巡检</span>
          </router-link>
          <RouterLink to="/scripts" class="nav-item">
            <span class="nav-text">交互脚本</span>
          </RouterLink>
          <RouterLink to="/history" class="nav-item">
            <span class="nav-text">历史报告</span>
          </RouterLink>
        </div>

        <!-- 功能行动区 -->
        <div class="navbar-actions">
          <router-link to="/compare" class="btn-primary-sm">
            开始审计
          </router-link>
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

/* 导航栏 - Grand Full Width Style */
.navbar {
  position: sticky;
  top: 0;
  z-index: 1000;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  height: 64px;
}

.navbar-container {
  max-width: 1200px;
  margin: 0 auto;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
}

.navbar-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  transition: opacity 0.2s;
}

.logo-circle {
  width: 32px;
  height: 32px;
  filter: drop-shadow(0 2px 4px rgba(59, 130, 246, 0.15));
}

.brand-text {
  font-size: 1.2rem;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.02em;
}

.brand-version {
  font-size: 0.65rem;
  font-weight: 700;
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.08);
  padding: 2px 6px;
  border-radius: 4px;
  text-transform: uppercase;
}

.nav-links {
  display: flex;
  height: 100%;
  gap: 8px;
}

.nav-item {
  position: relative;
  display: flex;
  align-items: center;
  text-decoration: none;
  color: #64748b;
  font-size: 0.9rem;
  font-weight: 550;
  padding: 0 16px;
  height: 100%;
  transition: all 0.2s;
}

.nav-item::after {
  content: '';
  position: absolute;
  bottom: 0px;
  left: 50%;
  width: 0;
  height: 2px;
  background: var(--accent-primary);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  transform: translateX(-50%);
}

.nav-item:hover {
  color: #0f172a;
}

.nav-item.router-link-active {
  color: var(--accent-primary);
}

.nav-item.router-link-active::after {
  width: 100%;
}

.navbar-actions {
  display: flex;
  align-items: center;
}

.btn-primary-sm {
  text-decoration: none;
  background: #0f172a;
  color: white;
  font-size: 0.825rem;
  font-weight: 600;
  padding: 8px 18px;
  border-radius: 8px;
  transition: all 0.2s;
}

.btn-primary-sm:hover {
  background: #1e293b;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* 主内容区域 */
.main-content {
  flex: 1;
}

/* 响应式 */
@media (max-width: 1024px) {
  .navbar-container { padding: 0 20px; }
  .brand-version, .nav-item .nav-text { display: none; }
  .nav-item { padding: 0 10px; }
}
</style>
