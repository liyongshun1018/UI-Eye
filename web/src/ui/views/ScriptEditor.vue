<template>
  <div class="script-editor-container">
    <div class="page-header">
      <div class="header-left">
        <button class="btn-back" @click="goBack">← 返回列表</button>
        <h1>{{ isNew ? '✨ 新建交互脚本' : '📝 编辑交互脚本' }}</h1>
      </div>
      <div class="header-actions">
        <button class="btn-secondary" @click="showTemplates = true">📋 使用模板</button>
        <button class="btn-primary" @click="saveScript" :disabled="saving">
          {{ saving ? '保存中...' : '保存脚本' }}
        </button>
      </div>
    </div>

    <div class="editor-layout">
      <!-- 左侧：表单配置 -->
      <div class="editor-sidebar">
        <div class="form-group">
          <label for="name">脚本名称 <span class="required">*</span></label>
          <input 
            id="name" 
            v-model="script.name" 
            type="text" 
            placeholder="例如：登录后台系统" 
            required 
          />
        </div>
        <div class="form-group">
          <label for="description">脚本描述</label>
          <textarea 
            id="description" 
            v-model="script.description" 
            placeholder="简要说明脚本的操作步骤..."
            rows="4"
          ></textarea>
        </div>

        <div class="help-panel">
          <h3>📘 语法参考指南</h3>
          <div class="help-scroll-area">
            <section>
              <h4>基础交互</h4>
              <ul>
                <li><code>await page.click('selector')</code> 点击</li>
                <li><code>await page.fill('selector', 'text')</code> 输入</li>
                <li><code>await page.hover('selector')</code> 悬停</li>
                <li><code>await page.press('selector', 'Enter')</code> 键盘</li>
              </ul>
            </section>
            
            <section>
              <h4>等待机制</h4>
              <ul>
                <li><code>await page.waitForSelector('.el')</code> 等待元素</li>
                <li><code>await page.waitForNavigation()</code> 等待跳转</li>
                <li><code>await delay(1000)</code> 等待 1s</li>
                <li><code>await page.waitForLoadState('networkidle')</code></li>
              </ul>
            </section>

            <section>
              <h4>脚本进阶</h4>
              <ul>
                <li>
                  <strong>DOM 操作</strong>:
                  <code>await page.evaluate(() => { ... })</code>
                </li>
                <li>
                  <strong>选择器</strong>:
                  <ul>
                    <li><code>#id</code>, <code>.class</code> (CSS)</li>
                    <li><code>text=登录</code> (文本)</li>
                    <li><code>[attr=val]</code> (属性)</li>
                  </ul>
                </li>
              </ul>
            </section>

            <section class="example-section">
              <h4>实战完整案例</h4>
              <div class="example-preview" @click="showExampleModal = true">
                <pre><code>// 自动化登录示例
await page.fill('#user', 'admin');
await page.fill('#pass', '123456');
await page.click('.login-btn');
...</code></pre>
                <div class="zoom-overlay">🔍 点击放大</div>
              </div>
            </section>
          </div>
        </div>
      </div>

      <!-- 右侧：代码编辑器 -->
      <div class="editor-container">
        <CodeEditor 
          v-model="script.code" 
          :dark="isDarkMode"
          placeholder="// 在此处编写您的 Playwright 脚本代码..."
        >
          <template #toolbar>
            <div class="editor-tools">
              <span class="editor-lang-tag">JavaScript (Playwright)</span>
              <button class="btn-skin-toggle" @click="isDarkMode = !isDarkMode">
                {{ isDarkMode ? '🌙 深色模式' : '☀️ 浅色模式' }}
              </button>
            </div>
          </template>
        </CodeEditor>
      </div>
    </div>

    <!-- 完整示例放大弹窗 -->
    <div v-if="showExampleModal" class="modal-overlay" @click.self="showExampleModal = false">
      <div class="modal preview-modal">
        <div class="modal-header">
          <h3>📂 完整自动化流程示例</h3>
          <button class="btn-close" @click="showExampleModal = false">×</button>
        </div>
        <div class="modal-body scrollable-modal-content">
          <pre class="full-example-code"><code>{{ fullExampleCode }}</code></pre>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="copyFullExample">复制代码</button>
          <button class="btn-primary" @click="applyFullExample">应用此示例</button>
        </div>
      </div>
    </div>

    <!-- 模板选择弹窗 -->
    <div v-if="showTemplates" class="modal-overlay" @click.self="showTemplates = false">
      <div class="modal template-modal">
        <h3>📜 选择脚本模板</h3>
        <p>选择一个预定义模板，快速开始您的自动化脚本。</p>
        <div class="template-list">
          <div 
            v-for="template in templates" 
            :key="template.name" 
            class="template-item"
            @click="applyTemplate(template)"
          >
            <h4>{{ template.name }}</h4>
            <p>{{ template.description }}</p>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn-cancel" @click="showTemplates = false">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { batchTaskAPI } from '@core/api'
