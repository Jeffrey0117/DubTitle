# 難字分析功能修復報告

## 發現的問題

### 1. **原始實現的問題**
- ❌ 批次分析所有字幕（一次性分析全部）
- ❌ 太慢、太貴、沒必要
- ❌ 沒有調試輸出，無法追蹤問題
- ❌ 可能因為 API 超時或錯誤導致沒有單字顯示

### 2. **API 設計問題**
- 舊 API 接受整個字幕陣列，循環分析所有句子
- 對於長視頻（100+ 句字幕），會產生大量 API 請求
- 沒有錯誤處理和調試輸出

## 實施的解決方案

### 1. **API Route 重構** (`/app/api/analyze-vocabulary/route.ts`)

#### 變更前：
```typescript
// 接受整個字幕陣列，批次處理
const { videoId, subtitles } = await request.json();
for (let i = 0; i < subtitles.length; i++) {
  // 循環分析每一句...
}
```

#### 變更後：
```typescript
// 只接受單句字幕
const { videoId, subtitleIndex, text } = await request.json();
// 分析這一句並返回結果
```

#### 新增功能：
- ✅ **詳細的 console.log 調試輸出**
  - API 請求參數
  - Groq API 回應狀態
  - 原始回應內容
  - 解析結果
  - 錯誤信息
- ✅ **API Key 檢查**
- ✅ **更好的錯誤處理**

### 2. **前端智能按需分析** (`/app/subtitle/page.tsx`)

#### 核心策略：
```
播放字幕 → 檢查快取 → 沒有快取才呼叫 API → 存入快取
```

#### 實現細節：

##### A. 新增狀態管理
```typescript
const [currentSubtitleIndex, setCurrentSubtitleIndex] = useState<number>(-1);
const analyzingRef = useRef<Set<number>>(new Set()); // 追蹤正在分析的字幕
```

