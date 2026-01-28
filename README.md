# UI-Eye - UI 之眼

> AI 驱动的自动化视觉走查机器人

## 📋 项目简介

UI-Eye 是一款专注于前端 UI 还原度检查的自动化工具。通过像素级对比技术和 AI 智能分析，实现设计稿与实际页面的自动化对比，并生成可执行的 CSS 修复建议。

本项目已完成全量 **TypeScript 迁移**，并采用 **DDD (领域驱动设计)** 架构重构，提供更强大的高性能并发处理能力和实时进度追踪。

### 核心功能

#### 基础能力
- 📸 **自动截图**：基于 Playwright 驱动，支持全页滚动截图，智能等待资源加载及视口自适应。
- 🔍 **多引擎对比**：支持 ODiff (Rust 核心)、Pixelmatch、Resemble.js 三种对比引擎，性能极佳。
- 🤖 **AI 智能分析**：集成阿里通义千问 (Qwen-VL)、硅基流动 (SiliconFlow) 等多模态大模型。
- 🎨 **多源适配**：支持本地设计稿上传、蓝湖地址同步、Chrome 插件实时取色比对。
- ⚡ **极致性能**：ODiff 像素扫描 + Sharp 图像预处理，完整流程 < 20 秒。

#### 高级特性 (Phase 3 已就绪)
- 📊 **批量审计**：支持大规模多链接自动扫描，具备设计稿视口智能对齐与物理裁剪技术，实时 WebSocket 进度推送。
- 🧩 **Chrome 插件**：直接在开发环境点选元素，AI 实时诊断视觉偏差并提供修复方案。
- 🎯 **智能区域聚类**：将散乱的像素差异自动聚合为“人类可理解”的布局/组件区块。
- 👁️ **实时预览**：在报告中直接应用 CSS 修复建议，所见即所得。

## 🛠️ 技术栈

### 前端 (Web & Extension)
- **框架**：Vue 3 + TypeScript
- **构建工具**：Vite 5
- **通信**：Axios + WebSocket (实时任务追踪)
- **样式**：Vanilla CSS (CSS 变量 + 响应式布局)

### 后端 (Node.js)
- **核心架构**：TypeScript + DDD (Application, Domain, Infrastructure, Interfaces)
- **容器驱动**：依赖注入 (Inversion of Control)
- **截图引擎**：Playwright (无头浏览器) - 具备更强的稳定性与多设备模拟能力
- **图像引擎**：ODiff (Rust) + Sharp (Node.js)
- **数据库**：SQLite 3 (更好的并发支持)

## 📦 项目结构 (DDD 驱动)

```
UI-Eye/
├── web/                      # 前端源代码 (Vite + Vue3)
│   ├── src/
│   │   ├── core/             # 核心逻辑 (API, Types, Utils)
│   │   ├── ui/               # 视图层 (Views, Components, Assets)
│   │   └── modules/          # 业务模块 (Stores, Composables)
├── server/                   # 后端源代码 (TypeScript)
│   ├── src/
│   │   ├── application/      # 应用层 (用例编排、任务分发)
│   │   ├── domain/           # 领域层 (核心模型、算法服务、接口协议)
│   │   ├── infrastructure/   # 基础设施层 (Adapter 实现、数据库、WS、AI驱动)
│   │   ├── controllers/      # 接口层 (HTTP 路由处理)
│   │   └── utils/            # 通用工具
├── extension/                # Chrome 浏览器插件
├── docs/                     # 项目文档
│   ├── 项目架构文档.md        # 系统架构和调用链路
│   ├── 交互脚本使用指南.md    # Playwright 脚本编写教程
│   ├── 用户使用手册.md        # 功能使用说明
│   ├── 测试文档.md            # 测试指南
│   └── PRD.md                # 产品需求文档
└── README.md                 # 项目入口说明
```

## 📚 文档导航

- **[项目架构文档](./docs/项目架构文档.md)** - 系统架构图、调用链路、技术栈详解
- **[交互脚本使用指南](./docs/交互脚本使用指南.md)** - 如何编写 Playwright 脚本实现自动登录等功能
- **[用户使用手册](./docs/用户使用手册.md)** - 功能使用说明和常见问题
- **[测试文档](./docs/测试文档.md)** - 测试指南和质量保证
- **[产品需求文档](./docs/PRD.md)** - 完整的产品设计和需求说明

## 🚀 快速开始

### 1. 安装依赖

```bash
# 安装根目录工具
npm install

# 分别安装前后端依赖
cd server && npm install
cd ../web && npm install
```

### 2. 配置环境

复制 `server/.env.example` 到 `server/.env` 并配置您的 AI Key：

```env
# 硅基流动配置 (推荐)
SILICONFLOW_API_KEY=sk-xxxx
```

### 3. 运行项目

```bash
# 启动开发全家桶 (同时运行前后端)
npm run dev:all
```

- 前端：`http://localhost:5173`
- 后端：`http://localhost:3000`

## 📖 核心工作流

### 场景 A：单页即时审计
1. 进入“开始对比”，输入页面 URL 并上传设计稿。
2. 系统自动执行：`截图 -> 对齐 -> ODiff 对比 -> 区域聚类 -> AI 分析`。
3. 查看交互式报告，点击差异区获取 CSS 建议。

### 场景 B：全站批量走查
1. 进入“批量任务”，输入多个 URL 或导入链接列表。
2. 任务开启后，通过 WebSocket 实时观察进度条。
3. 查看累计平均相似度与全站差异点汇总。

### 场景 C：开发插件诊断
1. 开启 UI-Eye 插件模式。
2. 在目标页面右键“诊断该元素”，AI 即时对比开发态与设计态的差异。

## 🗺️ 路线图 (Roadmap)

- [x] **v1.0**：基础截图与像素比对
- [x] **v2.0**：AI 分析与交互式报告
- [x] **v3.0**：TS/DDD 重构、批量审计、浏览器插件
- [ ] **v4.0 (Planning)**：CI/CD 流水线集成、自动化测试脚本录制

## 📄 许可证

MIT License
