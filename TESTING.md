# UI-Eye 快速测试指南

## 🚀 当前运行状态

### 前端服务
- **地址**：http://localhost:5173
- **状态**：✅ 运行中
- **技术栈**：Vite + Vue 3 + TypeScript

### 后端服务
- **地址**：http://localhost:3000
- **状态**：✅ 运行中
- **技术栈**：Express + Node.js

## 📝 测试流程

### 1. 访问首页
打开浏览器访问：http://localhost:5173

### 2. 开始对比
1. 点击"开始对比"按钮
2. 选择对比模式：
   - **效果图上传**：拖拽或选择本地图片
   - **蓝湖地址**：输入蓝湖链接（目前返回模拟数据）

### 3. 配置参数
- **H5 页面地址**：输入任意 URL（例如：https://example.com）
- **AI 模型**：选择千问 2.5 / GPT-4 Vision / Claude 3
- **视口尺寸**：选择预设或自定义

### 4. 查看报告
提交后会自动跳转到报告页面，显示：
- 还原度评分（模拟数据：92.5%）
- 设计稿 / 实际页面 / 差异图对比
- CSS 修复建议列表

## 🔧 当前功能状态

### ✅ 已实现
- 前端完整界面（首页、对比页、报告页）
- 后端 API 服务器
- 文件上传功能
- 对比任务管理
- 报告生成（模拟数据）

### 🚧 使用模拟数据
以下功能目前返回模拟数据：
- 蓝湖 API 集成
- 页面截图
- 图像对比
- AI 分析

### 📋 待实现
- Puppeteer 截图采集
- Pixelmatch 图像对比
- 真实 AI 模型集成
- 真实蓝湖 API 调用

## 🧪 API 测试

### 健康检查
```bash
curl http://localhost:3000/api/health
```

### 上传设计稿
```bash
curl -X POST http://localhost:3000/api/upload-design \
  -F "file=@/path/to/design.png"
```

### 开始对比
```bash
curl -X POST http://localhost:3000/api/compare \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "mode": "upload",
    "designSource": "/uploads/xxx.png",
    "aiModel": "qwen",
    "viewport": {"width": 375, "height": 667}
  }'
```

### 获取报告
```bash
curl http://localhost:3000/api/report/{reportId}
```

## 💡 注意事项

1. **模拟数据**：当前版本使用模拟数据，报告结果为预设值
2. **图片占位符**：实际页面和差异图使用 placeholder 图片
3. **处理延迟**：对比任务有 3 秒模拟延迟
4. **文件上传**：支持 PNG/JPG 格式，最大 10MB

## 🎯 下一步开发

1. 集成 Puppeteer 实现真实页面截图
2. 集成 Pixelmatch 实现像素级对比
3. 集成 AI 模型（千问 2.5 / GPT-4 Vision）
4. 实现真实的蓝湖 API 调用
5. 优化错误处理和用户体验
