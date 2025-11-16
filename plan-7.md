# Plan-7: AI 驅動的智能雙語學習系統

## 專案概述

### 願景
將 DubTitle 從基礎的雙語字幕顯示工具，升級為 AI 驅動的智能語言學習平台，整合 Whisper 語音辨識、AI 翻譯、講義生成等功能，打造沉浸式學習體驗。

### 核心功能
1. **Whisper 語音辨識** - 支援任何影片的即時語音轉文字
2. **AI 翻譯雙語字幕** - 智能翻譯與對照顯示
3. **講義模式** - 自動生成學習筆記與知識點整理
4. **智能校準** - 自動優化字幕時序與同步

### 目標用戶
- 語言學習者（英語、日語、韓語等）
- 線上課程學生
- 影片創作者（需要字幕生成）
- 無障礙內容需求者

---

## 階段規劃

### 階段 1: Whisper 語音辨識整合

#### 功能描述
整合 OpenAI Whisper 模型，實現：
- 支援無字幕或非 YouTube 影片的語音辨識
- 多語言辨識（100+ 語言）
- 高精度時間戳對齊
- 本地或雲端處理選項

#### 技術方案

**方案 A: 本地 Whisper（開源免費）**
```typescript
// 使用 whisper.cpp 或 transformers.js
技術棧：
- whisper.cpp (C++ 實現，速度快)
- Next.js API Route 調用本地模型
- 支援 tiny/base/small 模型（GPU 加速可選）

優勢：
✅ 完全免費
✅ 隱私保護（不上傳數據）
✅ 無 API 調用限制

劣勢：
❌ 需要用戶安裝環境
❌ 處理速度較慢（CPU 模式）
❌ 模型體積大（100MB-1.5GB）
```

**方案 B: OpenAI Whisper API（雲端）**
```typescript
// 使用 OpenAI 官方 API
技術棧：
- OpenAI Whisper API
- Next.js API Route 代理
- 音頻分段處理（25MB 限制）

優勢：
✅ 處理速度極快（1分鐘音頻 <10 秒）
✅ 精度最高
✅ 無需本地資源

劣勢：
❌ 收費（$0.006/分鐘）
❌ 需要 API Key
❌ 依賴網路連線
```

**方案 C: Groq Whisper API（推薦）**
```typescript
// 使用 Groq 的超高速推理
技術棧：
- Groq Whisper API（whisper-large-v3）
- 速度比 OpenAI 快 10-20 倍
- 每日免費額度

優勢：
✅ 超高速處理（1分鐘音頻 <2 秒）
✅ 免費額度慷慨
✅ API 穩定

劣勢：
❌ 需要註冊 API Key
❌ 免費額度有限（約 14,400 秒/天）
```

#### 實踐難易度評分

| 維度 | 本地 Whisper | OpenAI API | Groq API |
|------|--------------|------------|----------|
| 開發難度 | ⭐⭐⭐⭐ (4/5) | ⭐⭐ (2/5) | ⭐⭐ (2/5) |
| 部署複雜度 | ⭐⭐⭐⭐⭐ (5/5) | ⭐ (1/5) | ⭐ (1/5) |
| 用戶體驗 | ⭐⭐ (2/5) | ⭐⭐⭐⭐⭐ (5/5) | ⭐⭐⭐⭐⭐ (5/5) |
| 成本 | ⭐⭐⭐⭐⭐ (5/5) | ⭐⭐⭐ (3/5) | ⭐⭐⭐⭐ (4/5) |

**推薦方案：Groq API（開發階段） + 本地 Whisper（高級功能）**

#### 預估工時
- API 整合：8-12 小時
- 音頻提取（YouTube/本地）：4-6 小時
- UI/UX 設計：6-8 小時
- 測試與優化：8-10 小時
- **總計：26-36 小時（3-5 天）**

