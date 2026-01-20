<template>
  <div class="home-page">
    <!-- 单屏布局 -->
    <section class="hero-section">
      <div class="container-wide">
        <!-- Hero 内容 -->
        <div class="hero-content fade-in">
          <h1 class="hero-title">
            <span class="brand-label">UI-EYE</span>
            <br />
            AI 驱动的视觉走查机器人
          </h1>
          <p class="hero-subtitle">
            像素级对比设计稿与实际页面，自动生成 CSS 修复建议。
            <br />
            节省 80% UI 审核时间，让还原度有据可依。
          </p>
        </div>

        <!-- 功能卡片网格 -->
        <div class="features-grid">
          <div class="feature-card card glass-hover fade-in" style="animation-delay: 0.1s">
            <div class="feature-icon">📸</div>
            <h3 class="feature-title">自动截图</h3>
            <p class="feature-desc">
              支持全页滚动截图，智能等待资源加载，模拟多种设备视口
            </p>
          </div>

          <div class="feature-card card glass-hover fade-in" style="animation-delay: 0.2s">
            <div class="feature-icon">🔍</div>
            <h3 class="feature-title">像素级对比</h3>
            <p class="feature-desc">
              逐像素对比设计稿与实际页面，生成差异图，计算还原度分数
            </p>
          </div>

          <div class="feature-card card glass-hover fade-in" style="animation-delay: 0.3s">
            <div class="feature-icon">🤖</div>
            <h3 class="feature-title">AI 智能分析</h3>
            <p class="feature-desc">
              GPT-4 Vision 智能识别差异并生成具体修复建议，提高修复 CSS 代码
            </p>
          </div>

          <div class="feature-card card glass-hover fade-in" style="animation-delay: 0.4s">
            <div class="feature-icon">🎨</div>
            <h3 class="feature-title">双模式对比</h3>
            <p class="feature-desc">
              支持效果图上传和远程图片 URL 两种模式，灵活适配不同工作流
            </p>
          </div>

          <div class="feature-card card glass-hover fade-in" style="animation-delay: 0.5s">
            <div class="feature-icon">📊</div>
            <h3 class="feature-title">可视化报告</h3>
            <p class="feature-desc">
              交互式对比报告，滑动查看差异，一键复制 CSS 修复代码
            </p>
          </div>

          <div class="feature-card card glass-hover fade-in" style="animation-delay: 0.6s">
            <div class="feature-icon">⚡</div>
            <h3 class="feature-title">高效快速</h3>
            <p class="feature-desc">
              完整流程 &lt; 30 秒，自动化替代人工走查，大幅提升交付效率
            </p>
          </div>
        </div>

        <!-- CTA 按钮 -->
        <div class="hero-actions">
          <router-link to="/compare" class="btn btn-primary btn-large">
            立即开始
            <span class="icon">→</span>
          </router-link>
          <a href="#features" class="btn btn-secondary btn-large">
            了解更多
          </a>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
/**
 * UI-EYE 首页组件
 * 
 * @description 展示项目核心功能亮点，提供各个功能模块的便捷入口。
 * 采用了极简主义的 Hero 设计风格，配合卡片网格布局，展示 AI 驱动的视觉走查能力。
 */
</script>

<style scoped>
.home-page {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Hero Section - 单屏布局 */
.hero-section {
  width: 100%;
  min-height: calc(100vh - 64px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-lg) 0;
  background: radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.08) 0%, transparent 50%);
}

.container-wide {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--spacing-lg);
}

/* Hero 内容 - 紧凑布局 */
.hero-content {
  text-align: center;
  margin-bottom: var(--spacing-md);
}

.brand-label {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: var(--font-weight-semibold);
  color: var(--accent-primary);
  letter-spacing: 2px;
  margin-bottom: 0.25rem;
}

.hero-title {
  font-size: 2rem;
  font-weight: var(--font-weight-bold);
  line-height: 1.2;
  margin-bottom: var(--spacing-sm);
  color: var(--text-primary);
}

.hero-subtitle {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-bottom: var(--spacing-md);
  line-height: 1.5;
  max-width: 700px;
  margin-left: auto;
  margin-right: auto;
}

/* 功能卡片网格 - 2x3 布局 */
.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}

.feature-card {
  text-align: center;
  padding: var(--spacing-md);
  transition: all var(--transition-base);
}

.feature-card:hover {
  transform: translateY(-2px);
}

.feature-icon {
  font-size: 2rem;
  margin-bottom: var(--spacing-xs);
}

.feature-title {
  font-size: 1rem;
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--spacing-xs);
  color: var(--text-primary);
}

.feature-desc {
  font-size: 0.85rem;
  color: var(--text-secondary);
  line-height: 1.4;
}

/* CTA 按钮 */
.hero-actions {
  display: flex;
  gap: var(--spacing-sm);
  justify-content: center;
  flex-wrap: wrap;
  margin-top: var(--spacing-xs);
}

.btn-large {
  padding: 0.5rem 1.25rem;
  font-size: 0.9rem;
}

.icon {
  display: inline-block;
  transition: transform var(--transition-base);
  margin-left: var(--spacing-xs);
}

.btn:hover .icon {
  transform: translateX(4px);
}

/* 响应式布局 */
@media (max-width: 1024px) {
  .features-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 2rem;
  }

  .features-grid {
    grid-template-columns: 1fr;
    gap: var(--spacing-sm);
  }

  .feature-card {
    padding: var(--spacing-md);
  }

  .feature-icon {
    font-size: 2rem;
  }

  .hero-section {
    min-height: auto;
    padding: var(--spacing-lg) 0;
  }
}

/* 动画 */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-in {
  animation: fadeIn 0.6s ease-out forwards;
  opacity: 0;
}
</style>