import CodeEditor from '@ui/components/common/CodeEditor.vue'
import { useDialog } from '@modules/composables/useDialog.ts'

const { showAlert, showConfirm, showSuccess, showError } = useDialog()

const router = useRouter()
const route = useRoute()
const isNew = computed(() => route.params.id === 'new')
const saving = ref(false)
const showTemplates = ref(false)
const showExampleModal = ref(false)
const isDarkMode = ref(true)

const script = ref({
  name: '',
  description: '',
  code: ''
})

const fullExampleCode = `/**
 * 场景：自动登录后台并跳转至仪表盘
 * 包含：表单填充、按钮点击、等待跳转及延时渲染
 */

// 1. 等待登录表单出现
await page.waitForSelector('#login-form');

// 2. 模拟真实输入
await page.fill('input[name="username"]', 'admin');
await page.fill('input[name="password"]', 'secret_password');

// 3. 执行登录操作
await page.click('#submit-button');

// 4. 等待页面完成跳转
await page.waitForNavigation({ waitUntil: 'networkidle' });

// 5. 额外等待 1.5 秒确保图表或动画加载完成
await delay(1500);

// 6. 系统会自动进行截图操作...`;

const copyFullExample = async () => {
  await navigator.clipboard.writeText(fullExampleCode)
  showSuccess('已复制到剪贴板')
}

const applyFullExample = async () => {
  if (script.value.code) {
    const confirmed = await showConfirm('此操作将覆盖当前代码，确定吗？')
    if (!confirmed) return
  }
  script.value.code = fullExampleCode
  showExampleModal.value = false
}

const templates = [
  {
    name: '简单登录 (Simple Login)',
    description: '自动输入用户名密码并点击提交。',
    code: `// 1. 输入用户名\nawait page.fill('#username', 'admin');\n\n// 2. 输入密码\nawait page.fill('#password', 'password123');\n\n// 3. 点击登录按钮\nawait page.click('button[type="submit"]');\n\n// 4. 等待导航完成\nawait page.waitForNavigation();`
  },
  {
    name: '点击并等待 (Click & Wait)',
    description: '点击特定元素（如下拉菜单、弹窗）并等待其显现。',
    code: `// 1. 点击按钮打开弹窗\nawait page.click('.open-modal-btn');\n\n// 2. 等待弹窗中的特定内容加载\nawait page.waitForSelector('.modal-content');\n\n// 3. 额外等待 500ms 确保动画完成\nawait delay(500);`
  },
  {
    name: '填充搜索框 (Fill Search)',
    description: '在搜索框中输入内容并按下回车。',
    code: `// 1. 聚焦并填充搜索框\nawait page.fill('input[name="q"]', 'UI-Eye 自动化测试');\n\n// 2. 按下回车键\nawait page.press('input[name="q"]', 'Enter');\n\n// 3. 等待结果页面加载\nawait page.waitForLoadState('networkidle');`
  }
]

const fetchScript = async () => {
  if (isNew.value) return
  try {
    const response = await batchTaskAPI.getScript(route.params.id)
    if (response.success) {
      script.value = response.script
    }
  } catch (err) {
    console.error('获取脚本失败:', err)
    showError('加载失败')
  }
}

onMounted(() => {
  fetchScript()
})

const saveScript = async () => {
  if (!script.value.name || !script.value.code) {
    showAlert('请填写名称和脚本代码')
    return
  }

  saving.value = true
  try {
    let response
    if (isNew.value) {
      response = await batchTaskAPI.createScript(script.value)
    } else {
      response = await batchTaskAPI.updateScript(route.params.id, script.value)
    }

    if (response.success) {
      router.push('/scripts')
    }
  } catch (err) {
    showError('保存失败: ' + err.message)
  } finally {
    saving.value = false
  }
}

const applyTemplate = async (template) => {
  if (script.value.code) {
    const confirmed = await showConfirm('此操作将覆盖当前代码，确定吗？')
    if (!confirmed) return
  }
  script.value.code = template.code
  if (!script.value.name) script.value.name = template.name
  showTemplates.value = false
}

const goBack = () => {
  router.push('/scripts')
}
</script>

<style scoped>
.script-editor-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 32px 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-left h1 {
  font-size: 24px;
  margin: 0;
  color: #111827;
}