#### 實作步驟
```typescript
// 1. 創建 Whisper API Route
// app/api/whisper/route.ts
export async function POST(request: Request) {
  const { audioUrl, language } = await request.json();

  // 下載音頻（YouTube 或直接上傳）
  const audioBuffer = await downloadAudio(audioUrl);

  // 調用 Groq Whisper API
  const transcription = await groq.audio.transcriptions.create({
    file: audioBuffer,
    model: "whisper-large-v3",
    language: language || "auto",
    response_format: "verbose_json", // 包含時間戳
  });

  // 轉換為標準字幕格式
  const subtitles = formatTimestamps(transcription.segments);

  return Response.json({ subtitles });
}

// 2. 前端整合
// 在 YouTubePlayer 或新建 AudioUploader 組件
const handleWhisperTranscribe = async (videoId: string) => {
  setLoading(true);

  try {
    const response = await fetch('/api/whisper', {
      method: 'POST',
      body: JSON.stringify({ audioUrl: `youtube:${videoId}` }),
    });

    const { subtitles } = await response.json();
    setSubtitles(subtitles);
  } catch (error) {
    console.error('Whisper 辨識失敗:', error);
  } finally {
    setLoading(false);
  }
};
```

---

### 階段 2: AI 翻譯雙語字幕

#### 功能描述
- 自動翻譯現有字幕為目標語言
- 雙語對照顯示（原文 + 翻譯）
- 支援多種翻譯引擎
- 保持字幕時序同步

#### 技術方案

**翻譯引擎選擇**

| 引擎 | 成本 | 速度 | 品質 | 適用場景 |
|------|------|------|------|---------|
| **Google Translate API** | $20/百萬字 | 快 | ⭐⭐⭐ | 通用翻譯 |
| **DeepL API** | €5-25/百萬字 | 中 | ⭐⭐⭐⭐⭐ | 專業翻譯 |
| **OpenAI GPT-4** | $0.03/1K tokens | 慢 | ⭐⭐⭐⭐⭐ | 語境理解 |
| **Claude API** | $0.015/1K tokens | 中 | ⭐⭐⭐⭐⭐ | 語境理解 |
| **本地模型（NLLB）** | 免費 | 中 | ⭐⭐⭐⭐ | 隱私優先 |

**推薦方案：混合策略**
- **基礎翻譯**：Google Translate（快速、便宜）
- **精準翻譯**：DeepL（付費用戶）
- **語境理解**：Claude/GPT-4（專業內容）

#### 核心實作

```typescript
// app/api/translate/route.ts
export async function POST(request: Request) {
  const { subtitles, targetLanguage, engine = 'google' } = await request.json();

  // 批次翻譯（減少 API 調用）
  const texts = subtitles.map(sub => sub.text);
  const batches = chunkArray(texts, 100); // 每批 100 條

  const translations = [];

  for (const batch of batches) {
    const translated = await translateBatch(batch, targetLanguage, engine);
    translations.push(...translated);
  }

  // 組合原文與翻譯
  const bilingualSubtitles = subtitles.map((sub, idx) => ({
    ...sub,
    original: sub.text,
    translation: translations[idx],
  }));

  return Response.json({ subtitles: bilingualSubtitles });
}

// 翻譯引擎抽象層
async function translateBatch(texts: string[], targetLang: string, engine: string) {
  switch (engine) {
    case 'google':
      return await googleTranslate(texts, targetLang);
    case 'deepl':
      return await deeplTranslate(texts, targetLang);
    case 'claude':
      return await claudeTranslate(texts, targetLang);
    default:
      throw new Error(`未知翻譯引擎: ${engine}`);
  }
}
```

#### 雙語顯示 UI

```typescript
// components/BilingualSubtitlePanel.tsx
interface BilingualSubtitlePanelProps {
  subtitle: {
    original: string;
    translation: string;
  };
  layout: 'stacked' | 'side-by-side' | 'overlay';
}

export default function BilingualSubtitlePanel({ subtitle, layout }: BilingualSubtitlePanelProps) {
  if (layout === 'stacked') {
    return (
      <div className="space-y-2">
        <p className="text-2xl text-white">{subtitle.original}</p>
        <p className="text-xl text-neutral-400">{subtitle.translation}</p>
      </div>
    );
  }

  // side-by-side 或 overlay 模式
  // ...
}
```

