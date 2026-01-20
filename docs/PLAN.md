# UI-Eye 项目实施计划 (Implementation Plan)

本项目旨在通过视觉对比和 AI 分析，提升前端页面还原度的检测效率。以下是已完成的功能和后续计划。

## 1. 报告页面重构与优化 (已完成 ✅)

我们将复杂的 `Report.vue` 拆分为模块化组件，并优化了核心对比功能。

### 1.1 对比模式组件化
- [x] **ReportHeader**: 基础信息与相似度概览。
- [x] **ComparisonModeSelector**: 统一的对比模式切换器。
- [x] **SideBySideComparison**: 并排模式，支持缩放与差异统计展示。
- [x] **SliderComparison**: 拨杆模式，支持拖拽实时对比。
- [x] **OverlayComparison**: 重叠模式，支持透明度调节与渐变。
- [x] **DiffHighlightComparison**: 差异高亮模式，基于像素差异的红线图展示。

### 1.2 对比视图体验优化
- [x] **布局修正**: 解决了容器不居中、高度不统一、重叠模式错乱等 CSS 布局问题。
- [x] **统一交互**: 统一了所有模式的缩放控制栏样式与动画效果。
- [x] **区域定位 (Locate)**: 实现了从差异列表到视觉位置的动态追踪，支持脉冲标记效果。

## 2. 差异分析与修复建议 (已完成 ✅)

### 2.1 差异区域解析
- [x] **视图切换**: 支持卡片视图（直观分组）与表格视图（数据紧凑）切换。
- [x] **相似度指标**: 在表格视图中新增了区域相似度的可视化进度条展示。
- [x] **优先级过滤**: 支持按“关键/重要/次要/低”优先级动态过滤。

### 2.2 CSS 修复建议
- [x] **属性级 Diff**: 解析建议代码，精准标出新增（绿色）或修改（蓝色）的 CSS 属性。
- [x] **复制管理**: 支持单条代码复制及“一键复制所有建议”。
- [x] **表格优化**: 针对超长选择器和代码块优化了移动端与窄屏显示。

---

## 3. 后续待办事项 (ToDo ⏳)

### 3.1 体验微调
- [ ] **键盘支持**: 拨杆模式支持方向键微调滑块位置。
- [ ] **深色模式**: 针对报告页面整体适配深色主题样式。

### 3.2 智能化升级 (第二阶段)
- [ ] **差异聚类**: 
  - [ ] 后端实现 DBSCAN 聚类算法，减少琐碎差异点。
  - [ ] 前端实现 SVG 矩形包围盒覆盖层。
- [ ] **比对引擎升级**:
  - [ ] 集成 `odiff` 引擎提升对比速度。
  - [ ] 支持配置“抗锯齿忽略”和“透明度忽略”。
- [ ] **智能诊断**:
  - [ ] **智能吸附**: 自动对齐细微的位置偏离，判断是否为布局错位。
  - [ ] **一键预览**: 在浏览器中实时注入建议 CSS，支持所见即所得的预览。

---

## 项目结构概览

```
src/
└── components/
    └── report/
        ├── ReportHeader.vue
        ├── ComparisonModeSelector.vue
        ├── DiffRegionsSection.vue
        │   ├── DiffRegionsTable.vue
        │   └── DiffRegionsCards.vue
        ├── CSSFixesSection.vue
        │   ├── CSSFixesTable.vue
        │   └── CSSFixesCards.vue
        └── comparison/
            ├── SideBySideComparison.vue
            ├── SliderComparison.vue
            ├── OverlayComparison.vue
            └── DiffHighlightComparison.vue
```

> 本文档由 Antigravity 整理更新于 2026-01-14。