.btn-back {
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  font-weight: 500;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.editor-layout {
  display: flex;
  gap: 24px;
  height: calc(100vh - 200px);
}

.editor-sidebar {
  width: 400px;
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
  gap: 20px;
  flex-shrink: 0;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.required { color: #ef4444; }

.form-group input, .form-group textarea {
  padding: 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  outline: none;
}

.help-panel {
  margin-top: auto;
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
  font-size: 13px;
  color: #475569;
  display: flex;
  flex-direction: column;
  flex: 1; /* 让面板占据剩余空间 */
  max-height: 600px; /* 显著增加高度 */
}

.help-panel h3 {
  font-size: 14px;
  margin: 0 0 12px 0;
  color: #1e293b;
  border-bottom: 2px solid #e2e8f0;
  padding-bottom: 8px;
}

.help-scroll-area {
  overflow-y: auto;
  overflow-x: hidden; /* 显式禁用横向滚动 */
  padding-right: 4px;
}

.help-scroll-area section {
  margin-bottom: 16px;
}

.help-scroll-area h4 {
  font-size: 12px;
  color: #64748b;
  text-transform: uppercase;
  margin-bottom: 8px;
  letter-spacing: 0.025em;
}

.help-panel ul {
  padding-left: 18px;
  margin: 0;
}

.help-panel li {
  margin-bottom: 6px;
  line-height: 1.4;
}

.help-panel code {
  background: #f1f5f9;
  color: #0f172a;
  padding: 2px 4px;
  border-radius: 4px;
  font-family: monospace;
  word-break: break-all;
  white-space: pre-wrap;
  font-size: 11px; /* 进一步缩小字体 */
}

.example-section {
  margin-top: 8px;
}

.example-preview {
  position: relative;
  background: #1e293b;
  color: #94a3b8;
  padding: 12px;
  border-radius: 6px;
  font-family: monospace;
  font-size: 11px;
  cursor: zoom-in;
  overflow: hidden;
  border: 1px solid #e2e8f0;
}

.example-preview pre {
  margin: 0;
  white-space: pre-wrap; /* 示例预览也支持换行 */
  word-break: break-all;
}

.zoom-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(0,0,0,0.4);
  color: white;
  font-weight: 600;
  opacity: 0;
  transition: opacity 0.2s;
}

.example-preview:hover .zoom-overlay {
  opacity: 1;
}

.preview-modal {
  max-width: 800px;
  width: 90%;
  background: white;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
}

.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
}

.btn-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #94a3b8;
}

.modal-body {
  padding: 24px;
}

.scrollable-modal-content {
  max-height: 50vh;
  overflow-y: auto;
}

.full-example-code {
  background: #f8fafc;
  padding: 16px;
  border-radius: 8px;
  font-family: 'Fira Code', 'Monaco', monospace;
  font-size: 14px;
  line-height: 1.5;
  color: #334155;
  border: 1px solid #e2e8f0;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid #f1f5f9;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.editor-container {
  flex: 1;
  background: white;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.editor-tools {
  display: flex;
  align-items: center;
  gap: 12px;
}

.btn-skin-toggle {
  background: none;
  border: none;
  font-size: 12px;
  color: #64748b;
  cursor: pointer;
  padding: 2px 8px;
  border-radius: 4px;
  transition: all 0.2s;
}

.btn-skin-toggle:hover {
  background: rgba(0,0,0,0.05);
  color: #1e293b;
}

/* 深色模式下的工具栏样式 */
.editor-container :deep(.theme-dark .editor-lang-tag) {
  color: #f8fafc !important;
}

.editor-container :deep(.theme-dark .btn-skin-toggle) {
  color: #f8fafc !important;
}

.editor-container :deep(.theme-dark .btn-tool),
.editor-container :deep(.theme-dark .btn-copy) {
  background: #64748b !important;
  border-color: #94a3b8 !important;
  color: #f8fafc !important;
}

.code-editor-wrapper {
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: column;
}

.btn-primary {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 10px 24px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

.btn-secondary {
  background: white;
  border: 1px solid #d1d5db;
  padding: 10px 16px;
  border-radius: 8px;
  cursor: pointer;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.template-modal {
  max-width: 600px;
  width: 90%;
  background: white;
  padding: 32px;
  border-radius: 16px;
}

.template-list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  margin: 20px 0;
}

.template-item {
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.template-item:hover {
  background: #f0f9ff;
  border-color: #3b82f6;
}

.template-item h4 {
  margin: 0 0 4px 0;
  color: #111827;
}

.template-item p {
  margin: 0;
  font-size: 13px;
  color: #6b7280;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
}
</style>
