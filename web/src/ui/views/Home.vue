<template>
  <div class="home-page">
    <!-- 背景装饰物 -->
    <div class="bg-ornaments">
      <div class="orb orb-1"></div>
      <div class="orb orb-2"></div>
      <div class="orb orb-3"></div>
      <div class="mesh-grid"></div>
    </div>

    <!-- 单屏布局 -->
    <section class="hero-section">
      <div class="container">
        <!-- Hero 内容 -->
        <div class="hero-content">
          <div class="brand-badge-wrapper animate-in" style="--delay: 0.1s">
            <span class="brand-label">AI Visual Auditor</span>
          </div>
          <h1 class="hero-title animate-in" style="--delay: 0.2s">
            从“肉眼校对”到 <span class="text-gradient">AI 视觉审计</span>
          </h1>
          <p class="hero-subtitle animate-in" style="--delay: 0.3s">
            UI-Eye 结合多模态大模型 (MLLM)，为您精准捕捉每一像素的偏离。
            <br />
            自动产出修复方案，重塑前端还原度的最高标准。
          </p>
          
          <!-- CTA 按钮 -->
          <div class="hero-actions animate-in" style="--delay: 0.4s">
            <router-link to="/compare" class="btn btn-primary btn-large btn-glow">
              开启智能走查
              <span class="icon">→</span>
            </router-link>
            <router-link to="/intro" class="btn btn-secondary btn-large">
              探索核心能力
            </router-link>
          </div>
        </div>

        <!-- 功能卡片网格 -->
        <div class="features-grid">
          <div 
            v-for="(feature, index) in features" 
            :key="index"
            class="feature-card animate-in" 
            :style="{ '--delay': (0.5 + index * 0.1) + 's' }"
          >
            <div class="feature-card-header">
              <div class="feature-icon-wrapper">
                <span class="feature-icon">{{ feature.icon }}</span>
              </div>
              <h3 class="feature-title">{{ feature.title }}</h3>
            </div>
            <p class="feature-desc">{{ feature.desc }}</p>
            <div class="card-glow"></div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
const features = [
  { icon: '📸', title: '全域智能采集', desc: '模拟真实渲染环境，支持长页面滚动截图，告别手动拼接素材。' },
  { icon: '🔍', title: '高精度差异识别', desc: '像素级重叠对比，毫秒间识别微小位移与色值偏差，结果精准无误。' },
  { icon: '🤖', title: 'AIGC 修复引擎', desc: '深度理解 UI 差异，一键产出生产级 CSS 修复建议，极大缩短修改链路。' },
  { icon: '🎨', title: '全场景灵活适配', desc: '支持本地设计稿与远程 URL 多模式并行，无缝融入团队既有工作流。' },
  { icon: '📊', title: '极度沉浸报告', desc: '沉浸式交互分析，可视化热力图展示差异点，让走查过程成为一种享受。' },
  { icon: '⚡', title: '生产力阶越', desc: '完整环节从 30 分钟缩减至 30 秒，自动化替代人肉复核，释放研发潜能。' }
]
</script>

<style scoped>
.home-page {
  width: 100%;
  position: relative;
  overflow: hidden;
}

/* 背景装饰 */
.bg-ornaments {
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
}

.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.4;
  animation: float 20s infinite alternate ease-in-out;
}

.orb-1 {
  width: 400px; height: 400px;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%);
  top: -100px; left: -100px;
}

.orb-2 {
  width: 300px; height: 300px;
  background: radial-gradient(circle, rgba(168, 85, 247, 0.2) 0%, transparent 70%);
  bottom: 0px; right: 10%;
  animation-delay: -5s;
}

.orb-3 {
  width: 250px; height: 250px;
  background: radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%);
  top: 20%; right: -50px;
  animation-delay: -10s;
}

.mesh-grid {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(var(--border-color) 1px, transparent 1px);
  background-size: 40px 40px;
  mask-image: linear-gradient(to bottom, transparent, black 10%, black 90%, transparent);
  opacity: 0.2;
}

@keyframes float {
  0% { transform: translate(0, 0) scale(1); }
  100% { transform: translate(40px, 60px) scale(1.1); }
}

/* Hero Section */
.hero-section {
  width: 100%;
  min-height: calc(100vh - 64px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6rem 0;
}

.hero-content {
  text-align: center;
  margin-bottom: 5rem;
  max-width: 900px;
  margin-left: auto;
  margin-right: auto;
}

.brand-badge-wrapper {
  margin-bottom: 1.5rem;
}

.brand-label {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 800;
  color: var(--accent-primary);
  letter-spacing: 0.2em;
  text-transform: uppercase;
  background: white;
  padding: 6px 16px;
  border-radius: 20px;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
  border: 1px solid rgba(59, 130, 246, 0.1);
}

.hero-title {
  font-size: 4rem;
  font-weight: 900;
  line-height: 1.2;
  margin-bottom: 2rem;
  color: #0f172a;
  letter-spacing: -0.04em;
}

.text-gradient {
  background: linear-gradient(to right, #3b82f6, #8b5cf6, #2dd4bf);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-subtitle {
  font-size: 1.25rem;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 3rem;
  max-width: 650px;
  margin-left: auto;
  margin-right: auto;
}

/* 功能卡片网格 */
.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
  margin-bottom: 4rem;
}

.feature-card {
  position: relative;
  padding: 2.5rem 2rem;
  background: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 24px;
  transition: all 0.4s var(--ease-spring);
  overflow: hidden;
}

.feature-card:hover {
  transform: translateY(-8px) scale(1.02);
  background: rgba(255, 255, 255, 0.8);
  border-color: var(--accent-primary);
}

.feature-card-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 1.25rem;
}

.feature-icon-wrapper {
  width: 48px;
  height: 48px;
  background: white;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition: transform 0.3s ease;
}

.feature-card:hover .feature-icon-wrapper {
  transform: scale(1.1) rotate(5deg);
}

.feature-title {
  font-size: 1.25rem;
  font-weight: 800;
  color: #1e293b;
  margin: 0;
}

.feature-desc {
  font-size: 0.95rem;
  color: var(--text-secondary);
  line-height: 1.6;
}

.card-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, var(--accent-primary) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.3s;
  pointer-events: none;
  mix-blend-mode: soft-light;
}

.feature-card:hover .card-glow {
  opacity: 0.1;
}

/* CTA 按钮增强 */
.hero-actions {
  display: flex;
  gap: 1.5rem;
  justify-content: center;
}

.btn-glow {
  box-shadow: 0 8px 20px rgba(59, 130, 246, 0.3);
}

.btn-glow:hover {
  box-shadow: 0 12px 28px rgba(59, 130, 246, 0.5);
}

/* 动画系统 */
.animate-in {
  opacity: 0;
  transform: translateY(30px);
  animation: slideUpFade 0.8s forwards cubic-bezier(0.16, 1, 0.3, 1);
  animation-delay: var(--delay);
}

@keyframes slideUpFade {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 响应式 */
@media (max-width: 1100px) {
  .features-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 768px) {
  .hero-title { font-size: 2.75rem; }
  .features-grid { grid-template-columns: 1fr; }
  .hero-section { padding: 4rem 1.5rem; }
  .hero-actions { flex-direction: column; width: 100%; }
  .btn-large { width: 100%; }
}
</style>
