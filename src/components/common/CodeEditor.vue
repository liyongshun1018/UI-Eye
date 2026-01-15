<template>
  <div class="code-editor-wrapper" :class="{ 'theme-dark': dark, 'theme-light': !dark }">
    <div class="editor-toolbar">
      <div class="toolbar-left">
        <slot name="toolbar">
          <span class="editor-lang-tag">JavaScript (Playwright)</span>
        </slot>
      </div>
      <div class="toolbar-right">
        <button class="btn-tool" @click="toggleWhitespace" :title="showWhitespace ? '隐藏空格' : '显示空格'">
          {{ showWhitespace ? '·' : '␣' }}
        </button>
        <button class="btn-copy" @click="copyCode">{{ copyStatus }}</button>
      </div>
    </div>
    <div class="code-editor-container" ref="editorRef"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { EditorState, Compartment } from '@codemirror/state'
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, drawSelection, dropCursor, highlightSpecialChars } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'
import { bracketMatching, indentOnInput, syntaxHighlighting, defaultHighlightStyle, foldGutter, foldKeymap } from '@codemirror/language'
import { autocompletion, completionKeymap } from '@codemirror/autocomplete'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: '在此输入代码...'
  },
  readonly: {
    type: Boolean,
    default: false
  },
  dark: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

const editorRef = ref(null)
const copyStatus = ref('复制')
const showWhitespace = ref(false)
let view = null

const themeConfig = new Compartment()
const whitespaceConfig = new Compartment()

onMounted(() => {
  const startState = EditorState.create({
    doc: props.modelValue,
    extensions: [
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightSpecialChars(),
      history(),
      foldGutter(),
      drawSelection(),
      dropCursor(),
      EditorState.allowMultipleSelections.of(true),
      indentOnInput(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      bracketMatching(),
      autocompletion(),
      highlightSelectionMatches(),
      javascript(),
      themeConfig.of(props.dark ? oneDark : []),
      whitespaceConfig.of([]),
      EditorView.lineWrapping,
      keymap.of([
        ...defaultKeymap,
        ...historyKeymap,
        ...completionKeymap,
        ...foldKeymap,
        ...searchKeymap
      ]),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const value = update.state.doc.toString()
          emit('update:modelValue', value)
          emit('change', value)
        }
      }),
      EditorState.readOnly.of(props.readonly),
      EditorView.baseTheme({
        "&": { height: "100%", fontSize: "14px" },
        ".cm-scroller": { overflow: "auto" },
        ".cm-gutters": { border: "none" }
      })
    ]
  })

  view = new EditorView({
    state: startState,
    parent: editorRef.value
  })
})

onBeforeUnmount(() => {
  if (view) {
    view.destroy()
  }
})

// 增强功能：切换可见空格 (简单实现：通过注入高亮规则)
const toggleWhitespace = () => {
  showWhitespace.value = !showWhitespace.value
  if (!view) return
  
  // CM6 中显示空格通常通过特定的装饰器或配置，这里我们使用 highlightSpecialChars 的自定义实现
  // 为了简单演示，我们通过重载主题配置来改变空格的视觉呈现
  const extension = showWhitespace.value 
    ? [EditorView.theme({
        ".cm-content .cm-line": { 
          backgroundImage: "radial-gradient(circle, #475569 1px, transparent 1px)",
          backgroundSize: "1ch 100%",
          backgroundRepeat: "repeat-x"
        }
      })]
    : []
    
  view.dispatch({
    effects: whitespaceConfig.reconfigure(extension)
  })
}

// 监听外部对 modelValue 的更改
watch(() => props.modelValue, (newValue) => {
  if (view && newValue !== view.state.doc.toString()) {
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: newValue }
    })
  }
})

// 监听主题切换
watch(() => props.dark, (isDark) => {
  if (view) {
    view.dispatch({
      effects: themeConfig.reconfigure(isDark ? oneDark : [])
    })
  }
})

const copyCode = () => {
  const code = view.state.doc.toString()
  navigator.clipboard.writeText(code).then(() => {
    copyStatus.value = '已复制'
    setTimeout(() => { copyStatus.value = '复制' }, 2000)
  })
}
</script>

<style scoped>
.code-editor-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
}

.theme-dark {
  background: #1e293b;
  border-color: #334155;
}

.editor-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  z-index: 10;
}

.theme-dark .editor-toolbar {
  background: #475569;
  border-bottom-color: #64748b;
}

.toolbar-right {
  display: flex;
  gap: 8px;
}

.editor-lang-tag {
  font-size: 12px;
  color: #64748b;
  font-weight: 600;
}

.theme-dark .editor-lang-tag {
  color: #f1f5f9;
}

.btn-tool, .btn-copy {
  padding: 4px 12px;
  font-size: 12px;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s;
}

.theme-dark .btn-tool, .theme-dark .btn-copy {
  background: #64748b;
  border-color: #94a3b8;
  color: #f8fafc;
}

.btn-tool:hover, .btn-copy:hover {
  background: #f1f5f9;
  border-color: #3b82f6;
  color: #3b82f6;
}

.theme-dark .btn-tool:hover, .theme-dark .btn-copy:hover {
  background: #64748b;
  border-color: #3b82f6;
}

.code-editor-container {
  flex: 1;
  width: 100%;
  font-family: 'Fira Code', 'Monaco', 'Menlo', monospace;
  font-size: 14px;
  overflow: hidden;
}

:deep(.cm-editor) {
  height: 100%;
  outline: none !important;
}

:deep(.cm-content) {
  padding: 16px 0;
}

:deep(.cm-gutters) {
  background-color: transparent !important;
  color: #94a3b8 !important;
}

.theme-dark :deep(.cm-gutters) {
  color: #64748b !important;
}

:deep(.cm-activeLineGutter) {
  background-color: #f1f5f9 !important;
  color: #1e293b !important;
}

.theme-dark :deep(.cm-activeLineGutter) {
  background-color: #334155 !important;
  color: #f8fafc !important;
}

/* 显示特殊字符样式 */
:deep(.cm-specialChar) {
  color: #ef4444;
}
</style>