#### 預估工時
- API 整合（3種引擎）：12-16 小時
- 批次處理邏輯：4-6 小時
- 雙語 UI 設計：8-10 小時
- 快取機制：4-6 小時
- **總計：28-38 小時（4-5 天）**

#### 難易度評分
- 開發難度：⭐⭐⭐ (3/5)
- API 成本管理：⭐⭐⭐⭐ (4/5)
- 品質保證：⭐⭐⭐⭐ (4/5)

---

### 階段 3: 講義模式

#### 功能描述
將影片內容自動轉換為結構化學習筆記：
- 自動摘要影片內容
- 提取關鍵知識點
- 生成時間戳索引
- 支援 Markdown 匯出
- 互動式時間軸導航

#### 技術方案

**AI 模型選擇**
- **Claude 3.5 Sonnet**（推薦）：200K context，擅長長文本分析
- **GPT-4 Turbo**：128K context，綜合能力強
- **Gemini 1.5 Pro**：1M context，超長影片支援

**講義生成流程**
```typescript
// app/api/notes/route.ts
export async function POST(request: Request) {
  const { subtitles, videoTitle, language = 'zh-TW' } = await request.json();

  // 1. 合併字幕為完整文本
  const fullTranscript = subtitles.map(sub => sub.text).join(' ');

  // 2. 使用 Claude 分析內容
  const prompt = `
你是專業的學習筆記整理助手。請分析以下影片字幕，生成結構化學習筆記。

影片標題：${videoTitle}

字幕內容：
${fullTranscript}

請生成以下內容：
1. **摘要**（3-5 句話總結影片主旨）
2. **關鍵知識點**（5-10 個要點，每個附帶時間戳）
3. **詳細筆記**（分章節整理，使用 Markdown 格式）
4. **學習建議**（如何有效學習本影片內容）

輸出格式：JSON
{
  "summary": "...",
  "keyPoints": [
    { "time": 123.45, "point": "知識點描述" }
  ],
  "detailedNotes": "# 章節 1\n...",
  "studyTips": "..."
}
`;

  const response = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 4000,
    messages: [{ role: "user", content: prompt }]
  });

  const notes = JSON.parse(response.content[0].text);

  return Response.json({ notes });
}
```

#### UI 組件設計

```typescript
// components/NotesPanel.tsx
interface NotesPanelProps {
  notes: {
    summary: string;
    keyPoints: Array<{ time: number; point: string }>;
    detailedNotes: string;
    studyTips: string;
  };
  onTimestampClick: (time: number) => void;
}

export default function NotesPanel({ notes, onTimestampClick }: NotesPanelProps) {
  return (
    <div className="p-6 space-y-6 bg-neutral-900 rounded-lg">
      {/* 摘要區 */}
      <section>
        <h2 className="text-xl font-bold mb-2">影片摘要</h2>
        <p className="text-neutral-300">{notes.summary}</p>
      </section>

      {/* 關鍵知識點（可點擊跳轉） */}
      <section>
        <h2 className="text-xl font-bold mb-2">關鍵知識點</h2>
        <ul className="space-y-2">
          {notes.keyPoints.map((point, idx) => (
            <li
              key={idx}
              className="flex items-start gap-2 cursor-pointer hover:bg-neutral-800 p-2 rounded"
              onClick={() => onTimestampClick(point.time)}
            >
              <span className="text-blue-400">{formatTime(point.time)}</span>
              <span className="text-neutral-300">{point.point}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* 詳細筆記（Markdown 渲染） */}
      <section>
        <h2 className="text-xl font-bold mb-2">詳細筆記</h2>
        <div className="prose prose-invert max-w-none">
          <ReactMarkdown>{notes.detailedNotes}</ReactMarkdown>
        </div>
      </section>

      {/* 學習建議 */}
      <section>
        <h2 className="text-xl font-bold mb-2">學習建議</h2>
        <p className="text-neutral-300">{notes.studyTips}</p>
      </section>
    </div>
  );
}
```

#### 預估工時
- AI Prompt 設計與調優：8-12 小時
- API 整合：6-8 小時
- Markdown 渲染與樣式：4-6 小時
- 時間戳導航：6-8 小時
- **總計：24-34 小時（3-5 天）**

