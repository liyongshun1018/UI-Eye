/**
 * 对比配置组件
 * 配置对比引擎、AI模型等选项
 */
<template>
  <div class="compare-config">
    <div class="section-header">
      <h3 class="section-title">对比配置</h3>
      <p class="section-desc">配置视觉对比的引擎和选项</p>
    </div>

    <div class="config-form">
      <div class="form-item">
        <label class="form-label">对比引擎</label>
        <div class="radio-group">
          <label
            v-for="engine in engines"
            :key="engine.value"
            :class="['radio-option', { active: modelValue.engine === engine.value }]"
          >
            <input
              type="radio"
              :value="engine.value"
              :checked="modelValue.engine === engine.value"
              @change="handleEngineChange(engine.value)"
            />
            <span class="radio-label">{{ engine.label }}</span>
            <span class="radio-desc">{{ engine.desc }}</span>
          </label>
        </div>
      </div>

      <div class="form-item">
        <label class="form-label">AI 分析模型</label>
        <div class="radio-group">
          <label
            v-for="model in aiModels"
            :key="model.value"
            :class="['radio-option', { active: modelValue.aiModel === model.value }]"
          >
            <input
              type="radio"
              :value="model.value"
              :checked="modelValue.aiModel === model.value"
              @change="handleAIModelChange(model.value)"
            />
            <span class="radio-label">{{ model.label }}</span>
            <span class="radio-desc">{{ model.desc }}</span>
          </label>
        </div>
      </div>

      <div class="form-item">
        <label class="checkbox-wrapper">
          <input
            type="checkbox"
            :checked="modelValue.ignoreAntialiasing"
            @change="handleIgnoreAntialiasingChange"
          />
          <span class="checkbox-label">忽略抗锯齿差异</span>
          <span class="checkbox-desc">忽略由抗锯齿引起的细微像素差异</span>
        </label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { COMPARE_ENGINE, AI_MODEL } from '@/constants'

interface CompareConfig {
  engine: string
  aiModel: string
  ignoreAntialiasing: boolean
}

interface Props {
  modelValue: CompareConfig
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: CompareConfig]
}>()

const engines = [
  {
    value: COMPARE_ENGINE.RESEMBLE,
    label: 'Resemble.js',
    desc: '快速、准确，适合大多数场景'
  },
  {
    value: COMPARE_ENGINE.PIXELMATCH,
    label: 'PixelMatch',
    desc: '精确像素对比，适合高精度要求'
  }
]

const aiModels = [
  {
    value: AI_MODEL.SILICONFLOW,
    label: 'SiliconFlow',
    desc: '国内AI模型，速度快'
  },
  {
    value: AI_MODEL.OPENAI,
    label: 'OpenAI',
    desc: '国际AI模型，分析准确'
  },
  {
    value: AI_MODEL.NONE,
    label: '不使用AI',
    desc: '仅进行像素对比'
  }
]

const handleEngineChange = (engine: string) => {
  emit('update:modelValue', {
    ...props.modelValue,
    engine
  })
}

const handleAIModelChange = (aiModel: string) => {
  emit('update:modelValue', {
    ...props.modelValue,
    aiModel
  })
}

const handleIgnoreAntialiasingChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', {
    ...props.modelValue,
    ignoreAntialiasing: target.checked
  })
}
</script>

<style scoped>
.compare-config {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.section-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.section-desc {
  margin: 0;
  font-size: 14px;
  color: #999;
}

.config-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-label {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.radio-option {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 16px;
  border: 2px solid #e8e8e8;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.radio-option:hover {
  border-color: #1677ff;
  background: #f0f7ff;
}

.radio-option.active {
  border-color: #1677ff;
  background: #e6f4ff;
}

.radio-option input[type="radio"] {
  display: none;
}

.radio-label {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.radio-desc {
  font-size: 12px;
  color: #999;
}

.checkbox-wrapper {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 16px;
  border: 2px solid #e8e8e8;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.checkbox-wrapper:hover {
  border-color: #1677ff;
  background: #f0f7ff;
}

.checkbox-wrapper input[type="checkbox"] {
  display: none;
}

.checkbox-wrapper input[type="checkbox"]:checked + .checkbox-label::before {
  background: #1677ff;
  border-color: #1677ff;
}

.checkbox-wrapper input[type="checkbox"]:checked + .checkbox-label::after {
  opacity: 1;
}

.checkbox-label {
  position: relative;
  padding-left: 28px;
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.checkbox-label::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  border: 2px solid #d9d9d9;
  border-radius: 4px;
  transition: all 0.2s;
}

.checkbox-label::after {
  content: '';
  position: absolute;
  left: 6px;
  top: 50%;
  transform: translateY(-50%) rotate(45deg);
  width: 6px;
  height: 10px;
  border: 2px solid #fff;
  border-top: none;
  border-left: none;
  opacity: 0;
  transition: opacity 0.2s;
}

.checkbox-desc {
  padding-left: 28px;
  font-size: 12px;
  color: #999;
}
</style>
