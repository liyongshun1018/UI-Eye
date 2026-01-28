<template>
  <div class="intro-page">
    <!-- 背景装饰 (延续 Home 风格) -->
    <div class="bg-ornaments">
      <div class="orb orb-1"></div>
      <div class="orb orb-2"></div>
      <div class="mesh-grid"></div>
    </div>

    <div class="container">
      <!-- Hero 区域 -->
      <section class="intro-hero animate-in">
        <div class="brand-badge-wrapper">
          <span class="brand-label">Technical Manifesto</span>
        </div>
        <h1 class="intro-title">洞察像素背后的<span class="text-gradient">智慧</span></h1>
        <p class="intro-subtitle">
          UI-Eye 不仅仅是一个对比工具，它是链接设计稿与生产环境的智能桥梁。
          通过自研采集引擎与多模态大模型的深度融合，让 UI 走查从劳动密集型转向真正的自动化审计。
        </p>
      </section>

      <!-- 核心架构分区 -->
      <section class="section-container animate-in" style="--delay: 0.2s">
        <div class="section-header">
          <h2 class="section-title">全域架构 · 逻辑底座</h2>
          <div class="section-divider"></div>
        </div>
        
        <div class="visual-fusion-stage side-layout">
          <div class="stage-content">
            <div class="stack-list">
              <div class="stack-card">
                <div class="stack-index">01</div>
                <h3 class="stack-name">智能采集层</h3>
                <p class="stack-desc">无头浏览器集群，真实模拟浏览器渲染，全量捕获视觉特征。</p>
              </div>
              
              <div class="stack-card active">
                <div class="stack-index">02</div>
                <h3 class="stack-name">AI 审计引擎</h3>
                <p class="stack-desc">MLLM 语义级分析，毫秒识别 UI 偏差，智能产出修复代码。</p>
              </div>

              <div class="stack-card">
                <div class="stack-index">03</div>
                <h3 class="stack-name">可视化分发</h3>
                <p class="stack-desc">交互式报告，Webhook 自动化集成，打通研发全链路。</p>
              </div>
            </div>
          </div>

          <div class="stage-visual">
            <div class="arch-visual">
              <img src="../assets/architecture.png" alt="UI-Eye Architecture" class="arch-img" />
            </div>
          </div>
        </div>
      </section>

      <!-- 使用说明书 -->
      <section class="section-container animate-in" style="--delay: 0.4s">
        <div class="section-header">
          <h2 class="section-title">交互指南 · 场景赋能</h2>
          <div class="section-divider"></div>
        </div>

        <div class="visual-fusion-stage side-layout reverse">
          <div class="stage-content">
            <div class="guide-list">
              <div class="guide-item">
                <div class="guide-num">Step 1</div>
                <div class="guide-content">
                  <h4>单次对比</h4>
                  <p>上传设计稿即刻审计。 <span class="scene-tag-lite">场景：返工验证</span></p>
                </div>
              </div>

              <div class="guide-item">
                <div class="guide-num">Step 2</div>
                <div class="guide-content">
                  <h4>批量任务</h4>
                  <p>全量 UI 自动化巡检。 <span class="scene-tag-lite">场景：发布巡检</span></p>
                </div>
              </div>

              <div class="guide-item">
                <div class="guide-num">Step 3</div>
                <div class="guide-content">
                  <h4>交互脚本</h4>
                  <p>模拟用户路径深探。 <span class="scene-tag-lite">场景：复杂业务</span></p>
                </div>
              </div>

              <div class="guide-item">
                <div class="guide-num">Step 4</div>
                <div class="guide-content">
                  <h4>浏览器插件</h4>
                  <p>任意页面即时捕获。 <span class="scene-tag-lite">场景：Bug 捕获</span></p>
                </div>
              </div>
            </div>
          </div>

          <div class="stage-visual">
            <div class="workflow-visual">
              <img src="../assets/workflow.png" alt="UI-Eye Workflow" class="workflow-img" />
            </div>
          </div>
        </div>
      </section>

      <!-- 底部链接 -->
      <footer class="intro-footer animate-in" style="--delay: 0.6s">
        <router-link to="/compare" class="btn btn-primary btn-large btn-glow">
          开启您的第一次审计
        </router-link>
        <router-link to="/" class="btn btn-secondary btn-large">
          回首页
        </router-link>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.intro-page {
  padding: 6rem 0;
  position: relative;
  overflow: hidden;
  min-height: 100vh;
}

