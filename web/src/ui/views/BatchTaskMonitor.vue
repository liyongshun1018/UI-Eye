<template>
  <div class="batch-task-monitor professional-theme">
    <!-- 顶部状态栏 -->
    <div class="page-header">
      <div class="title-area">
        <button class="btn-icon" @click="goBack">←</button>
        <div class="title-content">
          <h1>{{ task?.name || '加载中...' }}</h1>
          <p class="subtitle">批量对比任务监控流水线</p>
        </div>
      </div>
      <div class="header-actions">
        <div v-if="['completed', 'failed'].includes(task?.status)" class="final-actions">
          <button class="btn-export" @click="handleExport">
            <span class="icon">📥</span> 导出对比报告 (CSV)
          </button>
          <button class="btn-new-task" @click="handleRestart">新任务</button>
        </div>
        <div v-else-if="task?.status === 'running'" class="running-indicator">
          <div class="pulse-dot"></div>
          {{ task.stepText || '正在处理实时队列...' }}
        </div>
      </div>
    </div>

    <!-- 核心监控区域 -->
    <div v-if="task" class="monitor-grid">
      
      <!-- 左侧：进度和阶段 -->
      <div class="main-monitor-card">
        <!-- 阶段状态条 (Stepper) -->
        <div class="phase-stepper">
            <div 
              v-for="(phase, index) in phaseConfig" 
              :key="phase.key"
              class="step-item"
              :class="{ 
                'active': currentStepIndex === index, 
                'completed': currentStepIndex > index,
                'pending': currentStepIndex < index,
                'skipped': !normalizedTask.hasDesign && ['compare', 'ai'].includes(phase.key)
              }"
            >
              <div class="step-icon">
                <span v-if="currentStepIndex > index">✓</span>
                <span v-else-if="!normalizedTask.hasDesign && ['compare', 'ai'].includes(phase.key)">-</span>
                <span v-else>{{ index + 1 }}</span>
              </div>
              <div class="step-label">
                {{ phase.label }}
                <span v-if="!normalizedTask.hasDesign && ['compare', 'ai'].includes(phase.key)" class="skip-tag">(跳过)</span>
              </div>
              <div v-if="index < phaseConfig.length - 1" class="step-line"></div>
            </div>
        </div>

        <!-- 专业进度中心 -->
        <div class="progress-center">
          <div class="progress-info-row">
            <div class="progress-label">当前流水线总进度: {{ displayProgress }}%</div>
            <div class="stats-mini">
              成功 <span class="success">{{ task.success || 0 }}</span> / 
              失败 <span class="failed">{{ task.failed || 0 }}</span> / 
              总计 {{ task.total || 0 }}
            </div>
          </div>
          <div class="professional-progress-bar">
            <div 
              class="bar-fill" 
              :style="{ width: `${displayProgress}%` }"
              :class="{ 'animating': task.status === 'running' }"
            >
              <div class="glass-shine"></div>
            </div>
          </div>
        </div>

        <!-- 详细统计分块 -->
        <div class="stats-dashboard">
          <div class="stat-card">
            <span class="label">平均还原度评分</span>
            <span class="value accent">{{ normalizedTask.avgSimilarity }}%</span>
            <div class="mini-trend" :class="getSimilarityClass(normalizedTask.avgSimilarity)"></div>
          </div>
          <div class="stat-card">
            <span class="label">累计视觉差异点</span>
            <span class="value" :class="normalizedTask.totalDiffCount > 0 ? 'warning' : 'success'">
              {{ normalizedTask.totalDiffCount }}
            </span>
            <span class="sub">Total identified regions</span>
          </div>
            <div class="stat-card">
            <span class="label">监控运行总耗时</span>
            <span class="value">{{ formatNumber(task.duration, 1) }}s</span>
            <span class="sub">Real-time processing</span>
          </div>
        </div>
      </div>

      <!-- 右侧：实时日志 -->
      <div class="side-monitor">
        <div class="log-panel">
          <div class="panel-header">
            <h3>🔴 实时执行流水 (Live Logs)</h3>
            <span class="status-tag">Pipeline Online</span>
          </div>
          <div class="log-content" ref="logContainer">
            <div v-if="logs.length === 0" class="log-empty">等待系统指令下达...</div>
            <div v-for="(log, idx) in logs" :key="idx" class="log-line">
              <span class="timestamp">[{{ log.time }}]</span>
              <span class="message" :class="log.type">{{ log.msg }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部：明细队列表格 -->
    <div v-if="task" class="results-table-wrapper">
      <div class="table-header">
        <div class="header-left">
          <h3>📋 任务原子明细队列</h3>
          <span class="count-badge">{{ filteredResults.length }} Results</span>
        </div>
        <div class="table-tools">
          <div class="search-box">
            <input type="text" v-model="searchQuery" placeholder="搜索目标 URL 或解析状态..." />
          </div>
          <div class="filter-group">
            <button @click="filter = 'all'" :class="{ active: filter === 'all' }">全部</button>
            <button @click="filter = 'low'" :class="{ active: filter === 'low' }">需关注 (<95%)</button>
          </div>
        </div>
      </div>

      <div class="professional-table-container">
        <table class="modern-table">
          <thead>
            <tr>
              <th width="80">序位</th>
              <th>探测目标 URL</th>
              <th width="140" class="center">比对相似度</th>
              <th width="120" class="center">差异区域</th>
              <th width="120">解析状态</th>
              <th width="200" class="right">快捷操作</th>
            </tr>
          </thead>
          <tbody>
            <!-- 正在处理的活跃行 -->
            <tr v-if="task.status === 'running' && task.currentUrl" class="active-row">
              <td><div class="pulse-indicator"></div></td>
              <td class="url-col">
                <span class="tag-live">LIVE</span>
                {{ task.currentUrl }}
              </td>
              <td colspan="3">
                <div class="loading-bar-small">
                  <div class="loading-fill"></div>
                </div>
              </td>
              <td></td>
            </tr>

            <!-- 结果列表 -->
            <tr v-for="(res, index) in filteredResults" :key="index" :class="{ 'new-entry': isRecent(res) }">
              <td class="index-col">#{{ filteredResults.length - index }}</td>
              <td class="url-col">
                <a :href="res.url" target="_blank">{{ res.url }}</a>
              </td>
              <td class="center">
                <div v-if="res.similarity !== undefined && res.similarity !== null" class="similarity-pill" :class="getSimilarityClass(res.similarity)">
                  {{ formatNumber(res.similarity, 2) }}%
                </div>
                <span v-else>-</span>
              </td>
              <td class="center">
                <span class="diff-count-pill" :class="{ 'warning': res.diffCount > 0 }">
                  {{ res.diffCount ?? 0 }}
                </span>
              </td>
              <td>
                <span class="status-chip" :class="res.status || (res.success ? 'completed' : 'failed')">
                  {{ translateStatus(res.status || (res.success ? 'completed' : 'failed')) }}
                </span>
              </td>
              <td class="action-col right">
                <div class="action-btns">
                  <button v-if="res.success || res.status === 'completed'" @click="previewImage(res)">即时预览</button>
                  <button v-if="res.reportId" class="primary" @click="viewReport(res.reportId)">详情报告</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="!filteredResults.length && !task.currentUrl" class="table-empty">
          <div class="empty-icon">📂</div>
          <p>当前队列暂无匹配信息</p>
        </div>
      </div>
    </div>

    <!-- 预览 Modal -->
    <div v-if="previewUrl" class="glass-modal" @click="previewUrl = null">
      <div class="modal-content" @click.stop>
        <div class="modal-top">
          <h3>截图即时快照预览</h3>
          <button class="close-icon" @click="previewUrl = null">×</button>
        </div>
        <div class="img-viewer">
          <img :src="previewUrl" alt="Preview Screenshot" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBatchStore } from '@modules/stores/batch'
