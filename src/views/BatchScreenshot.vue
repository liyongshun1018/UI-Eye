<template>
  <div class="batch-screenshot">
    <div class="page-header">
      <h1>🎯 创建批量视觉对比任务</h1>
      <button class="btn-secondary" @click="goBack">返回列表</button>
    </div>

    <div class="task-form-container">
      <form @submit.prevent="handleSubmit" class="task-form">
        <!-- 任务名称 -->
        <div class="form-group">
          <label for="task-name">任务名称 <span class="required">*</span></label>
          <input
            id="task-name"
            v-model="form.name"
            type="text"
            placeholder="例如：门户首页对比"
            required
          />
        </div>

        <!-- URL 列表 -->
        <div class="form-group">
          <label for="urls">URL 列表 <span class="required">*</span></label>
          <div class="url-input-container">
            <textarea
              id="urls"
              v-model="urlText"
              placeholder="输入 URL，每行一个..."
              rows="10"
              required
            ></textarea>
            <div class="url-hint">
              <span>已输入: <strong>{{ urlCount }}</strong> 个 URL</span>
              <button type="button" class="btn-link" @click="handleImport">从文件导入</button>
            </div>
          </div>
        </div>

        <!-- 关联脚本 -->
        <div class="form-group">
          <label for="script">关联交互脚本 (可选)</label>
          <select id="script" v-model="form.scriptId">
            <option :value="null">无脚本</option>
            <option v-for="script in availableScripts" :key="script.id" :value="script.id">
              {{ script.name }}
            </option>
          </select>
          <p class="field-hint">选择预定义的自动化操作（如：登录后台），将在截图前自动运行。</p>
        </div>

        <!-- 登录域名 -->
        <div class="form-group">
          <label for="domain">关联登录域名 (可选)</label>
          <input
            id="domain"
            v-model="form.domain"
            type="text"
            placeholder="例如：baidu.com"
          />
          <p class="field-hint">如果页面需要登录，系统会尝试加载该域名的已存 Cookie。</p>
        </div>

        <!-- 设计稿上传 -->
        <div class="form-section">
          <DesignUpload v-model="designUpload" />
        </div>

        <!-- 对比配置 -->
        <div class="form-section" v-if="designUpload.designSource">
          <CompareConfig v-model="compareConfig" />
        </div>

        <!-- 截图选项 -->
        <div class="options-group">
          <h3>截图配置</h3>
          <div class="options-grid">
            <div class="option-item">
              <label class="checkbox-label">
                <input type="checkbox" v-model="form.options.fullPage" />
                <span>全页滚动截图</span>
              </label>
            </div>
            <div class="option-item">
              <label class="checkbox-label">
                <input type="checkbox" v-model="form.options.headless" />
                <span>无头模式 (推荐)</span>
              </label>
            </div>
          </div>
        </div>

        <div class="form-actions">
          <button type="button" class="btn-cancel" @click="goBack" :disabled="submitting">
            取消
          </button>
          <button type="submit" class="btn-submit" :disabled="submitting || urlCount === 0">
            {{ submitting ? '创建中...' : (designUpload.designSource ? '创建并启动对比任务' : '创建并启动截图任务') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { batchTaskAPI } from '@/api'
import { useDialog } from '../composables/useDialog.ts'
import DesignUpload from '../components/batch/DesignUpload.vue'
import CompareConfig from '../components/batch/CompareConfig.vue'
import { COMPARE_ENGINE, AI_MODEL } from '../constants'

const { showAlert, showError } = useDialog()

const router = useRouter()
const submitting = ref(false)
const urlText = ref('')
const availableScripts = ref([])

const form = ref({
  name: '',
  domain: '',
  scriptId: null,
  options: {
    fullPage: true,
    headless: true
  }
})

// 设计稿上传数据
const designUpload = ref({
  mode: 'single',
  designSource: ''
})

// 对比配置数据
const compareConfig = ref({
  engine: COMPARE_ENGINE.RESEMBLE,
  aiModel: AI_MODEL.SILICONFLOW,
  ignoreAntialiasing: true
})

const fetchScripts = async () => {
  try {
    const response = await batchTaskAPI.getScripts()
    if (response.success) {
      availableScripts.value = response.scripts
    }
  } catch (err) {
    console.error('加载脚本失败:', err)
  }
}

onMounted(() => {
  fetchScripts()
})

const urlCount = computed(() => {
  return urlText.value.split('\n').filter(url => url.trim().length > 0).length
})

const handleSubmit = async () => {
  if (submitting.value) return
  
  const urls = urlText.value.split('\n').filter(url => url.trim().length > 0)
  if (urls.length === 0) {
    showAlert('请输入至少一个 URL')
    return
  }

  submitting.value = true
  try {
    const data = {
      name: form.value.name,
      urls: urls,
      domain: form.value.domain || null,
      script_id: form.value.scriptId,
      designMode: designUpload.value.mode,
      designSource: designUpload.value.designSource || null,
      compareConfig: designUpload.value.designSource ? compareConfig.value : null,
      options: form.value.options
    }
    
    const response = await batchTaskAPI.createTask(data)
    if (response && response.taskId) {
      // 自动启动任务
      await batchTaskAPI.startTask(response.taskId)
      // 跳转到监控页面
      router.push(`/batch-tasks/${response.taskId}`)
    }
  } catch (error) {
    console.error('提交任务失败:', error)
    showError('创建任务失败: ' + (error.response?.data?.message || error.message))
  } finally {
    submitting.value = false
  }
}

const handleImport = () => {
  // TODO: 实现文本文件导入
  showAlert('功能开发中：支持 .txt / .csv 批量导入 URL')
}

const goBack = () => {
  router.push('/batch-tasks')
}
</script>

<style scoped>
.batch-screenshot {
  max-width: 800px;
  margin: 0 auto;
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
}

.task-form-container {
  background: white;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.task-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-section {
  padding: 24px;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.task-form-container {
  background: white;
  padding: 32px;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.task-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-weight: 600;
  color: #374151;
  font-size: 14px;
}

.required {
  color: #ef4444;
}

.form-group input[type="text"],
.form-group textarea {
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group textarea:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.url-hint {
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
  font-size: 12px;
  color: #6b7280;
}

.field-hint {
  font-size: 12px;
  color: #6b7280;
  margin-top: 4px;
}

.options-group h3 {
  font-size: 16px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid #f3f4f6;
}

.options-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #4b5563;
}

.checkbox-label input {
  width: 16px;
  height: 16px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
  padding-top: 24px;
  border-top: 1px solid #f3f4f6;
}

.btn-secondary,
.btn-cancel,
.btn-submit {
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary {
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  color: #374151;
}

.btn-cancel {
  background: white;
  border: 1px solid #d1d5db;
  color: #4b5563;
}

.btn-submit {
  background: #3b82f6;
  border: 1px solid #2563eb;
  color: white;
}

.btn-submit:hover:not(:disabled) {
  background: #2563eb;
  box-shadow: 0 4px 6px rgba(37, 99, 235, 0.2);
}

.btn-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-link {
  background: none;
  border: none;
  color: #3b82f6;
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
  font-size: 12px;
}
</style>
