# DubTitle MVP 开发计划 v1.0

## 项目概述
**项目名称**: DubTitle - YouTube双字幕视窗系统
**技术栈**: Next.js (纯前端，无后端)
**风格**: 极简主义 (Anthony Fu Style)
**原则**: 极简MVP，不过度开发

---

## 核心需求分析

### 功能需求
- [x] **视窗1**: YouTube视频播放器
  - [x] 简单input输入框接受YT链接
  - [x] 嵌入式YouTube播放器

- [x] **视窗2**: 字幕显示面板
  - [x] 可自定义背景颜色
  - [x] 可自定义字幕颜色
  - [x] 可调整字体大小
  - [x] 实时同步字幕显示（基础版本）

- [ ] **字幕提取系统**（待优化）
  - [ ] 方案A: YouTube IFrame API直接获取
  - [ ] 方案B: 客户端字幕API调用
  - [x] 当前使用：模拟数据（MVP阶段）

### 技术架构（纯前端）
```
Frontend (Next.js App Router)
├── app/
│   ├── layout.tsx (根布局)
│   ├── page.tsx (主页 - 双视窗布局)
│   └── globals.css (极简全局样式)
├── components/
│   ├── YouTubePlayer.tsx (YouTube播放器)
│   ├── SubtitlePanel.tsx (字幕显示面板)
│   └── StyleControl.tsx (样式控制面板)
└── 状态管理: React Hooks (useState)
```

---

## 开发阶段规划

### Phase 1: 项目初始化 🚀 ✅ 完成
- [x] 创建Next.js应用（手动创建，避免文件冲突）
- [x] 配置Tailwind CSS（极简样式）
- [x] 设置项目结构（App Router + TypeScript）
- [x] 安装所有依赖包

### Phase 2: UI/UX设计 🎨 ✅ 完成
- [x] 设计双视窗布局（50/50分屏）
- [x] 极简输入框设计（深色主题）
- [x] 字幕面板视觉设计（可自定义背景和文字颜色）
- [x] 控制面板UI设计（底部控制条）

### Phase 3: 核心功能开发 ⚡ ✅ MVP完成
- [x] YouTube播放器集成（iframe embed）
- [x] 字幕同步逻辑（基础版 - 使用模拟数据）
- [x] 自定义样式控制（颜色选择器 + 字体大小滑块）
- [ ] 真实字幕提取功能（待下一阶段）

### Phase 4: 后端集成 🔧 ❌ 取消
~~Supabase后端~~ → 遵循"无后端"原则，纯前端实现

### Phase 5: 测试优化 ✅ 进行中
- [ ] 功能测试（即将启动开发服务器）
- [ ] 性能优化
- [ ] UI/UX微调

---

## 技术决策记录

### 1. 无后端架构 ✅
**决策**: 取消Supabase后端，采用纯前端方案
**理由**: 遵循"不过度开发"原则，MVP阶段不需要数据持久化

### 2. 字幕提取方案
**MVP阶段**: 使用模拟数据展示功能
**后续优化方案**:
- YouTube Transcript API（客户端调用）
- YouTube IFrame Player API（获取字幕数据）
- 第三方字幕API服务

### 3. 设计风格
**极简主义**:
- 深色主题（neutral-950背景）
- 简洁的颜色选择器
- 平滑的过渡动画
- 去除所有不必要的装饰元素

---

## 当前进度
**状态**: 🎉 MVP基础功能已完成
**最后更新**: 2025-11-15

### 已完成的文件清单
```
✅ package.json - 项目依赖配置
✅ tsconfig.json - TypeScript配置
✅ tailwind.config.ts - Tailwind CSS配置
✅ next.config.ts - Next.js配置
✅ app/layout.tsx - 根布局
✅ app/page.tsx - 主页（双视窗布局）
✅ app/globals.css - 全局样式
✅ components/YouTubePlayer.tsx - YouTube播放器组件
✅ components/SubtitlePanel.tsx - 字幕面板组件
✅ components/StyleControl.tsx - 样式控制组件
```

### 核心功能状态
- ✅ YouTube视频输入和播放
- ✅ 双视窗布局（简报式）
- ✅ 字幕面板（可自定义背景色、字幕色、字体大小）
- ✅ 极简UI设计
- ⏳ 真实字幕API集成（待优化）

### 下一步优化
1. 启动开发服务器测试功能
2. 集成真实的YouTube字幕API
3. 优化字幕同步逻辑
4. 添加响应式设计

---

_本文档将持续更新，反映最新开发进度_