import { batchTaskAPI } from '@core/api'

const route = useRoute()
const router = useRouter()
const taskId = Number(route.params.id)
const batchStore = useBatchStore()

const task = computed(() => batchStore.currentTask)
const loading = computed(() => batchStore.loading)
const previewUrl = ref(null)
const filter = ref('all')
const searchQuery = ref('')
const logContainer = ref(null)
const logs = ref([])

/** 阶段配置 */
const phaseConfig = [
  { key: 'init', label: '任务初始化' },
  { key: 'screenshot', label: '截图采集' },
  { key: 'compare', label: '像素对比' },
  { key: 'ai', label: 'AI 分析' },
  { key: 'finish', label: '报告生成' }
]

/** 专业数值格式化 */
const formatNumber = (val, decimals = 1) => {
  if (val === undefined || val === null || isNaN(Number(val))) return '-'
  return Number(val).toFixed(decimals)
}

/** 任务基础数据标准化 */
const normalizedTask = computed(() => {
  if (!task.value) return { avgSimilarity: '-', totalDiffCount: 0, hasDesign: false }
  
  const hasDesign = !!(task.value.designSource || task.value.design_source)
  
  // 提取平均相似度
  let avg = task.value.avgSimilarity ?? task.value.avg_similarity
  
  // 提取总差异点数
  let diffs = task.value.totalDiffCount ?? task.value.total_diff_count ?? 0
  
  return {
    avgSimilarity: formatNumber(avg, 1),
    totalDiffCount: diffs,
    hasDesign
  }
})

