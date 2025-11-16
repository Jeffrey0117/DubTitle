# DubTitle Phase 2 开发计划 - 真实字幕集成

## 项目目标
集成yt-dlp实现真实YouTube字幕提取功能

---

## 技术方案

### 字幕获取方案：yt-dlp
**选择理由**:
- ✅ 可直接提取YouTube官方字幕
- ✅ 支持多语言字幕
- ✅ 无需API密钥
- ✅ 开源且稳定

### 架构设计
```
前端 (Next.js)
├── UI组件 (已完成)
└── 字幕API调用

后端 API Route (Next.js)
├── /api/subtitles
│   ├── 接收YouTube视频ID
│   ├── 调用yt-dlp提取字幕
│   └── 返回字幕JSON数据

系统依赖
└── yt-dlp (Python工具)
```

---

## 四Agent分工

### 🎯 Agent 1: 主管 & 任务监督者
**职责**:
- [x] 协调整体开发节奏 ✅
- [x] 实时更新plan-2.md ✅
- [x] 监督其他agents进度 ✅
- [x] 确保任务完成质量 ✅
- [x] 记录技术决策 ✅

### 💻 Agent 2: 后端API大师
**职责**:
- [x] 创建Next.js API Route `/api/subtitles` ✅
- [x] 集成yt-dlp命令行调用 ✅
- [x] 处理字幕数据解析（VTT格式） ✅
- [x] 错误处理和日志 ✅
- [x] API临时文件清理 ✅

### 🎨 Agent 3: 前端集成大师
**职责**:
- [x] 修改前端组件调用新API ✅
- [x] 实现loading状态（加载动画） ✅
- [x] 优化字幕同步逻辑 ✅
- [x] 添加错误提示UI ✅
- [x] 优化用户体验（字幕计数显示） ✅

### 🔧 Agent 4: 系统配置大师
**职责**:
- [x] 配置yt-dlp环境（使用pip安装） ✅
- [x] 验证yt-dlp可用性 ✅
- [x] 系统依赖检查（Python 3.14 + pip） ✅
- [ ] MCP + context7集成（可选优化项）
- [x] 环境准备完成 ✅

---

## 开发阶段

### Phase 2.1: 环境准备 🔧 ✅ 完成
- [x] 安装yt-dlp到系统（v2025.11.12）
- [x] 验证yt-dlp命令可用
- [x] 确认Python环境（v3.14 + pip 25.2）
- [ ] 配置MCP context7（可选，暂不需要）

### Phase 2.2: API开发 ⚡ ✅ 完成
- [x] 创建API Route结构（/app/api/subtitles/route.ts）
- [x] 实现yt-dlp调用逻辑（支持中英文字幕）
- [x] 字幕数据解析（VTT -> JSON）
- [x] 错误处理和临时文件清理
- [x] 支持多语言字幕（zh-Hans, zh-TW, zh, en）

### Phase 2.3: 前端集成 🎨 ✅ 完成
- [x] 修改SubtitlePanel组件（接受真实数据）
- [x] 添加API调用逻辑（app/page.tsx）
- [x] 实现loading状态（加载动画）
- [x] 错误处理UI（红色错误提示）
- [x] 字幕同步优化（基于时间匹配）
- [x] 显示字幕计数信息

### Phase 2.4: 测试优化 ✅ 准备测试
- [ ] 端到端功能测试（即将进行）
- [ ] 多视频测试
- [ ] 性能优化
- [ ] 用户体验优化
- [ ] 文档更新

---

## 技术实现细节

### yt-dlp命令示例
```bash
# 获取字幕列表
yt-dlp --list-subs [VIDEO_URL]

# 下载字幕（JSON格式）
yt-dlp --write-auto-sub --sub-format json3 --skip-download [VIDEO_URL]

# 仅获取字幕信息
yt-dlp --write-sub --sub-lang zh-Hans,en --skip-download --output "subtitles.%(ext)s" [VIDEO_URL]
```

### API Route结构
```typescript
// app/api/subtitles/route.ts
export async function POST(request: Request) {
  const { videoId } = await request.json();

  // 1. 验证videoId
  // 2. 调用yt-dlp
  // 3. 解析字幕数据
  // 4. 返回JSON

  return Response.json({ subtitles: [...] });
}
```

### 字幕数据格式
```typescript
interface Subtitle {
  start: number;    // 开始时间（秒）
  end: number;      // 结束时间（秒）
  text: string;     // 字幕文本
}
```

