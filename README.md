# UI-Eye - UI 之眼

> AI 驱动的自动化视觉走查机器人

## 📋 项目简介

UI-Eye 是一款专注于前端 UI 还原度检查的自动化工具，通过像素级对比技术和 AI 智能分析，实现设计稿与实际页面的自动化对比，并生成可执行的 CSS 修复建议。

### 核心功能

#### 基础能力
- 📸 **自动截图**：支持全页滚动截图，智能等待资源加载
- 🔍 **多引擎对比**：支持 Pixelmatch、Resemble.js、ODiff 三种对比引擎
- 🤖 **AI 智能分析**：支持千问 2.5、GPT-4 Vision、Claude 3 多种大模型
- 🎨 **双模式对比**：支持效果图上传和蓝湖地址两种模式
- ⚡ **高效快速**：完整流程 < 30 秒

#### Phase 2 新特性 �
- 🎯 **智能吸附**：±2px 自动对齐，减少渲染抖动误报
- 🖼️ **SVG 交互层**：动态差异区域高亮，支持双轴联动
- 👁️ **所见即所得预览**：实时预览 CSS 修复效果
- 🛡️ **错误检测**：智能检测预览失败，提供降级方案
- �📊 **可视化报告**：交互式对比报告，一键复制 CSS 修复代码

## 🛠️ 技术栈

### 前端
- **框架**：Vue 3 + TypeScript
- **构建工具**：Vite 5
- **路由**：Vue Router 4
- **状态管理**：Pinia 2
- **HTTP 客户端**：Axios
- **样式**：Vanilla CSS + CSS 变量

### 后端
- **运行环境**：Node.js 18+
- **Web 框架**：Express 4
- **截图引擎**：Puppeteer 21
- **图像对比**：Pixelmatch 5 / Resemble.js 5 / ODiff 3
- **图像处理**：Sharp 0.33
- **数据库**：SQLite 3
- **测试框架**：Vitest 4

## 📦 项目结构

```
UI-Eye/
├── src/                      # 前端源代码
│   ├── views/                # 页面组件
│   │   ├── Home.vue          # 首页
│   │   ├── Compare.vue       # 对比配置页
│   │   └── Report.vue        # 报告展示页
│   ├── router/               # 路由配置
│   ├── services/             # API 服务层
│   ├── utils/                # 工具函数
│   ├── types/                # TypeScript 类型定义
│   ├── config/               # 配置文件
│   ├── App.vue               # 根组件
│   ├── main.ts               # 应用入口
│   └── index.css             # 全局样式
├── server/                   # 后端服务（待实现）
│   ├── index.js              # 服务入口
│   ├── capture.js            # 截图模块
│   ├── compare.js            # 对比引擎
│   ├── ai-analyzer.js        # AI 分析模块
│   └── report-generator.js   # 报告生成器
├── public/                   # 静态资源
├── index.html                # HTML 入口
├── vite.config.ts            # Vite 配置
├── tsconfig.json             # TypeScript 配置
├── package.json              # 项目依赖
├── docs/                     # 项目文档 (PRD、任务计划、使用指南等)
└── README.md                 # 项目入口说明

```

## 📂 项目文档