##### B. 快取機制
```typescript
// 啟動時載入快取
const loadVocabularyCache = (id: string) => {
  const cacheKey = `${VOCABULARY_CACHE_PREFIX}${id}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    setVocabularyMap(JSON.parse(cached));
  }
};
```

##### C. 按需分析函數
```typescript
const analyzeSubtitle = async (index: number, text: string) => {
  // 1. 避免重複分析
  if (analyzingRef.current.has(index)) return;

  // 2. 檢查快取
  if (vocabularyMap[index] !== undefined) return;

  // 3. 呼叫 API 分析單句
  const response = await fetch('/api/analyze-vocabulary', {
    method: 'POST',
    body: JSON.stringify({ videoId, subtitleIndex: index, text }),
  });

  // 4. 更新狀態並存入快取
  setVocabularyMap(prev => {
    const updated = { ...prev, [index]: data.vocabulary };
    localStorage.setItem(cacheKey, JSON.stringify(updated));
    return updated;
  });
};
```

##### D. 自動觸發分析
```typescript
useEffect(() => {
  // 當字幕切換時
  const newIndex = subtitles.findIndex(
    (sub) => currentTime >= sub.start && currentTime <= sub.end
  );

  if (newIndex !== currentSubtitleIndex) {
    setCurrentSubtitleIndex(newIndex);

    // 自動分析新字幕（如果沒快取）
    if (newIndex >= 0) {
      analyzeSubtitle(newIndex, subtitles[newIndex].text);
    }
  }
}, [currentTime, subtitles, currentSubtitleIndex]);
```

### 3. **UI 調試信息**

#### 新增調試面板（右上角）：
```
VideoID: xxx
字幕數: 123
當前索引: 5
快取條目: 12
當前難字: 2
正在分析: 否
```

#### 難字顯示優化：
- 顯示當前字幕索引
- 顯示該字幕的難字列表
- 移動到左側避免遮擋

## 調試輸出

### API Route 輸出
```
[API] 收到分析請求: { videoId: 'xxx', subtitleIndex: 5, text: 'Hello...' }
[API] 準備呼叫 Groq API...
[API] Groq API 回應狀態: 200
[API] Groq API 原始回應: [{"word":"sophisticated","translation":"複雜的"}]
[API] 解析成功，難字數量: 1 [{ word: 'sophisticated', translation: '複雜的' }]
```

### 前端輸出
```
[前端] 沒有快取資料
[前端] 字幕切換: -1 -> 0
[前端] 開始分析字幕 0: Hello, this is a sophisticated...
[前端] API 回應: { success: true, vocabulary: [...] }
[前端] 字幕 0 分析完成，難字數: 1 [{ word: 'sophisticated', translation: '複雜的' }]
[前端] 當前字幕 0 難字: [{ word: 'sophisticated', translation: '複雜的' }]
```

## 性能優化

### 變更前：
- 載入視頻 → 批次分析全部字幕（例如 100 句）
- 需要等待 100 次 API 請求完成
- 耗時：~30-60 秒
- API 使用量：100 次請求

### 變更後：
- 載入視頻 → 從快取載入已分析的結果
- 播放到新字幕 → 只分析這一句（如果沒快取）
- 耗時：~1-2 秒/句
- API 使用量：只有實際觀看的字幕才會分析

### 實際場景：
用戶觀看 10 分鐘視頻（共 100 句字幕），只看了前 20 句：
- **舊方案**：分析 100 句，100 次 API 請求
- **新方案**：分析 20 句，20 次 API 請求
- **節省**：80% API 使用量

## 快取機制

### 快取鍵格式：
```
dubtitle_vocab_{videoId}
```

### 快取內容結構：
```json
{
  "0": [{ "word": "sophisticated", "translation": "複雜的" }],
  "5": [{ "word": "essential", "translation": "必要的" }],
  "12": []
}
```

### 快取生命週期：
- 首次播放：按需分析並存入快取
- 重複播放：直接從快取讀取
- 換視頻：使用新的快取鍵
- 清除快取：手動清除 localStorage 或更換瀏覽器

## 測試步驟

1. **啟動開發服務器**：
   ```bash
   npm run dev
   ```

2. **打開主頁面**：
   - 輸入 YouTube 視頻 ID
   - 等待字幕載入

3. **打開字幕頁面** (`/subtitle`)：
   - 查看右上角調試面板
   - 確認字幕數量正確
   - 確認快取條目為 0（首次）

4. **開始播放視頻**：
   - 觀察控制台輸出
   - 當字幕切換時，應該看到：
     - `[前端] 字幕切換: X -> Y`
     - `[前端] 開始分析字幕 Y: ...`
     - `[API] 收到分析請求: ...`
     - `[API] 解析成功，難字數量: ...`
     - `[前端] 字幕 Y 分析完成...`

5. **檢查難字顯示**：
   - 左上角應該顯示當前字幕的難字
   - 格式：`word : translation`

6. **測試快取**：
   - 返回已播放過的字幕
   - 應該看到：`[前端] 字幕 X 已有快取，難字數: Y`
   - 不應該再次呼叫 API

## 環境變數檢查

確保 `.env.local` 包含：
```
GROQ_API_KEY=gsk_...
```

如果 API Key 未設置，會看到：
```
[API] GROQ_API_KEY 未設置
```

## 可能的問題排查

### 問題 1：沒有難字顯示
**檢查**：
1. 控制台是否有 `[前端] 字幕切換` 輸出？
2. 控制台是否有 `[API] 收到分析請求` 輸出？
3. 調試面板顯示的 "當前索引" 是否正確？
4. 調試面板顯示的 "快取條目" 是否增加？

### 問題 2：API 錯誤
**檢查**：
1. 控制台是否有 `[API] Groq API 錯誤` 輸出？
2. 檢查 `.env.local` 中的 API Key 是否正確
3. 檢查網絡連接

### 問題 3：字幕索引錯誤
**檢查**：
1. 調試面板的 "當前索引" 是否隨視頻播放變化？
2. 控制台是否有 `[前端] 字幕切換` 輸出？

## 結論

### 修復內容：
✅ 從批次分析改為智能按需分析
✅ 添加詳細的調試輸出
✅ 實現快取機制避免重複分析
✅ 添加 UI 調試面板
✅ 優化 API 使用量（節省 80%+）
✅ 提升用戶體驗（即時分析，無需等待）

### 技術亮點：
- **智能快取**：localStorage 持久化，換頁不丟失
- **按需加載**：只分析實際觀看的字幕
- **防重複**：使用 `Set` 追蹤正在分析的字幕
- **詳細日誌**：前端和後端都有完整的調試輸出
- **錯誤處理**：API 錯誤不會導致功能崩潰

### 未來優化方向：
- [ ] 預加載：提前分析接下來的 2-3 句字幕
- [ ] 批次優化：合併相近時間的 API 請求
- [ ] 離線模式：支持導出/導入詞彙快取
- [ ] UI 改進：可切換調試面板顯示/隱藏