#### 難易度評分
- 開發難度：⭐⭐⭐ (3/5)
- Prompt Engineering：⭐⭐⭐⭐ (4/5)
- 內容品質控制：⭐⭐⭐⭐ (4/5)

---

## 技術架構

### 系統架構圖

```
┌─────────────────────────────────────────────────────────┐
│                    前端層 (Next.js)                      │
├─────────────────────────────────────────────────────────┤
│  YouTube Player  │  SubtitlePanel  │  NotesPanel       │
│  AudioUploader   │  BilingualView  │  StyleControl     │
└────────────┬────────────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────────────┐
│                  API Routes (Next.js)                    │
├─────────────────────────────────────────────────────────┤
│  /api/subtitles  - yt-dlp 字幕提取                       │
│  /api/whisper    - Whisper 語音辨識                     │
│  /api/translate  - AI 翻譯服務                          │
│  /api/notes      - 講義生成服務                         │
└────────────┬────────────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────────────┐
│                   外部服務層                             │
├─────────────────────────────────────────────────────────┤
│  Groq API        - Whisper 超高速推理                   │
│  Anthropic       - Claude 3.5 講義生成                  │
│  Google/DeepL    - 翻譯服務                             │
│  YouTube         - 影片與字幕源                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   資料持久化                             │
├─────────────────────────────────────────────────────────┤
│  localStorage    - 用戶設定、時序配置                    │
│  IndexedDB       - 字幕快取、講義快取 (可選)             │
│  Supabase        - 用戶資料、學習記錄 (未來)             │
└─────────────────────────────────────────────────────────┘
```

### 技術棧總覽

```yaml
前端框架:
  - Next.js 15 (App Router)
  - React 18.3
  - TypeScript 5.0+

樣式系統:
  - Tailwind CSS 3.4
  - CSS-in-JS (inline styles)

AI 服務:
  - Groq API (Whisper)
  - Anthropic Claude 3.5
  - Google Translate / DeepL

字幕處理:
  - yt-dlp (YouTube 字幕)
  - youtube-caption-extractor
  - 自研 VTT 解析器

音頻處理:
  - yt-dlp (音頻提取)
  - ffmpeg (格式轉換，可選)

Markdown 渲染:
  - react-markdown
  - remark-gfm (GitHub Flavored Markdown)

狀態管理:
  - React Hooks (useState, useEffect)
  - BroadcastChannel API (跨標籤頁)
  - localStorage (持久化)
```

### 資料流程

```
1. 字幕獲取流程
   YouTube URL → yt-dlp → VTT 解析 → JSON 字幕
                    ↓
                Whisper API → 語音辨識 → JSON 字幕

2. 翻譯流程
   原文字幕 → 批次分組 → 翻譯 API → 雙語字幕

3. 講義生成流程
   字幕文本 → Claude API → 結構化筆記 → Markdown 渲染

4. 時序同步流程
   影片時間 → TimingCalibration → 調整後時間 → 字幕顯示
```

---

## 實踐難易度總評

### 各階段難度對比

| 階段 | 技術難度 | 開發工時 | 部署複雜度 | API 成本 | 總體評分 |
|------|---------|---------|-----------|---------|---------|
| **階段 1: Whisper** | ⭐⭐⭐ | 3-5 天 | ⭐⭐ | 低-中 | ⭐⭐⭐ (中) |
| **階段 2: AI 翻譯** | ⭐⭐⭐ | 4-5 天 | ⭐ | 中 | ⭐⭐⭐ (中) |
| **階段 3: 講義模式** | ⭐⭐⭐ | 3-5 天 | ⭐ | 低 | ⭐⭐⭐ (中) |

### 關鍵挑戰

#### 1. 音頻提取與處理
**挑戰**：
- YouTube 音頻下載可能違反 ToS
- 大檔案處理性能問題
- 格式轉換複雜性

**解決方案**：
- 使用合法的 YouTube Data API
- 串流處理大檔案
- 依賴 yt-dlp 處理格式