/** 当前进度阶段映射 */
const currentStepIndex = computed(() => {
  if (!task.value) return 0
  if (task.value.status === 'completed') return 5
  if (task.value.status === 'failed') return -1

  const phaseMap = {
    'init': 0,
    'screenshot': 1,
    'compare': 2,
    'ai': 3,
    'finish': 4
  }
  
  // 如果没有设计稿，且截图阶段显示完成，则视觉上跳到生成报告
  if (!normalizedTask.value.hasDesign && task.value.currentPhase === 'screenshot' && task.value.progress >= 100) {
     return 4
  }

  return phaseMap[task.value.currentPhase] !== undefined ? phaseMap[task.value.currentPhase] : 1
})

/** 计算进度百分比 */
const displayProgress = computed(() => {
  if (!task.value) return 0
  if (task.value.status === 'completed') return 100
  if (task.value.status === 'failed') return 0
  
  // 权重定义：各阶段占据的总进度百分比
  const weights = normalizedTask.value.hasDesign 
    ? { screenshot: 45, compare: 40, ai: 10, finish: 5 }
    : { screenshot: 90, compare: 0, ai: 0, finish: 10 }
  
  const phase = task.value.currentPhase || 'init'
  const phaseProgress = task.value.progress || 0 // 阶段内部进度 (0-100)
  
  // 计算基础进度
  let base = 0
  if (phase === 'screenshot') base = 0
  else if (phase === 'compare') base = weights.screenshot
  else if (phase === 'ai') base = weights.screenshot + weights.compare
  else if (phase === 'finish') base = weights.screenshot + weights.compare + weights.ai
  
  // 计算当前阶段对总进度的贡献
  const currentWeight = weights[phase] || 0
  const contribution = (phaseProgress / 100) * currentWeight
  
  return Math.min(Math.round(base + contribution), 99)
})

/** 过滤与搜索逻辑 */
const filteredResults = computed(() => {
  if (!task.value?.results) return []
  
  let resultsArray = []
  const rawResults = task.value.results
  if (Array.isArray(rawResults)) {
    resultsArray = rawResults
  } else if (typeof rawResults === 'object' && rawResults !== null) {
    // 针对对象格式，尝试提取结果
    resultsArray = rawResults.compare?.results || rawResults.screenshot?.results || []
  }

  let final = resultsArray.filter(r => r && typeof r === 'object').map(r => {
    // 数据标准化：统一处理 DB 字段(snake_case) 与 WebSocket/Frontend 字段(camelCase)
    const normalized = {
      ...r,
      similarity: r.similarity ?? r.similarity_score ?? undefined,
      diffCount: r.diffCount ?? r.diff_count ?? 0,
      reportId: r.reportId ?? r.report_id ?? null,
      status: r.status || (r.success ? 'completed' : 'failed')
    }
    return normalized
  })

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    final = final.filter(r => (r.url || '').toLowerCase().includes(q) || (translateStatus(r.status) || '').includes(q))
  }

  if (filter.value === 'low') {
    final = final.filter(r => r.similarity !== undefined && r.similarity < 95)
  }

  // 使用 URL 作为唯一标识进行去重和排序，确保实时性
  const uniqueMap = new Map()
  final.forEach(item => {
    if (item.url) uniqueMap.set(item.url, item)
  })
  
  return Array.from(uniqueMap.values()).reverse() 
})

