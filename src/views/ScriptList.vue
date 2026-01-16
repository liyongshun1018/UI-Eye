<template>
  <div class="script-list-container">
    <div class="page-header">
      <div class="header-left">
        <h1>📜 交互脚本管理</h1>
        <p class="subtitle">预定义自动化操作（登录、点击、表单填充），并在截图前自动运行。</p>
      </div>
      <button class="btn-primary" @click="createNewScript">
        <span>➕ 新建脚本</span>
      </button>
    </div>

    <!-- 过滤器 -->
    <div class="filter-bar">
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input type="text" v-model="searchQuery" placeholder="搜索脚本名称..." />
      </div>
    </div>

    <!-- 列表展示 -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>正在加载脚本数据...</p>
    </div>

    <div v-else-if="filteredScripts.length === 0" class="empty-state">
      <div class="empty-icon">📂</div>
      <h3>暂无脚本</h3>
      <p>您可以创建一个脚本来自动处理登录等复杂交互。</p>
      <button class="btn-outline" @click="createNewScript">立即创建</button>
    </div>

    <div v-else class="script-grid">
      <div v-for="script in filteredScripts" :key="script.id" class="script-card">
        <div class="card-header">
          <h3 class="script-name">{{ script.name }}</h3>
          <span class="script-tag">JavaScript</span>
        </div>
        <div class="card-body">
          <p class="script-desc">{{ script.description || '无详细描述' }}</p>
          <div class="script-meta">
            <span class="meta-item">📅 {{ formatDate(script.created_at) }}</span>
          </div>
        </div>
        <div class="card-footer">
          <button class="btn-text edit" @click="editScript(script.id)">编辑</button>
          <button class="btn-text delete" @click="confirmDelete(script)">删除</button>
        </div>
      </div>
    </div>

    <!-- 删除确认弹窗 -->
    <div v-if="showDeleteModal" class="modal-overlay">
      <div class="modal">
        <h3>确认删除？</h3>
        <p>确定要删除脚本 "{{ scriptToDelete?.name }}" 吗？此操作不可撤销。</p>
        <div class="modal-actions">
          <button class="btn-cancel" @click="showDeleteModal = false">取消</button>
          <button class="btn-danger" @click="handleDelete">确认删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { batchTaskAPI } from '@/api'
import { useDialog } from '../composables/useDialog.ts'
import { formatDate } from '@/utils'

const { showError } = useDialog()

const router = useRouter()
const scripts = ref([])
const loading = ref(true)
const searchQuery = ref('')
const showDeleteModal = ref(false)
const scriptToDelete = ref(null)

const fetchScripts = async () => {
  loading.value = true
  try {
    const response = await batchTaskAPI.getScripts()
    if (response.success) {
      scripts.value = response.scripts
    }
  } catch (err) {
    console.error('获取脚本失败:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchScripts()
})

const filteredScripts = computed(() => {
  if (!searchQuery.value) return scripts.value
  const query = searchQuery.value.toLowerCase()
  return scripts.value.filter(s => 
    s.name.toLowerCase().includes(query) || 
    (s.description && s.description.toLowerCase().includes(query))
  )
})

const createNewScript = () => {
  router.push('/scripts/new')
}

const editScript = (id) => {
  router.push(`/scripts/${id}`)
}

const confirmDelete = (script) => {
  scriptToDelete.value = script
  showDeleteModal.value = true
}

const handleDelete = async () => {
  if (!scriptToDelete.value) return
  try {
    const response = await batchTaskAPI.deleteScript(scriptToDelete.value.id)
    if (response.success) {
      scripts.value = scripts.value.filter(s => s.id !== scriptToDelete.value.id)
      showDeleteModal.value = false
    }
  } catch (err) {
    showError('删除失败: ' + err.message)
  }
}
</script>

<style scoped>
.script-list-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
}

.header-left h1 {
  font-size: 28px;
  margin: 0 0 8px 0;
  color: #1f2937;
}

.subtitle {
  color: #6b7280;
  margin: 0;
  font-size: 14px;
}

.btn-primary {
  padding: 10px 20px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
}

.btn-primary:hover {
  background: #2563eb;
  transform: translateY(-1px);
}

.filter-bar {
  margin-bottom: 24px;
  background: white;
  padding: 16px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.search-box {
  position: relative;
  max-width: 400px;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
}

.search-box input {
  width: 100%;
  padding: 10px 10px 10px 40px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  outline: none;
}

.script-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
}

.script-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
  transition: transform 0.2s;
}

.script-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 15px -1px rgba(0,0,0,0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.script-name {
  font-size: 18px;
  margin: 0;
  color: #111827;
}

.script-tag {
  background: #eff6ff;
  color: #1e40af;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}

.card-body {
  flex: 1;
  margin-bottom: 20px;
}

.script-desc {
  color: #4b5563;
  font-size: 14px;
  line-height: 1.5;
  margin-bottom: 16px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.script-meta {
  font-size: 12px;
  color: #9ca3af;
}

.card-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid #f3f4f6;
}

.btn-text {
  background: none;
  border: none;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
}

.btn-text.edit { color: #3b82f6; }
.btn-text.edit:hover { background: #eff6ff; }
.btn-text.delete { color: #ef4444; }
.btn-text.delete:hover { background: #fef2f2; }

.loading-state, .empty-state {
  text-align: center;
  padding: 80px 20px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f4f6;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-icon { font-size: 64px; margin-bottom: 24px; }
.btn-outline {
  padding: 10px 24px;
  background: white;
  border: 1px solid #3b82f6;
  color: #3b82f6;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 16px;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
}

.modal {
  background: white;
  padding: 32px;
  border-radius: 12px;
  max-width: 400px;
  width: 90%;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

.btn-cancel {
  padding: 8px 16px;
  border: 1px solid #d1d5db;
  background: white;
  border-radius: 6px;
  cursor: pointer;
}

.btn-danger {
  padding: 8px 16px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
</style>
