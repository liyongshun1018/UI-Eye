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
            <router-link to="/" class="nav-item">首页</router-link>
            <router-link to="/compare" class="nav-item">开始对比</router-link>
            <router-link to="/history" class="nav-item">对比记录</router-link>
          </div>
        </div>
      </div>
    </nav>

    <!-- 主内容区域 -->
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
// App 根组件
</script>

<style scoped>
.app-container {
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* 导航栏 */
.navbar {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border-color);
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
  color: var(--text-primary);
  transition: all var(--transition-base);
}

.navbar-brand:hover {
  transform: scale(1.05);
}

.brand-icon {
  font-size: 1.5rem;
}

.brand-text {
  background: var(--accent-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
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
  color: var(--text-secondary);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  padding: var(--spacing-xs) var(--spacing-sm);
  transition: all var(--transition-base);
}

.nav-item:hover {
  color: var(--accent-primary);
}

.nav-item.router-link-active {
  color: var(--accent-primary);
}

.nav-item.router-link-active::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--accent-gradient);
  border-radius: var(--radius-full);
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