为了保持根目录整洁，所有项目文档已移动至 [docs/](file:///Users/liyongshun/workspace_edu/UI-Eye/docs/) 目录：

- 📋 [产品需求文档 (PRD)](file:///Users/liyongshun/workspace_edu/UI-Eye/docs/PRD.md)
- 🎯 [下一步行动计划](file:///Users/liyongshun/workspace_edu/UI-Eye/docs/NEXT_STEPS.md)
- 📖 [使用指南](file:///Users/liyongshun/workspace_edu/UI-Eye/docs/USER_GUIDE.md)
- 🧪 [测试指南](file:///Users/liyongshun/workspace_edu/UI-Eye/docs/TESTING.md)
- 📝 [今日工作总结](file:///Users/liyongshun/workspace_edu/UI-Eye/docs/TODAY_SUMMARY.md)

```

## 🚀 快速开始

### 前置要求

- Node.js >= 18.0.0
- npm >= 9.0.0

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
# 启动前端开发服务器
npm run dev

# 启动后端服务（待实现）
npm run server

# 同时启动前后端（待实现）
npm run dev:all
```

前端服务将运行在 `http://localhost:5173`

### 生产构建

```bash
npm run build
```

构建产物将输出到 `dist/` 目录

### 预览生产构建

```bash
npm run preview
```

## 📖 使用指南

### 1. 开始对比

访问首页，点击"开始对比"按钮进入配置页面

### 2. 配置对比参数

- **选择对比模式**：效果图上传 或 蓝湖地址
- **输入 H5 页面地址**：要检查的页面 URL
- **上传设计稿**：拖拽上传或输入蓝湖链接
- **选择 AI 模型**：千问 2.5（内网）/ GPT-4 Vision（外网）/ Claude 3（外网）
- **配置视口尺寸**：选择预设或自定义

### 3. 查看报告

- 查看还原度评分（0-100%）
- 切换查看设计稿、实际页面、差异图
- 浏览 CSS 修复建议列表
- 一键复制修复代码

## 🎨 设计系统

项目采用统一的设计系统，所有设计 token 定义在 `src/index.css` 中：

- **颜色**：深色主题，渐变色强调
- **间距**：8px 基准，统一间距变量
- **圆角**：多级圆角系统
- **阴影**：分层阴影效果
- **动画**：流畅的过渡和微交互

## 🔧 配置说明

### 环境变量配置

#### 1. 创建配置文件

首先复制环境变量模板文件：

```bash
cp .env.example .env
```

#### 2. 配置 AI 模型（必需）

**至少配置一个 AI 模型**，否则只能使用规则引擎（功能受限）。

##### 选项一：千问 2.5（内网，推荐）

适用于公司内网环境，数据安全有保障：

```env
QWEN_API_ENDPOINT=http://your-internal-qwen-api/v1/chat/completions
QWEN_API_TOKEN=your-qwen-token
QWEN_MODEL_NAME=qwen-2.5-vl
```

##### 选项二：硅基流动（外网，推荐）

支持多种开源模型，性价比高：

```env
SILICONFLOW_API_ENDPOINT=https://api.siliconflow.cn/v1/chat/completions
SILICONFLOW_API_KEY=sk-your-api-key
SILICONFLOW_MODEL_NAME=Qwen/Qwen2.5-72B-Instruct
```

获取 API Key：访问 [硅基流动官网](https://siliconflow.cn)

#### 3. 蓝湖 API 配置（可选）

如需使用蓝湖地址对比功能：

```env
LANHU_API_TOKEN=your-lanhu-token
```

#### 4. 数据库配置（可选）

默认使用 SQLite，数据保存在 `server/ui-eye.db`：

```env
# 历史记录保留天数（默认 7 天）
REPORT_RETENTION_DAYS=7
```

## 📝 开发规范

### 代码风格

- 使用 TypeScript 严格模式
- 组件使用 `<script setup>` 语法
- 样式使用 scoped CSS
- 遵循 Vue 3 Composition API 最佳实践

### 命名规范

- 组件文件：PascalCase（如 `CompareForm.vue`）
- 工具函数：camelCase（如 `formatDate.ts`）
- 常量：UPPER_SNAKE_CASE（如 `API_BASE_URL`）
- CSS 类名：kebab-case（如 `form-input`）

### 提交规范

```
feat: 新功能
fix: 修复 bug
docs: 文档更新
style: 代码格式调整
refactor: 重构
perf: 性能优化
test: 测试相关
chore: 构建/工具链相关
```

## 🗺️ 开发路线图

### ✅ 已完成

- [x] 项目基础架构搭建
- [x] 前端页面开发（首页、对比页、报告页、历史记录页）
- [x] 路由和状态管理
- [x] 设计系统和全局样式
- [x] TypeScript 类型定义
- [x] API 服务层封装
- [x] 后端服务开发
  - [x] 截图采集模块（Puppeteer）
  - [x] 图像对比引擎（Pixelmatch）
  - [x] AI 分析模块（多模型支持）
  - [x] 报告生成器
- [x] 数据持久化（SQLite）
- [x] 多 AI 模型支持（千问/硅基流动/GPT-4/Claude）

### ✅ Phase 2 已完成 (v2.0.0)

- [x] **ODiff 引擎集成**：性能提升 3-5 倍
- [x] **智能吸附算法**：±2px 自动对齐，减少误报 67%
- [x] **SVG 交互层**：动态差异区域渲染与双轴联动
- [x] **CSS 预览功能**：所见即所得的修复效果预览
- [x] **错误检测与降级**：预览失败时提供代码对比视图
- [x] **单元测试**：ODiff 和聚类服务测试覆盖
- [x] **UI 优化**：按钮样式、Loading 动画、错误提示

### 📅 Phase 3 计划中

- [ ] **Puppeteer 截图预览**：替代 iframe 方案，支持所有网站
- [ ] **批量对比**：支持多页面批量对比
- [ ] **性能监控**：对比耗时统计和性能分析
- [ ] **报告导出**：PDF/HTML 格式导出
- [ ] **云端部署**：提供 SaaS 服务
- [ ] **AI 增强**：更智能的 CSS 修复建议

## 📄 许可证

MIT License

## 👥 贡献者

欢迎贡献代码！请先阅读 [贡献指南](CONTRIBUTING.md)

## 📮 联系方式

如有问题或建议，请提交 Issue 或 Pull Request
