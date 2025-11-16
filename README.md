# DubTitle - YouTube双字幕系统

极简的YouTube双字幕显示系统，灵感来自Anthony Fu的极简设计风格。

## 功能特性

- 🎥 **YouTube播放器**: 简单输入YouTube链接即可播放
- 📝 **双字幕显示**: 独立的字幕面板，支持自定义样式
- 🎨 **样式自定义**:
  - 可调整背景颜色
  - 可调整字幕颜色
  - 可调整字体大小 (16-64px)
- 🖥️ **双视窗布局**: 类似简报的分屏设计
- ✨ **极简UI**: 深色主题，去除一切不必要的元素

## 技术栈

- **框架**: Next.js 15 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **架构**: 纯前端，无后端

## 快速开始

### 安装依赖
\`\`\`bash
npm install
\`\`\`

### 启动开发服务器
\`\`\`bash
npm run dev
\`\`\`

### 访问应用
打开浏览器访问 [http://localhost:3000](http://localhost:3000)

## 使用方法

1. 在左侧输入框中粘贴YouTube视频链接
2. 点击"加载视频"按钮
3. 视频将在左侧播放，字幕在右侧显示
4. 使用底部控制面板自定义字幕样式

## 项目结构

\`\`\`
dubtitle/
├── app/
│   ├── layout.tsx          # 根布局
│   ├── page.tsx            # 主页（双视窗布局）
│   └── globals.css         # 全局样式
├── components/
│   ├── YouTubePlayer.tsx   # YouTube播放器组件
│   ├── SubtitlePanel.tsx   # 字幕面板组件
│   └── StyleControl.tsx    # 样式控制组件
└── plan-1.md               # 开发计划文档
\`\`\`

## 功能特性详解

### Phase 1: 基础MVP ✅
- 双视窗布局系统
- YouTube视频播放
- 自定义字幕样式

### Phase 2: 真实字幕集成 ✅
- **yt-dlp集成**: 使用yt-dlp提取YouTube官方字幕
- **多语言支持**: 支持中文（简体/繁体）和英文字幕
- **自动提取**: 输入视频链接自动加载字幕
- **VTT解析**: 完整的WebVTT格式解析
- **智能同步**: 基于时间戳的字幕同步
- **错误处理**: 友好的加载状态和错误提示

### 技术栈详情
- **前端**: Next.js 15 (App Router) + TypeScript + Tailwind CSS
- **字幕提取**: yt-dlp (v2025.11.12)
- **运行环境**: Python 3.14 + Node.js

### 未来优化方向
- 支持多语言字幕切换
- 添加字幕下载功能
- 响应式设计优化
- 字幕缓存机制

## 设计理念

遵循"不过度开发"原则：
- 纯前端实现，无需后端
- 极简UI，专注核心功能
- 简洁代码，易于维护

## License

MIT