/* 装饰背景 (同 Home) */
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
  opacity: 0.3;
}
.orb-1 { width: 500px; height: 500px; background: rgba(59, 130, 246, 0.2); top: -200px; right: -100px; }
.orb-2 { width: 400px; height: 400px; background: rgba(139, 92, 246, 0.15); bottom: -100px; left: -100px; }
.mesh-grid {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(var(--border-color) 1px, transparent 1px);
  background-size: 30px 30px;
  opacity: 0.15;
}

/* Hero */
.intro-hero {
  text-align: center;
  max-width: 800px;
  margin: 0 auto 6rem;
}

.intro-title {
  font-size: 3.5rem;
  font-weight: 900;
  margin-bottom: 2rem;
  letter-spacing: -0.02em;
}

.intro-subtitle {
  font-size: 1.25rem;
  color: var(--text-secondary);
  line-height: 1.8;
}

/* Sections */
.section-container {
  margin-bottom: 8rem;
}

.section-header {
  margin-bottom: 3rem;
  display: flex;
  align-items: center;
  gap: 2rem;
}

.section-title {
  font-size: 1.75rem;
  font-weight: 800;
  color: #1e293b;
  white-space: nowrap;
}

.section-divider {
  height: 1px;
  flex: 1;
  background: linear-gradient(to right, var(--border-color), transparent);
}

/* Visual Fusion Stage */
.visual-fusion-stage {
  background: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--border-color);
  border-radius: 32px;
  padding: 3.5rem;
  box-shadow: var(--shadow-xl);
}

.side-layout {
  display: flex;
  align-items: center;
  gap: 4rem;
}

.side-layout.reverse {
  flex-direction: row-reverse;
}

.stage-content {
  flex: 1.2;
}

.stage-visual {
  flex: 0.8;
  display: flex;
  justify-content: center;
}

/* Architecture Visual */
.arch-visual {
  width: 100%;
  max-width: 400px;
}

.arch-img {
  width: 100%;
  height: auto;
  mix-blend-mode: multiply;
  filter: drop-shadow(0 15px 30px rgba(59, 130, 246, 0.1));
}

/* Workflow Visual */
.workflow-visual {
  width: 100%;
  max-width: 420px;
}

.workflow-img {
  width: 100%;
  height: auto;
  mix-blend-mode: multiply;
}

/* Stack list */
.stack-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.stack-card {
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(10px);
  transition: all 0.4s var(--ease-spring);
}

.stack-card:hover {
  background: white;
  transform: translateX(8px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.04);
}

.stack-card.active {
  border-color: var(--accent-primary);
  background: white;
  box-shadow: 0 15px 35px rgba(59, 130, 246, 0.08);
}

.stack-index {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--accent-primary);
  margin-bottom: 0.5rem;
}

.stack-name {
  font-size: 1.1rem;
  font-weight: 800;
  margin-bottom: 0.4rem;
}

.stack-desc {
  font-size: 0.85rem;
  line-height: 1.5;
  color: var(--text-secondary);
}

/* Guide list */
.guide-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.guide-item {
  display: flex;
  gap: 1.25rem;
  padding: 1.25rem;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 16px;
  transition: all 0.3s ease;
  align-items: center;
}

.guide-item:hover {
  background: white;
  transform: translateX(-8px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
}

.guide-num {
  font-size: 0.7rem;
  font-weight: 900;
  color: white;
  background: #0f172a;
  padding: 3px 8px;
  border-radius: 4px;
  text-transform: uppercase;
}

.guide-content h4 {
  font-size: 1.05rem;
  margin-bottom: 0.25rem;
}

.guide-content p {
  font-size: 0.85rem;
  line-height: 1.5;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.scene-tag-lite {
  font-size: 0.7rem;
  color: var(--accent-primary);
  background: rgba(59, 130, 246, 0.08);
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 600;
  margin-left: 8px;
}

/* Footer */
.intro-footer {
  text-align: center;
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  padding-top: 2rem;
}

/* Responsive */
@media (max-width: 1024px) {
  .side-layout, .side-layout.reverse {
    flex-direction: column;
    padding: 2rem;
  }
  .stage-visual { margin-bottom: 2rem; }
}

.animate-in {
  opacity: 0;
  transform: translateY(30px);
  animation: slideUpFade 0.8s forwards cubic-bezier(0.16, 1, 0.3, 1);
  animation-delay: var(--delay, 0s);
}

@keyframes slideUpFade {
  to { opacity: 1; transform: translateY(0); }
}
</style>