/** 实时日志处理 */
const addLog = (msg, type = 'info') => {
  const time = new Date().toLocaleTimeString('zh-CN', { hour12: false })
  logs.value.push({ time, msg, type })
  if (logs.value.length > 100) logs.value.shift()
  
  // 异步确保 DOM 更新后滚动
  setTimeout(() => {
    if (logContainer.value) {
      logContainer.value.scrollTop = logContainer.value.scrollHeight
    }
  }, 50)
}

/** 监听任务内部变化产生 log */
watch(() => task.value?.currentUrl, (newUrl) => {
  if (newUrl) addLog(`处理目标: ${newUrl}`, 'process')
}, { immediate: true })

watch(() => task.value?.success, (newSuccess, oldSuccess) => {
  if (newSuccess > (oldSuccess || 0)) {
    addLog(`√ 成功完成 1 项子任务 (当前累计: ${newSuccess})`, 'success')
  }
})

watch(() => task.value?.currentPhase, (p) => {
  if (p) {
    const label = phaseConfig.find(pc => pc.key === p)?.label || p
    const stepHint = task.value?.stepText ? ` (${task.value.stepText})` : ''
    addLog(`>>> 动力切换: 进入 [${label}]${stepHint}`, 'phase')
  }
}, { immediate: true })

watch(() => task.value?.status, (s) => {
  if (s === 'completed') addLog(`Pipeline 成功: 所有核准项已解析`, 'success')
  if (s === 'failed') addLog(`Pipeline 故障: 捕获到系统异常中断`, 'error')
}, { immediate: true })

/** 操作方法 */
const handleExport = () => window.open(batchTaskAPI.getExportUrl(taskId), '_blank')
const handleRestart = () => router.push('/batch-screenshot')
const viewReport = (id) => router.push(`/report/${id}`)
const goBack = () => router.push('/batch-tasks')

const previewImage = (res) => {
  // 优先使用 screenshot_path (已经是完整 URL)
  // 其次使用 url_path (已经是完整 URL)
  // 最后尝试从 filename 或 path 构建 URL
  let imagePath = res.screenshot_path || res.url_path
  
  if (!imagePath && res.filename) {
    imagePath = `/api/batch/screenshots/${res.filename}`
  } else if (!imagePath && res.path) {
    const filename = res.path.split(/[\/\\]/).pop()
    imagePath = `/api/batch/screenshots/${filename}`
  }
  
  if (imagePath) {
    previewUrl.value = imagePath
  } else {
    console.warn('无法获取截图路径:', res)
  }
}

const getSimilarityClass = (v) => {
  if (v === undefined || v === null) return ''
  if (v >= 98) return 'high'
  if (v >= 90) return 'mid'
  return 'low'
}

const translateStatus = (s) => {
  const map = { pending: '队列中', running: '进行中', completed: '解析完成', failed: '执行失败', waiting: '待处理' }
  return map[s] || s
}

const isRecent = (r) => {
  const compTime = r.completed_at || r.updated_at
  if (!compTime) return false
  return (Date.now() - new Date(compTime).getTime()) < 5000
}

// 核心：处理路由参数变化，实现组件内切任务的刷新
watch(() => route.params.id, (newId) => {
  if (newId) {
    logs.value = []
    batchStore.fetchTaskById(Number(newId))
  }
})

onMounted(() => {
  batchStore.fetchTaskById(taskId)
})
</script>

<style scoped>
.batch-task-monitor.professional-theme {
  max-width: 1400px;
  margin: 0 auto;
  padding: 32px;
  background: #f8fafc;
  min-height: 100vh;
  color: #1e293b;
}

/* Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
}

.title-area { display: flex; gap: 20px; align-items: center; }

.btn-icon {
  background: white; border: 1px solid #e2e8f0; width: 44px; height: 44px;
  border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center;
  font-size: 20px; transition: all 0.2s;
}
.btn-icon:hover { background: #f1f5f9; transform: translateX(-2px); }

.title-content h1 { margin: 0; font-size: 28px; font-weight: 800; color: #0f172a; }
.subtitle { margin: 4px 0 0; color: #64748b; font-size: 14px; font-weight: 500; }

.running-indicator {
  display: flex; align-items: center; gap: 10px;
  background: white; color: #2563eb; padding: 10px 20px;
  border-radius: 14px; font-weight: 700; font-size: 14px;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
  border: 1px solid #dbeafe;
}

.pulse-dot {
  width: 10px; height: 10px; background: #3b82f6; border-radius: 50%;
  box-shadow: 0 0 0 0 rgba(59,130,246,0.4);
  animation: pulse-ring 1.5s infinite;
}

@keyframes pulse-ring {
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(59,130,246,0.7); }
  70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(59,130,246,0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(59,130,246,0); }
}

/* Monitor Layout */
.monitor-grid {
  display: grid; grid-template-columns: 1fr 380px; gap: 24px; margin-bottom: 24px;
}

.main-monitor-card {
  background: white; border-radius: 24px; padding: 40px;
  box-shadow: 0 10px 25px -5px rgba(0,0,0,0.02);
  border: 1px solid rgba(226, 232, 240, 0.8);
}

/* Stepper */
.phase-stepper {
  display: flex; justify-content: space-between; margin-bottom: 48px; position: relative;
}

.step-item { flex: 1; display: flex; flex-direction: column; align-items: center; position: relative; z-index: 1; }

.step-icon {
  width: 40px; height: 40px; border-radius: 14px; background: #f1f5f9;
  color: #94a3b8; display: flex; align-items: center; justify-content: center;
  font-weight: 800; margin-bottom: 12px; transition: all 0.4s;
  border: 2px solid transparent;
}

