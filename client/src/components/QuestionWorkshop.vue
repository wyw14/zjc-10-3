<template>
  <div class="workshop-container">
    <div class="workshop-header">
      <h2>🛠️ 题目工坊</h2>
      <p class="subtitle">管理你的题库，新增、编辑或停用题目</p>
      <div class="stats-row">
        <div class="mini-stat">
          <span class="mini-num">{{ questions.length }}</span>
          <span class="mini-label">总题数</span>
        </div>
        <div class="mini-stat green">
          <span class="mini-num">{{ activeCount }}</span>
          <span class="mini-label">启用中</span>
        </div>
        <div class="mini-stat gray">
          <span class="mini-num">{{ inactiveCount }}</span>
          <span class="mini-label">已停用</span>
        </div>
      </div>
    </div>

    <div class="action-bar">
      <button class="btn-primary" @click="openAddModal">
        ➕ 新增题目
      </button>
      <div class="filter-tabs">
        <button
          class="filter-btn"
          :class="{ active: filter === 'all' }"
          @click="filter = 'all'"
        >
          全部
        </button>
        <button
          class="filter-btn"
          :class="{ active: filter === 'active' }"
          @click="filter = 'active'"
        >
          启用
        </button>
        <button
          class="filter-btn"
          :class="{ active: filter === 'inactive' }"
          @click="filter = 'inactive'"
        >
          停用
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading-inner">加载中...</div>

    <div v-else class="question-list">
      <div
        v-for="q in filteredQuestions"
        :key="q.id"
        class="question-card"
        :class="{ inactive: !q.active }"
      >
        <div class="q-id">#{{ q.id }}</div>
        <div class="q-content">
          <div class="q-text">{{ q.question }}</div>
          <div class="q-meta">
            <span class="meta-item">
              <span class="meta-label">最近使用：</span>
              <span class="meta-value">{{ q.lastUsedDate || '从未使用' }}</span>
            </span>
            <span class="meta-item">
              <span class="meta-label">状态：</span>
              <span class="meta-value" :class="q.active ? 'status-active' : 'status-inactive'">
                {{ q.active ? '✓ 启用中' : '✗ 已停用' }}
              </span>
            </span>
          </div>
        </div>
        <div class="q-actions">
          <button class="action-btn edit" @click="openEditModal(q)" title="编辑">
            ✏️
          </button>
          <button
            class="action-btn toggle"
            :class="q.active ? 'deactivate' : 'activate'"
            @click="toggleQuestion(q)"
            :title="q.active ? '停用' : '启用'"
          >
            {{ q.active ? '⏸️' : '▶️' }}
          </button>
        </div>
      </div>

      <div v-if="filteredQuestions.length === 0" class="empty-state">
        暂无符合条件的题目
      </div>
    </div>

    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <h3>{{ editingId ? '编辑题目' : '新增题目' }}</h3>
        <textarea
          v-model="questionInput"
          class="modal-textarea"
          placeholder="请输入题目内容..."
          rows="4"
          @keydown.ctrl.enter="saveQuestion"
        ></textarea>
        <div class="modal-actions">
          <button class="btn-secondary" @click="closeModal">取消</button>
          <button
            class="btn-primary"
            @click="saveQuestion"
            :disabled="saving || !questionInput.trim()"
          >
            {{ saving ? '保存中...' : '💾 保存' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const emit = defineEmits(['toast'])

const questions = ref([])
const loading = ref(false)
const filter = ref('all')
const showModal = ref(false)
const editingId = ref(null)
const questionInput = ref('')
const saving = ref(false)

const activeCount = computed(() => questions.value.filter(q => q.active).length)
const inactiveCount = computed(() => questions.value.filter(q => !q.active).length)

const filteredQuestions = computed(() => {
  if (filter.value === 'active') {
    return questions.value.filter(q => q.active)
  } else if (filter.value === 'inactive') {
    return questions.value.filter(q => !q.active)
  }
  return questions.value
})

function showToast(message, isError = false) {
  emit('toast', message, isError)
}

async function loadQuestions() {
  loading.value = true
  try {
    const res = await fetch('/api/question-bank')
    const json = await res.json()
    if (json.success) {
      questions.value = json.data
    } else {
      showToast('加载题目列表失败', true)
    }
  } catch (e) {
    showToast('网络错误', true)
  } finally {
    loading.value = false
  }
}

function openAddModal() {
  editingId.value = null
  questionInput.value = ''
  showModal.value = true
}

function openEditModal(q) {
  editingId.value = q.id
  questionInput.value = q.question
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingId.value = null
  questionInput.value = ''
}

async function saveQuestion() {
  if (!questionInput.value.trim()) return
  saving.value = true
  try {
    let res
    if (editingId.value) {
      res = await fetch(`/api/question-bank/${editingId.value}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: questionInput.value })
      })
    } else {
      res = await fetch('/api/question-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: questionInput.value })
      })
    }
    const json = await res.json()
    if (json.success) {
      showToast(editingId.value ? '题目已更新 ✓' : '题目已添加 ✓')
      closeModal()
      await loadQuestions()
    } else {
      showToast(json.message || '保存失败', true)
    }
  } catch (e) {
    showToast('网络错误', true)
  } finally {
    saving.value = false
  }
}

async function toggleQuestion(q) {
  try {
    const res = await fetch(`/api/question-bank/${q.id}/toggle`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' }
    })
    const json = await res.json()
    if (json.success) {
      showToast(q.active ? '题目已停用' : '题目已启用')
      await loadQuestions()
    } else {
      showToast(json.message || '操作失败', true)
    }
  } catch (e) {
    showToast('网络错误', true)
  }
}

onMounted(() => {
  loadQuestions()
})
</script>

<style scoped>
.workshop-container {
  padding: 0;
}

.workshop-header {
  text-align: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e2e8f0;
}

.workshop-header h2 {
  font-size: 1.8rem;
  color: #2d3748;
  margin-bottom: 8px;
}

.subtitle {
  color: #718096;
  margin-bottom: 20px;
}

.stats-row {
  display: flex;
  justify-content: center;
  gap: 30px;
}

.mini-stat {
  text-align: center;
  padding: 10px 20px;
  background: #f7fafc;
  border-radius: 10px;
  min-width: 80px;
}

.mini-stat.green {
  background: linear-gradient(135deg, #c6f6d5 0%, #9ae6b4 100%);
}

.mini-stat.gray {
  background: #edf2f7;
}

.mini-num {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
  color: #2d3748;
}

.mini-label {
  font-size: 0.8rem;
  color: #718096;
}

.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 15px;
}

.btn-primary {
  padding: 10px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(118, 75, 162, 0.3);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  padding: 10px 24px;
  background: #e2e8f0;
  color: #4a5568;
  border: none;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-secondary:hover {
  background: #cbd5e0;
}

.filter-tabs {
  display: flex;
  gap: 5px;
  background: #f7fafc;
  padding: 5px;
  border-radius: 10px;
}

.filter-btn {
  padding: 8px 16px;
  background: transparent;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  color: #718096;
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-btn.active {
  background: white;
  color: #764ba2;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.loading-inner {
  text-align: center;
  padding: 40px;
  color: #a0aec0;
}

.question-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.question-card {
  display: flex;
  align-items: flex-start;
  gap: 15px;
  padding: 18px;
  background: #fafbfc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  transition: all 0.2s ease;
}

.question-card:hover {
  border-color: #cbd5e0;
  background: #f7fafc;
}

.question-card.inactive {
  opacity: 0.6;
  background: #edf2f7;
}

.q-id {
  flex-shrink: 0;
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 10px;
  font-weight: 700;
  font-size: 0.9rem;
}

.question-card.inactive .q-id {
  background: #a0aec0;
}

.q-content {
  flex: 1;
  min-width: 0;
}

.q-text {
  font-size: 1rem;
  font-weight: 600;
  color: #2d3748;
  line-height: 1.5;
  margin-bottom: 10px;
  word-break: break-word;
}

.q-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  font-size: 0.85rem;
}

.meta-item {
  color: #718096;
}

.meta-label {
  color: #a0aec0;
}

.meta-value.status-active {
  color: #38a169;
  font-weight: 600;
}

.meta-value.status-inactive {
  color: #e53e3e;
  font-weight: 600;
}

.q-actions {
  flex-shrink: 0;
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn.edit {
  background: #bee3f8;
}

.action-btn.edit:hover {
  background: #90cdf4;
  transform: scale(1.05);
}

.action-btn.toggle.deactivate {
  background: #fed7d7;
}

.action-btn.toggle.deactivate:hover {
  background: #feb2b2;
  transform: scale(1.05);
}

.action-btn.toggle.activate {
  background: #c6f6d5;
}

.action-btn.toggle.activate:hover {
  background: #9ae6b4;
  transform: scale(1.05);
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #a0aec0;
  background: #f7fafc;
  border-radius: 12px;
  border: 2px dashed #e2e8f0;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

.modal {
  background: white;
  padding: 30px;
  border-radius: 16px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease;
}

.modal h3 {
  color: #2d3748;
  margin-bottom: 20px;
  font-size: 1.3rem;
}

.modal-textarea {
  width: 100%;
  padding: 15px;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  font-size: 1rem;
  font-family: inherit;
  line-height: 1.6;
  resize: vertical;
  transition: border-color 0.2s ease;
  margin-bottom: 20px;
}

.modal-textarea:focus {
  outline: none;
  border-color: #764ba2;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
