# UI-Eye 快速测试指南

## 🚀 当前运行状态

### 前端服务
- **地址**：http://localhost:5173
- **状态**：✅ 运行中
- **技术栈**：Vite + Vue 3 + TypeScript

### 后端服务
- **地址**：http://localhost:3000
- **状态**：✅ 运行中
- **技术栈**：Node.js + TypeScript (DDD 架构)

## 📝 测试流程

### 1. 访问首页
打开浏览器访问：http://localhost:5173

### 2. 单页即时对比
1. 点击"开始对比"按钮。
2. 输入待测 URL。
3. 上传本地设计稿或输入蓝湖地址。
4. 点击“开始对比”，等待系统执行：`截图 -> ODiff 对比 -> AI 诊断`。

### 3. 批量走查任务
1. 进入“批量任务”页面。
2. 创建一个包含多个 URL 的任务。
3. 启动任务并观察实时进度推送。

### 4. 插件实时诊断
1. 确保插件已安装。
2. 在任意页面右键或通过插件面板启动诊断。

## 🔧 当前功能状态

### ✅ 已全面实现
- **高性能对比引擎**：集成 ODiff (Rust) 核心，支持千万像素级快速扫描。
- **真实截图采集**：基于 Puppeteer 的全页滚动截图及资源加载等待。
- **AI 智能诊断**：对接 SiliconFlow (Qwen/Yi) 等多模态模型，生成真实修复建议。
- **实时进度推送**：基于 WebSocket 的任务流转状态通知。
- **批量并发控制**：支持大规模多任务队列执行。
- **自动化预处理**：支持自定义脚本在截图前执行（登录、弹窗处理等）。

### 📋 后续计划
- [ ] CI/CD 集成流水线插件。
- [ ] 导出 PDF 格式的完整审计报告。
- [ ] 自动化测试用例录制。

## 🧪 核心接口验证

### 健康检查
```bash
curl http://localhost:3000/api/health
```

### 发起批量任务
```bash
curl -X POST http://localhost:3000/api/batch/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "name": "测试任务",
    "urls": ["https://m.baidu.com"],
    "designSource": "https://example.com/design.png"
  }'
```

## 💡 注意事项

1. **API 配置**：确保 `server/.env` 中配置了有效的 AI 供应商 API Key。
2. **端口占用**：系统默认占用 3000 (Backend) 和 5173 (Frontend) 端口。
3. **资源依赖**：截图功能依赖本地 Chrome 组件（Puppeteer 自动安装）。