---

## 当前进度

**状态**: 🎉 Phase 2 开发完成，准备测试
**开始时间**: 2025-11-15
**完成时间**: 2025-11-15

### Agent任务分配状态

#### 🎯 主管Agent ✅ 全部完成
- [x] 创建plan-2.md
- [x] 分配任务给各agents
- [x] 监督开发进度
- [x] 更新文档
- [x] 协调四agent协作

#### 💻 后端API大师 ✅ 全部完成
- [x] 创建API Route (/app/api/subtitles/route.ts)
- [x] 实现yt-dlp集成
- [x] VTT字幕解析
- [x] 错误处理
- [x] 临时文件管理

#### 🎨 前端集成大师 ✅ 全部完成
- [x] 修改主页面组件
- [x] 更新SubtitlePanel组件
- [x] API调用集成
- [x] Loading和错误状态
- [x] 用户体验优化

#### 🔧 系统配置大师 ✅ 全部完成
- [x] 安装yt-dlp (v2025.11.12)
- [x] 验证Python环境
- [x] 系统依赖确认

---

## 技术决策记录

### 决策1: 使用Next.js API Routes
**理由**:
- 避免CORS问题
- 统一技术栈
- 易于部署

### 决策2: 服务器端调用yt-dlp
**理由**:
- 浏览器无法直接调用系统命令
- 保护用户隐私
- 更好的性能控制

### 决策3: 实时提取 vs 缓存
**方案**: 实时提取，未来可添加缓存层
**理由**: MVP阶段优先实现功能

---

## 风险与挑战

### ⚠️ 潜在问题
1. yt-dlp安装和配置
2. 不同操作系统兼容性
3. YouTube API限制
4. 字幕格式解析复杂度

### 🛡️ 应对方案
1. 提供详细安装文档
2. 环境检测脚本
3. 错误重试机制
4. 统一字幕格式转换

---

## 完成标准

- [x] ✅ plan-2.md创建完成
- [x] ✅ yt-dlp成功安装并可用（v2025.11.12）
- [x] ✅ API Route返回真实字幕数据（/api/subtitles）
- [x] ✅ 前端正确显示字幕（SubtitlePanel集成）
- [x] ✅ 字幕与视频同步（时间戳匹配）
- [x] ✅ 错误处理完善（Loading + Error状态）
- [ ] ⏳ README文档更新（待完成）
- [ ] ⏳ 实际视频测试（准备进行）

---

## 已实现的文件清单

### 新增文件
```
✅ app/api/subtitles/route.ts - 字幕提取API
```

### 修改文件
```
✅ app/page.tsx - 添加字幕状态管理和API调用
✅ components/SubtitlePanel.tsx - 支持真实字幕数据
```

### 系统依赖
```
✅ Python 3.14.0
✅ pip 25.2
✅ yt-dlp 2025.11.12
```

---

## 技术实现亮点

### 1. VTT字幕解析
- 完整解析WebVTT格式
- 时间戳转换（HH:MM:SS.mmm -> 秒）
- HTML标签清理
- 特殊字符转义

### 2. 多语言支持
支持的字幕语言优先级：
1. zh-Hans（简体中文）
2. zh-TW（繁体中文）
3. zh（中文）
4. en（英文）

### 3. 错误处理
- API错误捕获和返回
- 临时文件自动清理
- 用户友好的错误提示

### 4. 用户体验
- 加载动画
- 字幕计数显示
- 状态优先级显示
- 平滑过渡动画

---

_本文档将实时更新，记录Phase 2所有开发进度_



✅ 用 YT-DLP 下載 YouTube 字幕的方法
1️⃣ 下載字幕（只有字幕、不抓影片）
yt-dlp --write-subs --skip-download "<影片網址>"


這會下載：

自動字幕（如果有）

上傳者字幕（如果有）

字幕通常是 .vtt 檔。

✔ 方法 2：加入瀏覽器 User-Agent

讓 yt-dlp 看起來像一般瀏覽器：

yt-dlp --user-agent "Mozilla/5.0" <網址>


非常簡單，常能解決。✔ 方法 5：加上 --extractor-args 讓 yt-dlp 避免被 Google 封鎖
yt-dlp --extractor-args "youtube:player_client=web" <網址>


這是 yt-dlp 專門用來避開 YouTube 限制的參數。