# Teachable 投影片教學模式

## 功能概述

將 YouTube 影片字幕轉換為投影片式教學內容，提供沉浸式學習體驗。

## 使用方式

### 1. 訪問頁面

```
http://localhost:3000/teachable?v=VIDEO_ID
```

替換 `VIDEO_ID` 為實際的 YouTube 影片 ID。

### 2. 鍵盤快捷鍵

| 按鍵 | 功能 |
|------|------|
| ← | 上一張投影片 |
| → | 下一張投影片 |
| Space | 下一張投影片 |

### 3. 投影片類型

#### 內容投影片 (Content Slide)
- 大字體英文句子
- 中文翻譯
- 關鍵字彙卡片（2-4 個詞彙）

#### 單字詳解投影片 (Word Detail Slide)
- 單字標題與音標
- 詞性變換（動詞、名詞、形容詞等）
- 例句（含中文翻譯）
- 常見搭配用法

## 功能特點

### UI/UX
- 深色主題，護眼設計
- 藍色漸層（單字詳解投影片）
- 大字體易讀
- 淡入淡出動畫過場
- 載入動畫（AI 生成中...）

### 效能優化
- localStorage 快取，第二次載入即時
- 防抖處理，避免快速連按
- 進度指示器

### 邊界檢查
- 第一張投影片：禁用「上一張」按鈕
- 最後一張投影片：禁用「下一張」按鈕

## 技術架構

### 前端組件
- `TeachablePage` - 主頁面組件
- `ContentSlide` - 內容投影片組件
- `WordDetailSlide` - 單字詳解投影片組件

### API 整合
- `/api/subtitles` - 獲取字幕資料
- `/api/teachable/generate` - 生成投影片（AI）

### 資料流程
1. 從 URL 參數獲取 `videoId`
2. 檢查 localStorage 快取
3. 如果無快取：
   - 呼叫 `/api/subtitles` 獲取字幕
   - 呼叫 `/api/teachable/generate` 生成投影片
   - 存入 localStorage
4. 渲染投影片內容

## 開發測試

### 測試投影片切換
```javascript
// 在瀏覽器 Console 測試
// 模擬鍵盤事件
document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
```

### 清除快取
```javascript
// 清除特定影片的快取
localStorage.removeItem('dubtitle_teachable_VIDEO_ID');

// 清除所有快取
Object.keys(localStorage)
  .filter(key => key.startsWith('dubtitle_teachable_'))
  .forEach(key => localStorage.removeItem(key));
```

## 已知限制

1. **API 依賴**：需要 Agent-3 的 `/api/teachable/generate` API
2. **首次載入慢**：AI 生成需要 30-60 秒
3. **網路依賴**：需要網路連線獲取字幕和生成投影片

## 未來改進建議

### 功能增強
- [ ] 自動播放模式（設定間隔自動切換）
- [ ] 語音播放（TTS 朗讀英文句子）
- [ ] 筆記功能（每張投影片可添加個人筆記）
- [ ] 測驗模式（隱藏翻譯，測試理解）
- [ ] 匯出 Anki（生成 Anki 單字卡）

### UI 改進
- [ ] 投影片縮圖導航
- [ ] 全螢幕模式
- [ ] 暗色/亮色主題切換
- [ ] 字體大小調整
- [ ] 進度條

### 效能優化
- [ ] 預載下一張投影片
- [ ] 漸進式顯示（生成一張顯示一張）
- [ ] Service Worker 離線支援

## 維護資訊

- **創建者**: Agent-4
- **創建日期**: 2025-11-17
- **最後更新**: 2025-11-17
- **版本**: 1.0.0
