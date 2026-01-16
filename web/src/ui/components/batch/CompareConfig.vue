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

<script setup>
/**
 * 对比配置组件
 * 
 * @description 用于配置视觉对比的核心参数，包括对比引擎的选择、AI 分析模型的指定以及像素级对比细节（如抗锯齿忽略）。
 * 
 * @typedef {Object} CompareConfig - 对比配置项
 * @property {string} engine - 使用的对比引擎: 'resemble' | 'pixelmatch'
 * @property {string} aiModel - 使用的 AI 分析模型: 'siliconflow' | 'openai' | 'none'
 * @property {boolean} ignoreAntialiasing - 是否忽略抗锯齿差异
 * 
 * @property {CompareConfig} modelValue - 组件绑定的配置数据 (v-model)
 */
import { COMPARE_ENGINE, AI_MODEL } from '@core/constants'

const props = defineProps({
  // 对比配置对象
  modelValue: {
    type: Object,
    required: true,
    default: () => ({
      engine: 'resemble',
      aiModel: 'none',
      ignoreAntialiasing: true
    })
  }
})

const emit = defineEmits(['update:modelValue'])

/**
 * 可用的对比引擎选项
 */
const engines = [
  {
    value: COMPARE_ENGINE.RESEMBLE,
    label: 'Resemble.js',
    desc: '基于 Canvas 的快速对比，误差容忍度高，适合大多数 Web 页面'
  },
  {
    value: COMPARE_ENGINE.PIXELMATCH,
    label: 'PixelMatch',
    desc: '极速、精确的像素点对比，适合对精度要求极高的静态图验证'
  }
]

/**
 * 可用的 AI 分析模型选项
 */
const aiModels = [
  {
    value: AI_MODEL.SILICONFLOW,
    label: 'SiliconFlow (推荐)',
    desc: '国内高速推理集群提供商，延迟低，适合快速生成视觉报告'
  },
  {
    value: AI_MODEL.OPENAI,
    label: 'OpenAI (GPT-4o)',
    desc: '国际领先模型，语义理解能力最强，能更准确识别 UI 逻辑差异'
  },
  {
    value: AI_MODEL.NONE,
    label: '不使用 AI 辅助',
    desc: '仅展示像素级色值差异，不提供具体的 CSS 或结构化修复建议'
  }
]

/**
 * 切换对比引擎
 * @param {string} engine 
 */
const handleEngineChange = (engine) => {
  emit('update:modelValue', {
    ...props.modelValue,
    engine
  })
}

/**
 * 切换 AI 模型
 * @param {string} aiModel 
 */
const handleAIModelChange = (aiModel) => {
  emit('update:modelValue', {
    ...props.modelValue,
    aiModel
  })
}

/**
 * 切换抗锯齿忽略状态
 * @param {Event} event 
 */
const handleIgnoreAntialiasingChange = (event) => {
  emit('update:modelValue', {
    ...props.modelValue,
    ignoreAntialiasing: event.target.checked
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