#### 2. API 成本控制
**挑戰**：
- Whisper 按分鐘計費
- 翻譯按字數計費
- Claude 按 token 計費

**解決方案**：
```typescript
// 智能快取策略
const cacheKey = `whisper:${videoId}`;
const cached = await getCachedResult(cacheKey);

if (cached && !forceRefresh) {
  return cached;
}

const result = await callWhisperAPI(audioUrl);
await setCachedResult(cacheKey, result, { ttl: 30 * 24 * 60 * 60 }); // 30 天

return result;
```

#### 3. 即時性能優化
**挑戰**：
- Whisper 處理需要時間
- 長影片（>1 小時）處理緩慢
- 用戶體驗受影響

**解決方案**：
- 背景處理 + WebSocket 進度推送
- 分段處理（每 10 分鐘一段）
- 漸進式顯示結果

```typescript
// WebSocket 進度推送
export async function POST(request: Request) {
  const { videoId } = await request.json();

  // 創建 SSE 連接
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // 背景處理
  processWhisperInBackground(videoId, {
    onProgress: (percent) => {
      writer.write(`data: ${JSON.stringify({ progress: percent })}\n\n`);
    },
    onComplete: (subtitles) => {
      writer.write(`data: ${JSON.stringify({ subtitles })}\n\n`);
      writer.close();
    }
  });

  return new Response(stream.readable, {
    headers: { 'Content-Type': 'text/event-stream' }
  });
}
```

### 風險緩解

| 風險 | 影響 | 緩解策略 |
|------|------|---------|
| **API 配額耗盡** | 高 | 實作快取 + 用戶限流 |
| **辨識精度不足** | 中 | 提供手動編輯功能 |
| **翻譯品質差** | 中 | 多引擎切換 + 人工校對 |
| **處理時間長** | 中 | 背景處理 + 進度顯示 |
| **成本超支** | 高 | 設定預算警報 + 用量儀表板 |

---

## 開發路線圖

### MVP（最小可行產品）- 2 週

**核心功能**：
- ✅ YouTube 字幕提取（已完成）
- ✅ 雙視窗顯示（已完成）
- ✅ 樣式自訂（已完成）
- ✅ 時序校準（已完成）
- 🔲 Whisper 辨識（Groq API）
- 🔲 Google Translate 翻譯
- 🔲 基礎雙語顯示

**技術債務**：
- 暫不實作快取
- 暫不支援本地 Whisper
- 暫不實作講義功能

### Beta 版本 - 4 週

**新增功能**：
- 🔲 多翻譯引擎（DeepL、Claude）
- 🔲 講義模式（Claude 生成）
- 🔲 IndexedDB 快取系統
- 🔲 進度顯示與背景處理
- 🔲 批次翻譯優化
- 🔲 Markdown 匯出

**優化項目**：
- API 成本監控儀表板
- 錯誤重試機制
- 用戶設定持久化

### 正式版本 - 8 週

**完整功能**：
- 🔲 本地 Whisper 支援（高級用戶）
- 🔲 多語言 UI（英/中/日）
- 🔲 學習進度追蹤
- 🔲 社群筆記分享
- 🔲 付費訂閱系統
- 🔲 移動端適配

**企業功能**：
- Supabase 後端整合
- 用戶帳號系統
- 學習統計分析
- API 用量管理

---

## 成本估算

### 開發成本（時間）

| 階段 | 開發時間 | 累計時間 |
|------|---------|---------|
| **MVP 開發** | 80-100 小時 | 2 週 |
| **Beta 功能** | 120-160 小時 | +3 週 (總 5 週) |
| **正式版優化** | 160-200 小時 | +4 週 (總 9 週) |

**團隊配置建議**：
- 1 名全端工程師（主力開發）
- 1 名 UI/UX 設計師（兼職）
- 1 名 AI/ML 工程師（顧問，兼職）

### 運營成本（月度估算）

#### 免費方案用戶（假設 1000 用戶/月，每人 5 部影片）