.step-label { font-size: 13px; font-weight: 700; color: #94a3b8; transition: color 0.3s; }

.step-line {
  position: absolute; top: 20px; left: 50%; width: 100%; height: 3px;
  background: #f1f5f9; z-index: -1; transition: background 0.4s;
}

.step-item.active .step-icon {
  background: #2563eb; color: white; border-color: #93c5fd;
  box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.3);
}
.step-item.active .step-label { color: #1e293b; }

.step-item.completed .step-icon { background: #10b981; color: white; }
.step-item.completed .step-label { color: #10b981; }
.step-item.skipped .step-icon { background: #f1f5f9; color: #cbd5e1; border-color: #e2e8f0; opacity: 0.6; }
.step-item.skipped .step-label { color: #cbd5e1; }
.skip-tag { font-size: 10px; display: block; font-weight: 500; }

/* Progress Center */
.progress-center { margin-bottom: 40px; }
.progress-info-row { display: flex; justify-content: space-between; margin-bottom: 14px; align-items: flex-end; }
.progress-label { font-weight: 800; font-size: 15px; color: #1e293b; }
.stats-mini { font-size: 14px; font-weight: 600; color: #64748b; }
.stats-mini .success { color: #10b981; }
.stats-mini .failed { color: #ef4444; }

.professional-progress-bar {
  height: 24px; background: #f1f5f9; border-radius: 12px; overflow: hidden; position: relative;
}
.bar-fill {
  height: 100%; background: linear-gradient(90deg, #3b82f6 0%, #2dd4bf 100%);
  border-radius: 12px; transition: width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
}
.glass-shine {
  position: absolute; top: 0; left: 0; right: 0; bottom: 0;
  background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0) 100%);
  animation: shimmer 1.5s infinite linear;
}

/* Stats Cards */
.stats-dashboard { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
.stat-card {
  background: #f8fafc; padding: 24px; border-radius: 20px; border: 1px solid #f1f5f9;
  display: flex; flex-direction: column; transition: transform 0.2s;
}
.stat-card:hover { transform: translateY(-3px); }
.stat-card .label { font-size: 13px; font-weight: 700; color: #64748b; margin-bottom: 10px; }
.stat-card .value { font-size: 28px; font-weight: 900; color: #0f172a; }
.stat-card .value.accent { color: #2563eb; }
.stat-card .value.success { color: #10b981; }
.stat-card .value.warning { color: #f59e0b; }
.stat-card .sub { font-size: 11px; font-weight: 600; color: #94a3b8; margin-top: 6px; text-transform: uppercase; }

/* Logs Panel */
.side-monitor { display: flex; flex-direction: column; }
.log-panel {
  flex: 1; background: #0f172a; border-radius: 24px; color: #94a3b8;
  display: flex; flex-direction: column; overflow: hidden; border: 1px solid #1e293b;
}
.panel-header { padding: 20px; background: #1e293b; display: flex; justify-content: space-between; align-items: center; }
.panel-header h3 { margin: 0; font-size: 13px; color: #e2e8f0; font-weight: 700; }
.status-tag { font-size: 10px; font-weight: 800; padding: 4px 8px; background: #064e3b; color: #10b981; border-radius: 6px; }

.log-content {
  flex: 1; padding: 20px; font-family: 'JetBrains Mono', monospace; font-size: 12px;
  line-height: 1.8; overflow-y: auto; background: #0f172a;
}
.log-line { margin-bottom: 8px; display: flex; gap: 10px; }
.timestamp { color: #334155; flex-shrink: 0; }
.message.success { color: #10b981; }
.message.process { color: #3b82f6; }
.message.phase { color: #f59e0b; }
.message.error { color: #ef4444; }

/* Table Section */
.results-table-wrapper {
  background: white; border-radius: 24px; padding: 32px;
  box-shadow: 0 10px 25px -5px rgba(0,0,0,0.02);
  border: 1px solid rgba(226, 232, 240, 0.8);
}
.table-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
.header-left { display: flex; align-items: center; gap: 12px; }
.header-left h3 { margin: 0; font-size: 20px; font-weight: 800; color: #0f172a; }
.count-badge { background: #f1f5f9; color: #475569; padding: 4px 10px; border-radius: 8px; font-size: 12px; font-weight: 800; }

.table-tools { display: flex; gap: 16px; align-items: center; }
.search-box input {
  background: #f1f5f9; border: 2px solid transparent; padding: 10px 18px;
  border-radius: 12px; font-size: 14px; width: 280px; transition: all 0.2s;
}
.search-box input:focus { border-color: #3b82f6; background: white; outline: none; box-shadow: 0 0 0 4px rgba(59,130,246,0.1); }

.filter-group { display: flex; background: #f1f5f9; padding: 4px; border-radius: 12px; }
.filter-group button {
  border: none; background: none; padding: 8px 16px; border-radius: 10px;
  font-size: 13px; font-weight: 700; color: #64748b; cursor: pointer; transition: all 0.2s;
}
.filter-group button.active { background: white; color: #2563eb; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }

/* Table Styling */
.professional-table-container { overflow-x: auto; }
.modern-table { width: 100%; border-collapse: collapse; }
.modern-table th { text-align: left; padding: 16px 20px; color: #94a3b8; font-size: 12px; font-weight: 800; text-transform: uppercase; border-bottom: 2px solid #f1f5f9; }
.modern-table td { padding: 20px; border-bottom: 1px solid #f8fafc; font-size: 14px; font-weight: 500; vertical-align: middle; }
.modern-table th.center, .modern-table td.center { text-align: center; }
.modern-table th.right, .modern-table td.right { text-align: right; }

.url-col { font-family: 'JetBrains Mono', monospace; font-size: 13px; color: #334155; }
.url-col a { color: #2563eb; text-decoration: none; font-weight: 600; }
.url-col a:hover { text-decoration: underline; }

.similarity-pill {
  display: inline-flex; align-items: center; padding: 6px 12px; border-radius: 10px;
  font-weight: 800; font-size: 13px; font-family: 'JetBrains Mono';
}
.similarity-pill.high { background: #d1fae5; color: #065f46; }
.similarity-pill.mid { background: #fef3c7; color: #92400e; }
.similarity-pill.low { background: #fee2e2; color: #991b1b; }

.diff-count-pill { font-weight: 800; font-family: 'JetBrains Mono'; color: #64748b; }
.diff-count-pill.warning { color: #f43f5e; font-size: 16px; }

.status-chip { padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 700; }
.status-chip.completed { background: #ecfdf5; color: #059669; }
.status-chip.failed { background: #fef2f2; color: #dc2626; }
.status-chip.running { background: #eff6ff; color: #2563eb; }

/* Active Row Anim */
.active-row { background: #f0f9ff !important; }
.active-row .url-col { color: #0369a1; font-weight: 700; }
.pulse-indicator {
  width: 14px; height: 14px; background: #3b82f6; border-radius: 50%;
  box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); animation: pulse-dot 2s infinite; margin: 0 auto;
}
@keyframes pulse-dot { 0% { box-shadow: 0 0 0 0 rgba(59,130,246,0.6); } 70% { box-shadow: 0 0 0 12px rgba(59,130,246,0); } 100% { box-shadow: 0 0 0 0 rgba(59,130,246,0); } }

.loading-bar-small { height: 10px; background: #e2e8f0; border-radius: 5px; overflow: hidden; width: 100%; }
.loading-fill { height: 100%; background: #3b82f6; width: 30%; animation: slide-wave 1.5s infinite ease-in-out; }
@keyframes slide-wave { 0% { transform: translateX(-100%); width: 20%; } 50% { width: 40%; } 100% { transform: translateX(400%); width: 20%; } }

.tag-live { background: #f43f5e; color: white; font-size: 10px; font-weight: 900; padding: 2px 6px; border-radius: 5px; margin-right: 10px; }

/* Buttons & Actions */
.action-btns { display: flex; gap: 10px; justify-content: flex-end; }
.action-btns button {
  padding: 8px 14px; border-radius: 10px; border: 1px solid #e2e8f0;
  background: white; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s;
}
.action-btns button:hover { background: #f8fafc; border-color: #cbd5e1; }
.action-btns button.primary { background: #0f172a; color: white; border-color: #0f172a; }
.action-btns button.primary:hover { background: #1e293b; }

.btn-export { background: white; border: 1px solid #e2e8f0; padding: 12px 24px; border-radius: 14px; font-weight: 800; font-size: 14px; cursor: pointer; transition: all 0.2s; }
.btn-export:hover { border-color: #cbd5e1; background: #f8fafc; }
.btn-new-task { background: #2563eb; color: white; border: none; padding: 12px 24px; border-radius: 14px; font-weight: 800; font-size: 14px; cursor: pointer; margin-left:12px; }

/* Glass Modal */
.glass-modal {
  position: fixed; inset: 0; background: rgba(15, 23, 42, 0.9);
  backdrop-filter: blur(12px); z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 40px;
}
.modal-content {
  background: white; border-radius: 32px; width: 100%; max-width: 1200px;
  max-height: 90vh; display: flex; flex-direction: column; overflow: hidden;
  box-shadow: 0 50px 100px -20px rgba(0,0,0,0.5);
}
.modal-top { padding: 24px 40px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
.modal-top h3 { margin: 0; font-size: 20px; font-weight: 800; }
.close-icon { background: none; border: none; font-size: 32px; cursor: pointer; color: #94a3b8; }
.img-viewer { flex: 1; overflow: auto; padding: 40px; background: #f1f5f9; display: block; text-align: center; }
.img-viewer img { max-width: none; height: auto; border-radius: 16px; box-shadow: 0 30px 60px -12px rgba(0,0,0,0.3); }

@keyframes shimmer { 0% { opacity: 0.5; transform: translateX(-100%); } 100% { opacity: 0.8; transform: translateX(100%); } }

.new-entry { animation: highlight-new-success 3s cubic-bezier(0, 0, 0.2, 1); }
@keyframes highlight-new-success { 0% { background: #d1fae5; } 100% { background: transparent; } }

/* Responsive adjustments */
@media (max-width: 1100px) {
  .monitor-grid { grid-template-columns: 1fr; }
  .side-monitor { height: 300px; }
}
</style>
