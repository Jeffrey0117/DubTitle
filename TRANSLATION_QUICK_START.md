# 字幕翻译方案 - 快速启动指南

## 一分钟速览

**推荐方案**: Google Gemini 1.5 Flash（批次模式）

| 指标 | 数值 |
|------|------|
| **成本** | $0.08 / 100分钟视频 |
| **速度** | 30-120秒（批次处理）|
| **品质** | 8.5/10 |
| **实施难度** | 6/10（中等）|

---

## 快速决策树

```
需要实时翻译（直播）？
├─ 是 → Claude Haiku ($0.30/100min, 200ms延迟)
└─ 否 ↓

预算极度受限？
├─ 是 → Gemini Flash Batch ($0.08/100min) ⭐ 推荐
└─ 否 ↓

追求极致品质？
├─ 是 → GPT-4o ($0.63/100min, 9.5/10品质)
└─ 否 → Gemini Flash（平衡方案）
```

---

## 3 步开始实施

### Step 1: 注册 API（5 分钟）

```bash
# 访问 Google AI Studio
https://makersuite.google.com/app/apikey

# 创建 API Key
# 复制到 .env.local
GEMINI_API_KEY=your_key_here
```

### Step 2: 安装依赖（2 分钟）

```bash
npm install @google/generative-ai
```

### Step 3: 实现翻译 API（30 分钟）

```typescript
// app/api/translate/route.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: Request) {
  const { subtitles, targetLang } = await request.json();

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `
翻译以下字幕到${targetLang}，保留 SRT 格式：
${subtitles}
  `;

  const result = await model.generateContent(prompt);
  const translated = result.response.text();

  return Response.json({ translated });
}
```

---

## 常见问题 FAQ

### Q1: 为什么不用 DeepL？
**A**: DeepL 成本是 Gemini 的 23 倍（$1.88 vs $0.08），除非欧洲语言对且预算充足。

### Q2: 批次翻译多久完成？
**A**: 100 分钟视频约 1,500 条字幕，批次处理 30-120 秒。

### Q3: 如何保证时间轴不乱？
**A**: Prompt 明确要求保留时间轴 + 后端验证机制。

### Q4: 能否支持多语言同时翻译？
**A**: 可以，并行调用 API，成本线性增长。

### Q5: 翻译品质如何验证？
**A**: 抽样人工审核 + 用户反馈系统 + 置信度评分。

---

## 成本速查表

| 视频长度 | Gemini Flash | Claude Haiku | GPT-4o | DeepL |
|----------|--------------|--------------|--------|-------|
| 10 分钟  | $0.008       | $0.03        | $0.06  | $0.19 |
| 30 分钟  | $0.024       | $0.09        | $0.19  | $0.56 |
| 60 分钟  | $0.048       | $0.18        | $0.38  | $1.13 |
| 100 分钟 | $0.080       | $0.30        | $0.63  | $1.88 |

---

## 风险提示

1. **API 限流**: 每分钟 60 请求上限（Gemini 免费层）
2. **格式破坏**: 10% 概率需要重试
3. **专有名词**: 需要术语表辅助
4. **成本控制**: 设置月度预算警报

---

## 推荐阅读顺序

1. 本文档（快速启动）
2. `TRANSLATION_SOLUTION_REPORT.md`（完整分析）
3. Google Gemini 官方文档
4. 开始编码！

---

**最后更新**: 2025-11-16
**版本**: 1.0