```yaml
Whisper 辨識 (Groq):
  - 平均影片長度: 15 分鐘
  - 總時長: 1000 × 5 × 15 = 75,000 分鐘
  - Groq 免費額度: 14,400 秒/天 × 30 = 432,000 秒 ≈ 7,200 分鐘
  - 超出部分: 67,800 分鐘 → 使用 OpenAI ($0.006/分鐘)
  - 成本: 67,800 × $0.006 = $406.8/月

翻譯 (Google Translate):
  - 平均字幕字數: 15 分鐘 × 120 字/分 = 1,800 字
  - 總字數: 1000 × 5 × 1,800 = 9,000,000 字
  - 成本: 9M 字 × $20/1M 字 = $180/月

講義生成 (Claude):
  - 使用率: 20% 用戶使用
  - 每次成本: ~10,000 tokens × $0.003/1K = $0.03
  - 成本: 1000 × 0.2 × 5 × $0.03 = $30/月

伺服器託管 (Vercel Pro):
  - 成本: $20/月

總計: $636.8/月
```

#### 付費方案用戶（假設 100 用戶/月，每人 20 部影片）

```yaml
成本計算（省略細節）:
  - Whisper: $120/月
  - DeepL 翻譯: $80/月
  - Claude 講義: $40/月

收入:
  - 訂閱費: $9.99/月 × 100 = $999/月

利潤: $999 - $240 = $759/月
```

### 免費 vs 付費方案

| 功能 | 免費方案 | 付費方案 ($9.99/月) |
|------|---------|-------------------|
| **字幕提取** | 5 部/月 | 無限制 |
| **Whisper 辨識** | 3 部/月 | 無限制 |
| **翻譯** | Google Translate | DeepL + Claude |
| **講義生成** | 1 部/月 | 無限制 |
| **快取時間** | 7 天 | 永久 |
| **匯出功能** | ❌ | ✅ Markdown/PDF |
| **背景處理** | ❌ | ✅ 優先佇列 |
| **無廣告** | ❌ | ✅ |

---

## 下一步行動

### 立即可做的事（本週）

