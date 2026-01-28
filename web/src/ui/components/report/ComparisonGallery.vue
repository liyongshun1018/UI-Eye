<template>
  <div class="image-comparison card glass compact">
    <ComparisonModeSelector
      v-model="internalMode"
      :modes="comparisonModes"
      title="视觉对比"
    />
    
    <div class="comparison-container">
      <!-- 模式 1: 并排对比 -->
      <SideBySideComparison
        v-if="internalMode === 'side-by-side'"
        :design-image="reportData.images.design"
        :actual-image="reportData.images.actual"
        :diff-pixels="reportData.diffPixels"
        :similarity="reportData.similarity"
      />
      
      <!-- 模式 2: 重叠对比（Overlay） -->
      <OverlayComparison
        v-else-if="internalMode === 'overlay'"
        :design-image="reportData.images.design"
        :actual-image="reportData.images.actual"
      />
      
      <!-- 模式 3: 拨杆对比（Slider） -->
      <SliderComparison
        v-else-if="internalMode === 'slider'"
        :design-image="reportData.images.design"
        :actual-image="reportData.images.actual"
      />
      
      <!-- 模式 4: 差异高亮 -->
      <DiffHighlightComparison
        v-else-if="internalMode === 'diff'"
        :diff-image="reportData.diffImage?.annotatedUrl || reportData.images.diff"
        :diff-pixels="reportData.diffPixels"
        :similarity="reportData.similarity"
        :regions="reportData.diffRegions"
        :highlight-region="selectedRegion"
        @clear="$emit('update:selectedRegion', null)"
        @locate="$emit('locate', $event)"
      />
      
      <!-- 原始差异图（可选查看） -->
      <div class="original-diff-toggle">
        <button class="btn btn-secondary btn-sm" @click="showOriginalDiff = !showOriginalDiff" style="margin-top: 1rem;">
          {{ showOriginalDiff ? '隐藏' : '查看' }}像素级差异图
        </button>
        <div v-if="showOriginalDiff" class="original-diff-image">
          <img :src="reportData.images.diff" alt="像素级差异图" class="comparison-image" />
          <p class="diff-description">红色区域标注了所有像素级差异点</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * ComparisonGallery.vue - 视觉对比画廊核心
 * 
 * 职责：
 * 1. 模式调度：集成了“并排”、“拨杆”、“重叠”、“差异高亮”四种专业展示模式。
 * 2. 状态联动：处理模式切换时的数据重置（如：离开高亮模式时自动清除选中的区域）。
 * 3. 资源分流：根据当前激活模式，向子组件分发对应的设计稿与实测图 URL。
 */
import { ref, watch } from 'vue'
import ComparisonModeSelector from './ComparisonModeSelector.vue'
import SideBySideComparison from './comparison/SideBySideComparison.vue'
import SliderComparison from './comparison/SliderComparison.vue'
import OverlayComparison from './comparison/OverlayComparison.vue'
import DiffHighlightComparison from './comparison/DiffHighlightComparison.vue'

const props = defineProps({
  // 核心报告数据集
  reportData: { type: Object, required: true },
  // v-model 绑定的当前模式
  modelValue: { type: String, default: 'side-by-side' },
  // v-model 绑定的当前选中/高亮的差异区域
  selectedRegion: { type: Object, default: null }
})

const emit = defineEmits(['update:modelValue', 'update:selectedRegion', 'locate'])

/** 内部驱动状态：控制当前展示的具体模式 */
const internalMode = ref(props.modelValue)

/** 控制是否展开像素级原始差异图 */
const showOriginalDiff = ref(false)

/** 
 * 对比模式配置定义
 * 包含 Label（文本）、Value（路由/标识）、Icon（展示图标）
 */
const comparisonModes = [
  { label: '并排对比', value: 'side-by-side', icon: '⚖️' },
  { label: '拨杆对比', value: 'slider', icon: '↔️' },
  { label: '重叠对比', value: 'overlay', icon: '🔄' },
  { label: '差异高亮', value: 'diff', icon: '🎯' }
]

// 数据双向同步：外部 Props -> 内部 State
watch(() => props.modelValue, (val) => { internalMode.value = val })

// 数据双向同步：内部 State -> 外部事件 Emit
watch(internalMode, (val) => { 
  emit('update:modelValue', val)
  /**
   * 鲁棒性控制：
   * 当用户切离“差异高亮”模式时，自动由组件内部触发表单重置，
   * 确保 selectedRegion 状态不会残留在父组件中，避免视觉上的误导。
   */
  if (val !== 'diff') {
    emit('update:selectedRegion', null)
  }
})
</script>

<style scoped>
.image-comparison {
  margin-bottom: var(--spacing-lg);
  padding: var(--spacing-lg);
  position: relative;
}

.comparison-container {
  margin-top: var(--spacing-md);
}

.original-diff-toggle {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
  margin-top: var(--spacing-xl);
  padding-top: var(--spacing-lg);
  border-top: 1px dashed var(--border-color);
}

.original-diff-image {
  max-width: 100%;
  margin-top: var(--spacing-md);
  text-align: center;
}

.comparison-image {
  max-width: 100%;
  border-radius: var(--radius-sm);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  border: 1px solid var(--border-color);
}

.diff-description {
  margin-top: 12px;
  font-size: 14px;
  color: var(--text-tertiary);
}
</style>
