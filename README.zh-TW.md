<div align="center">

# DubTitle

**YouTube 雙字幕系統**

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

極簡的 YouTube 雙字幕顯示系統，靈感來自 Anthony Fu 的極簡設計風格。

[快速開始](#快速開始) · [功能特性](#功能特性) · [技術棧](#技術棧) · [English](README.md)

</div>

---

## 功能特性

| 功能 | 說明 |
|------|------|
| 🎥 YouTube 播放器 | 輸入連結即可播放 |
| 📝 雙字幕顯示 | 獨立字幕面板，支援自訂樣式 |
| 🎨 樣式自訂 | 背景顏色 / 字幕顏色 / 字體大小 (16–64px) |
| 🖥️ 雙視窗佈局 | 類似簡報的分屏設計 |
| 🤖 AI 難字分析 | 結合 AI 自動分析生字難詞 |
| ✨ 極簡 UI | 深色主題，去除一切不必要的元素 |

## 快速開始

```bash
# 安裝依賴
npm install

# 啟動開發伺服器
npm run dev
```

開啟瀏覽器造訪 **[http://localhost:3000](http://localhost:3000)**

## 使用方法

1. 在左側輸入框中貼上 YouTube 影片連結
2. 點選「載入影片」按鈕
3. 影片在左側播放，字幕在右側顯示
4. 使用底部控制面板自訂字幕樣式

## 技術棧

| 類別 | 技術 |
|------|------|
| 框架 | Next.js 15 (App Router) |
| 語言 | TypeScript |
| 樣式 | Tailwind CSS |
| AI | Anthropic SDK / Groq SDK |
| 字幕 | youtube-caption-extractor |

## 專案結構

```
dubtitle/
├── app/
│   ├── layout.tsx            # 根佈局
│   ├── page.tsx              # 首頁（雙視窗佈局）
│   └── globals.css           # 全域樣式
├── components/
│   ├── YouTubePlayer.tsx     # YouTube 播放器元件
│   ├── SubtitlePanel.tsx     # 字幕面板元件
│   └── StyleControl.tsx      # 樣式控制元件
└── scripts/
    └── clean-restart.js      # 清理 / 重啟腳本
```

## 開發路線

- [x] **Phase 1** — 基礎 MVP：雙視窗佈局、YouTube 播放、字幕樣式
- [x] **Phase 2** — 真實字幕整合：多語言支援、VTT 解析、智慧同步
- [x] **Phase 3** — AI 難字分析：結合 AI 自動分析字幕中的生字難詞
- [ ] 多語言字幕切換
- [ ] 字幕下載功能
- [ ] 響應式設計優化
- [ ] 字幕快取機制

## 設計理念

> 遵循「不過度開發」原則 — 純前端實作、極簡 UI、專注核心功能。

## 授權

[MIT](LICENSE)