1. **註冊 API Keys**
   - [x] Groq API (https://console.groq.com)
   - [ ] Anthropic Claude (https://console.anthropic.com)
   - [ ] Google Cloud Translation (可選)
   - [ ] DeepL API (可選)

2. **環境配置**
   ```bash
   # .env.local
   GROQ_API_KEY=gsk_...
   ANTHROPIC_API_KEY=sk-ant-...
   GOOGLE_TRANSLATE_KEY=AIza...
   DEEPL_API_KEY=...
   ```

3. **建立基礎 API Route**
   ```bash
   # 創建檔案結構
   mkdir -p app/api/whisper
   mkdir -p app/api/translate
   mkdir -p app/api/notes

   # 安裝依賴
   npm install groq-sdk @anthropic-ai/sdk
   npm install react-markdown remark-gfm
   ```

### 需要驗證的假設（第 1 週）

1. **Groq Whisper 品質測試**
   - 測試 3-5 部不同類型影片
   - 對比 OpenAI Whisper 精度
   - 記錄處理速度與錯誤率

2. **翻譯引擎對比**
   - Google vs DeepL vs Claude
   - 測試技術、日常、專業內容
   - 評估成本/品質比

3. **用戶需求調研**
   - 目標用戶最常看什麼類型影片？
   - 願意為哪些功能付費？
   - 可接受的處理等待時間？

### 技術原型（POC）建議（第 2-3 週）

#### POC 1: Whisper 整合原型

```typescript
// app/api/whisper/route.ts (簡化版)
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(request: Request) {
  const { videoId } = await request.json();

  // 1. 使用 yt-dlp 提取音頻
  const audioPath = await extractAudio(videoId);

  // 2. 調用 Groq Whisper
  const transcription = await groq.audio.transcriptions.create({
    file: fs.createReadStream(audioPath),
    model: "whisper-large-v3",
    response_format: "verbose_json",
  });

  // 3. 格式化字幕
  const subtitles = transcription.segments.map(seg => ({
    start: seg.start,
    end: seg.end,
    text: seg.text.trim(),
  }));

  return Response.json({ subtitles });
}
```

**測試清單**：
- [ ] 5 分鐘影片辨識成功率
- [ ] 15 分鐘影片處理時間
- [ ] 多語言辨識精度
- [ ] 錯誤處理機制

#### POC 2: 雙語翻譯原型

```typescript
// app/api/translate/route.ts
export async function POST(request: Request) {
  const { subtitles, targetLang = 'zh-TW' } = await request.json();

  // 批次翻譯（每 50 條一批）
  const batches = chunkArray(subtitles, 50);
  const results = [];

  for (const batch of batches) {
    const texts = batch.map(s => s.text).join('\n---\n');

    const translated = await fetch(
      'https://translation.googleapis.com/language/translate/v2',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: texts,
          target: targetLang,
          format: 'text',
          key: process.env.GOOGLE_TRANSLATE_KEY,
        })
      }
    );

    const data = await translated.json();
    results.push(...data.data.translations.map(t => t.translatedText));
  }

  return Response.json({
    bilingualSubtitles: subtitles.map((sub, idx) => ({
      ...sub,
      original: sub.text,
      translation: results[idx],
    }))
  });
}
```

**測試清單**：
- [ ] 100 條字幕批次翻譯
- [ ] 翻譯品質主觀評分
- [ ] API 成本記錄
- [ ] 翻譯速度測試

#### POC 3: 講義生成原型

```typescript
// app/api/notes/route.ts
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: Request) {
  const { subtitles, videoTitle } = await request.json();

  const transcript = subtitles.map(sub => sub.text).join(' ');

  const message = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 4000,
    messages: [{
      role: "user",
      content: `請為以下影片生成學習筆記（JSON 格式）：

標題：${videoTitle}

內容：${transcript}

輸出格式：
{
  "summary": "3 句話摘要",
  "keyPoints": [
    {"time": 123, "point": "知識點"}
  ],
  "detailedNotes": "# 標題\\n內容...",
  "studyTips": "學習建議"
}`
    }]
  });

  const notes = JSON.parse(message.content[0].text);
  return Response.json({ notes });
}
```

**測試清單**：
- [ ] 不同主題影片測試（教育、技術、娛樂）
- [ ] 筆記結構完整性檢查
- [ ] 時間戳準確性驗證
- [ ] Markdown 渲染測試

---

## 成功指標

### 技術指標
- Whisper 辨識準確率 > 90%
- 翻譯品質評分 > 4.0/5.0
- 講義生成成功率 > 95%
- 平均處理時間 < 影片時長 × 0.5

### 商業指標
- 月活躍用戶 (MAU) > 1,000
- 付費轉換率 > 5%
- 用戶留存率 (30 天) > 40%
- API 成本佔營收比 < 30%

### 用戶體驗指標
- 字幕同步滿意度 > 4.5/5.0
- 翻譯準確度評分 > 4.0/5.0
- 講義實用性評分 > 4.2/5.0
- 推薦意願 (NPS) > 50

---

## 總結

Plan-7 將 DubTitle 從基礎字幕工具升級為 **AI 驅動的智能語言學習平台**，核心優勢：

✅ **技術可行性高**：基於成熟的 API 服務（Groq、Claude、Google）
✅ **開發週期短**：MVP 僅需 2 週，完整版 2 個月
✅ **成本可控**：免費方案月成本 <$700，付費方案有盈利空間
✅ **擴展性強**：模組化設計，易於添加新功能
✅ **用戶價值明確**：解決語言學習、無障礙字幕、內容理解等痛點

**建議優先級**：
1. **Week 1-2**：Whisper 整合（解決無字幕影片問題）
2. **Week 3-4**：雙語翻譯（核心語言學習功能）
3. **Week 5-6**：講義模式（差異化競爭優勢）

**風險控制**：
- 從免費 API 額度開始測試
- 實作完整快取減少重複調用
- 設定每日成本上限警報

**下一步行動**：
1. 註冊 Groq + Anthropic API Keys
2. 建立 Whisper POC（本週完成）
3. 測試 3 部影片驗證可行性
4. 根據結果決定是否全面開發

---

**文檔版本**：1.0
**撰寫日期**：2025-11-16
**負責人**：Agent-PM
**狀態**：待執行（Pending Execution）
