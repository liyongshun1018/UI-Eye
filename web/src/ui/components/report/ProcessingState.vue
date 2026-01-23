<template>
  <div class="processing-state card glass-modern animate-in">
    <div class="processing-inner">
      <div class="processing-status-header">
        <div class="progress-percentage-giant">{{ progress }}<span class="unit">%</span></div>
        <div class="status-badge-pulse">AI 视觉分析进行中</div>
      </div>

      <!-- 高保真进度条 -->
      <div class="progress-container-premium">
        <div 
          class="progress-bar-shimmer" 
          :style="{ width: `${Math.max(progress, 5)}%` }"
        >
          <div class="shimmer-effect"></div>
        </div>
      </div>

      <!-- 动态步骤日志 -->
      <div class="execution-log-container">
        <div class="log-indicator">
          <div class="pulse-dot"></div>
          <p class="current-step-text">{{ stepText || '正在初始化对比引擎并准备捕获环境...' }}</p>
        </div>
        
        <div class="progress-steps-visual">
          <div :class="['step-node', { done: progress >= 30, active: progress < 30 }]">
            <div class="node-icon">📸</div>
            <span class="node-label">采样捕获</span>
          </div>
          <div class="step-connector" :class="{ filled: progress >= 40 }"></div>
          <div :class="['step-node', { done: progress >= 60, active: progress >= 30 && progress < 60 }]">
            <div class="node-icon">⚖️</div>
            <span class="node-label">像素对比</span>
          </div>
          <div class="step-connector" :class="{ filled: progress >= 70 }"></div>
          <div :class="['step-node', { done: progress >= 90, active: progress >= 60 && progress < 90 }]">
            <div class="node-icon">🧠</div>
            <span class="node-label">AI 诊断</span>
          </div>
          <div class="step-connector" :class="{ filled: progress >= 95 }"></div>
          <div :class="['step-node', { done: progress >= 100, active: progress >= 90 && progress < 100 }]">
            <div class="node-icon">📄</div>
            <span class="node-label">生成报告</span>
          </div>
        </div>
      </div>
      
      <p class="hint-text-premium">预计还需 10-20 秒，请勿刷新页面</p>
    </div>
  </div>
</template>

<script setup>
/**
 * ProcessingState.vue - 任务执行实时状态看板
 * 功能：
 * 1. 展现对比任务的总体百分比进度。
 * 2. 实时流转当前执行的原子步骤描述（如：正在采集截图...）。
 * 3. 视觉化展示完整的执行流水线节点（采样 -> 对比 -> AI 诊断 -> 报告生成）。
 */
defineProps({
  // 总体任务进度 (0-100)
  progress: {
    type: Number,
    default: 0
  },
  // 当前步骤的文字描述
  stepText: {
    type: String,
    default: ''
  }
})
</script>

<style scoped>
.glass-modern {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.1);
  border-radius: 32px;
}

.processing-state {
  max-width: 800px;
  margin: 40px auto;
  padding: 60px 40px;
}

.processing-inner {
  display: flex;
  flex-direction: column;
  gap: 40px;
  align-items: center;
}

.processing-status-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.progress-percentage-giant {
  font-size: 5rem;
  font-weight: 950;
  background: linear-gradient(135deg, #2563eb, #7c3aed);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  line-height: 1;
  letter-spacing: -0.04em;
}

.progress-percentage-giant .unit {
  font-size: 2rem;
  margin-left: 4px;
}

.status-badge-pulse {
  background: #eff6ff;
  color: #2563eb;
  padding: 6px 16px;
  border-radius: 100px;
  font-size: 0.875rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid #dbeafe;
}

.status-badge-pulse::before {
  content: '';
  width: 8px;
  height: 8px;
  background: #2563eb;
  border-radius: 50%;
  animation: pulse-simple 1.5s infinite;
}

@keyframes pulse-simple {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.5); opacity: 0.5; }
  100% { transform: scale(1); opacity: 1; }
}

.progress-container-premium {
  width: 100%;
  max-width: 500px;
  height: 12px;
  background: #f1f5f9;
  border-radius: 100px;
  position: relative;
  overflow: hidden;
  border: 1px solid #e2e8f0;
}

.progress-bar-shimmer {
  height: 100%;
  background: linear-gradient(90deg, #2563eb, #3b82f6);
  border-radius: 100px;
  transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
}

.shimmer-effect {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, 
    transparent, 
    rgba(255, 255, 255, 0.4), 
    transparent
  );
  animation: shimmer-swipe 2s infinite;
}

@keyframes shimmer-swipe {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.execution-log-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
  align-items: center;
}

.log-indicator {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #f8fafc;
  padding: 10px 20px;
  border-radius: 16px;
  border: 1px solid #f1f5f9;
}

.current-step-text {
  font-weight: 700;
  color: #1e293b;
  font-size: 1rem;
}

.pulse-dot {
  width: 10px;
  height: 10px;
  background: #2563eb;
  border-radius: 50%;
  position: relative;
}

.pulse-dot::after {
  content: '';
  position: absolute;
  inset: -4px;
  border: 2px solid #2563eb;
  border-radius: 50%;
  animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
}

@keyframes ping {
  75%, 100% { transform: scale(2); opacity: 0; }
}

.progress-steps-visual {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  max-width: 600px;
  justify-content: center;
}

.step-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  position: relative;
  z-index: 2;
  transition: all 0.3s;
}

.node-icon {
  width: 44px;
  height: 44px;
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  transition: all 0.3s;
}

.step-node.done .node-icon {
  border-color: #22c55e;
  background: #f0fdf4;
}

.step-node.active .node-icon {
  border-color: #2563eb;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1);
  transform: scale(1.1);
}

.node-label {
  font-size: 0.75rem;
  font-weight: 800;
  color: #94a3b8;
  text-transform: uppercase;
}

.step-node.done .node-label { color: #22c55e; }
.step-node.active .node-label { color: #2563eb; }

.step-connector {
  flex: 1;
  height: 3px;
  background: #e2e8f0;
  border-radius: 2px;
  position: relative;
  margin-bottom: 24px;
}

.step-connector.filled::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #22c55e;
  transition: width 0.5s;
}

.hint-text-premium {
  font-size: 0.8125rem;
  color: #94a3b8;
  font-weight: 500;
}

.animate-in {
  animation: slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slide-up {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
