# ==========================================
# UI-Eye 官方开发容器镜像
# 目的：提供开箱即用的截图比对环境，无视宿主机系统差异
# ==========================================

FROM node:20-slim

# 关键步骤：安装 Chromium 运行所需的底层 Linux 依赖库
# 这些是裸机部署时最容易缺失的部分
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-kacst \
    fonts-freefont-ttf \
    --no-install-recommends \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# 设置容器工作目录
WORKDIR /app

# 优先复制依赖定义文件，利用 Docker 层缓存机制加速构建
COPY package*.json ./
COPY web/package*.json ./web/
COPY server/package*.json ./server/

# 执行全量 Workspace 依赖安装
RUN npm install

# 复制项目全量源代码
COPY . .

# 曝露服务端口：3000(后端API/WS), 5173(前端开发服务)
EXPOSE 3000 5173

# 预执行浏览器核心下载，确保容器启动时无需再次联网下载
RUN npx puppeteer browsers install

# 环境变量设置：确保 Puppeteer 在容器内正确运行
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# 注意：由于我们使用的是预下载模式，CMD 启动前会根据 package.json 逻辑执行
CMD ["npm", "run", "dev:all"]
