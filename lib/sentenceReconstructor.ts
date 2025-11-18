/**
 * lib/sentenceReconstructor.ts
 *
 * YouTube 字幕句子重組模塊
 *
 * 問題：YouTube 自動生成的字幕通常按時間切分，導致：
 * - 一個字幕可能只有 1-2 個字
 * - 完整的句子被分散在多個字幕條目中
 * - 影響 note 和 teachable 功能的內容品質
 *
 * 解決方案：在送給 AI API 之前，先將零散字幕重組成完整句子
 */

/**
 * 常見的縮寫詞（這些後面的點不算句子結束）
 */
const ABBREVIATIONS = new Set([
  'Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'Sr', 'Jr',
  'vs', 'etc', 'e.g', 'i.e', 'a.m', 'p.m',
  'St', 'Ave', 'Blvd', 'Rd', 'Lt', 'Col', 'Gen',
  'Inc', 'Corp', 'Ltd', 'Co', 'No', 'Vol',
  'Jan', 'Feb', 'Mar', 'Apr', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  // 常見的首字母縮寫
  'A', 'I', 'U', 'S', 'P', 'C', 'D', 'E', 'F', 'G', 'H', 'K', 'L', 'M', 'N', 'O', 'R', 'T', 'V', 'W', 'X', 'Y', 'Z',
]);

/**
 * 句子結束標記
 */
const SENTENCE_TERMINATORS = ['.', '!', '?', '。', '！', '？'];

/**
 * 檢查字串是否以句子結束符號結尾
 */
function endsWithTerminator(text: string): boolean {
  if (!text || text.length === 0) return false;
  const lastChar = text.trim().slice(-1);
  return SENTENCE_TERMINATORS.includes(lastChar);
}

/**
 * 檢查是否為數字小數點（例如 3.14）
 * 規則：點號前後都是數字
 */
function isDecimalPoint(text: string, dotIndex: number): boolean {
  if (dotIndex <= 0 || dotIndex >= text.length - 1) return false;

  const before = text[dotIndex - 1];
  const after = text[dotIndex + 1];

  return /\d/.test(before) && /\d/.test(after);
}

/**
 * 檢查是否為縮寫後的點號（例如 Mr. Dr. A.I.）
 * 規則：
 * 1. 點號前是已知的縮寫詞
 * 2. 或者是單個大寫字母（例如 U.S.A. 或 A.I.）
 */
function isAbbreviationDot(text: string, dotIndex: number): boolean {
  // 提取點號前的單詞
  const beforeDot = text.substring(0, dotIndex);
  const words = beforeDot.trim().split(/\s+/);
  const lastWord = words[words.length - 1];

  if (!lastWord) return false;

  // 檢查是否為已知縮寫
  if (ABBREVIATIONS.has(lastWord)) {
    return true;
  }

  // 檢查是否為單個大寫字母（如 U. S. A. 或 A. I.）
  if (/^[A-Z]$/.test(lastWord)) {
    return true;
  }

  // 檢查是否為多個字母的縮寫（如 MIT, USA）後面跟著點號
  // 這種情況下，通常是句子結束，不是縮寫
  // 但如果是 "A.I." 這種形式（單字母.單字母.），則是縮寫
  if (/^[A-Z]{2,}$/.test(lastWord)) {
    // 多個連續大寫字母後的點號，可能是句子結束（如 MIT.）
    // 但要檢查後面是否還有類似模式
    return false;
  }

  return false;
}

/**
 * 檢查點號是否在引號內
 * 規則：如果引號沒有閉合，則點號在引號內
 */
function isDotInsideQuote(text: string, dotIndex: number): boolean {
  const beforeDot = text.substring(0, dotIndex);

  // 計算各種引號的配對情況
  const doubleQuotes = (beforeDot.match(/"/g) || []).length;
  const singleQuotes = (beforeDot.match(/'/g) || []).length;
  const smartQuotesOpen = (beforeDot.match(/[「『"']/g) || []).length;
  const smartQuotesClose = (beforeDot.match(/[」』"']/g) || []).length;

  // 如果任何一種引號是奇數（未閉合），則點號在引號內
  if (doubleQuotes % 2 === 1) return true;
  if (singleQuotes % 2 === 1) return true;
  if (smartQuotesOpen > smartQuotesClose) return true;

  return false;
}

/**
 * 檢查是否為省略號（三個點 ...）
 * 省略號不算句子結束
 */
function isEllipsis(text: string, dotIndex: number): boolean {
  // 檢查是否為連續三個點
  if (dotIndex >= 2 &&
      text[dotIndex - 1] === '.' &&
      text[dotIndex - 2] === '.') {
    return true;
  }

  // 檢查是否為 Unicode 省略號字元
  if (text[dotIndex] === '…') {
    return true;
  }

  return false;
}

/**
 * 檢查文本是否代表真正的句子結束
 *
 * @param text 要檢查的文本
 * @returns true 表示句子結束，false 表示句子仍在繼續
 */
export function isSentenceEnd(text: string): boolean {
  if (!text || text.length === 0) return false;

  const trimmed = text.trim();
  if (trimmed.length === 0) return false;

  // 檢查是否以終止符號結尾
  if (!endsWithTerminator(trimmed)) {
    return false;
  }

  const lastChar = trimmed.slice(-1);

  // 處理英文句號（需要更多檢查）
  if (lastChar === '.') {
    const dotIndex = trimmed.length - 1;

    // 1. 檢查是否為省略號
    if (isEllipsis(trimmed, dotIndex)) {
      return false;
    }

    // 2. 檢查是否為小數點
    if (isDecimalPoint(trimmed, dotIndex)) {
      return false;
    }

    // 3. 檢查是否為縮寫
    if (isAbbreviationDot(trimmed, dotIndex)) {
      return false;
    }

    // 4. 檢查是否在引號內
    if (isDotInsideQuote(trimmed, dotIndex)) {
      return false;
    }

    // 通過所有檢查，這是真正的句子結束
    return true;
  }

  // 問號和驚嘆號通常代表句子結束（除非在引號內）
  if (lastChar === '!' || lastChar === '?') {
    const termIndex = trimmed.length - 1;

    // 檢查是否在引號內
    if (isDotInsideQuote(trimmed, termIndex)) {
      return false;
    }

    return true;
  }

  // 中文標點符號（句號、問號、驚嘆號）通常代表句子結束
  if (lastChar === '。' || lastChar === '！' || lastChar === '？') {
    return true;
  }

  return false;
}

/**
 * 檢查字串是否主要包含中文字元
 */
function isMostlyChinese(text: string): boolean {
  if (!text) return false;
  const chineseChars = text.match(/[\u4e00-\u9fa5]/g);
  const totalChars = text.replace(/\s/g, '').length;
  if (totalChars === 0) return false;
  return chineseChars && (chineseChars.length / totalChars) > 0.5;
}

/**
 * 清理句子內容
 * - 移除多餘的空白
 * - 修正標點符號前後的空格
 * - 確保句子首字母大寫
 * - 中文內容不加空格
 *
 * @param text 要清理的句子
 * @returns 清理後的句子
 */
export function cleanSentence(text: string): string {
  if (!text) return '';

  let cleaned = text;

  // 檢查是否為中文內容
  const isChinese = isMostlyChinese(cleaned);

  // 1. 統一空白字元（將所有空白字元轉換為普通空格）
  if (isChinese) {
    // 中文內容：移除所有空格（除非是英文單詞之間）
    // 保留英文單詞之間的空格，但移除中文字之間的空格
    cleaned = cleaned.replace(/([^\u4e00-\u9fa5\s])(\s+)([^\u4e00-\u9fa5\s])/g, '$1 $3'); // 保留英文間空格
    cleaned = cleaned.replace(/\s+/g, ''); // 移除其他所有空格
  } else {
    // 英文內容：統一空白
    cleaned = cleaned.replace(/\s+/g, ' ');
  }

  // 2. 移除標點符號前的空格
  // 例如："Hello ." -> "Hello."
  cleaned = cleaned.replace(/\s+([.,!?;:。！？；：])/g, '$1');

  // 3. 確保標點符號後有空格（如果後面還有文字，且不是中文）
  // 例如："Hello.World" -> "Hello. World"
  if (!isChinese) {
    cleaned = cleaned.replace(/([.,!?。！？])([A-Za-z])/g, '$1 $2');
  }

  // 4. 移除開頭和結尾的空白
  cleaned = cleaned.trim();

  // 5. 確保第一個字母大寫（僅針對英文）
  if (!isChinese && cleaned.length > 0 && /[a-z]/.test(cleaned[0])) {
    cleaned = cleaned[0].toUpperCase() + cleaned.slice(1);
  }

  // 6. 修正常見的雙空格問題（僅英文）
  if (!isChinese) {
    cleaned = cleaned.replace(/  +/g, ' ');
  }

  return cleaned;
}

/**
 * 檢查句子是否有意義（不是純空白或無意義的內容）
 *
 * @param text 要檢查的句子
 * @returns true 表示有意義，false 表示無意義
 */
export function isMeaningfulSentence(text: string): boolean {
  if (!text) return false;

  const trimmed = text.trim();

  // 太短的句子（少於 2 個字元）
  if (trimmed.length < 2) return false;

  // 只包含標點符號
  if (/^[.,!?;:\-\s]+$/.test(trimmed)) return false;

  // 只包含數字和標點
  if (/^[\d.,\s]+$/.test(trimmed)) return false;

  // 至少包含一個字母或中文字元
  if (!/[a-zA-Z\u4e00-\u9fa5]/.test(trimmed)) return false;

  return true;
}

/**
 * 將零散的字幕重組成完整句子
 *
 * 演算法：
 * 1. 遍歷所有字幕片段
 * 2. 累積文本直到遇到真正的句子結束標記
 * 3. 每個完整句子作為一個獨立項目
 * 4. 過濾掉無意義的句子
 * 5. 清理每個句子的格式
 *
 * @param subtitles 原始字幕陣列（每個元素是一個字幕片段）
 * @returns 重組後的完整句子陣列
 *
 * @example
 * // 輸入
 * const input = [
 *   'Hello',
 *   'world.',
 *   'How',
 *   'are',
 *   'you?',
 *   'I am',
 *   'fine.'
 * ];
 *
 * // 輸出
 * const output = reconstructSentences(input);
 * // ['Hello world.', 'How are you?', 'I am fine.']
 */
export function reconstructSentences(subtitles: string[]): string[] {
  if (!subtitles || subtitles.length === 0) {
    return [];
  }

  const reconstructed: string[] = [];
  let currentSentence = '';

  for (let i = 0; i < subtitles.length; i++) {
    const subtitle = subtitles[i];

    // 跳過空白或無效的字幕
    if (!subtitle || subtitle.trim().length === 0) {
      continue;
    }

    const trimmedSubtitle = subtitle.trim();

    // 累積當前句子
    if (currentSentence.length > 0) {
      // 如果累積的句子不是以空格結尾，且新片段不是標點符號開頭，則加空格
      const needsSpace = !currentSentence.endsWith(' ') &&
                        !/^[.,!?;:。！？；：]/.test(trimmedSubtitle);

      currentSentence += (needsSpace ? ' ' : '') + trimmedSubtitle;
    } else {
      currentSentence = trimmedSubtitle;
    }

    // 檢查是否為句子結束
    if (isSentenceEnd(currentSentence)) {
      // 清理並儲存完整句子
      const cleaned = cleanSentence(currentSentence);

      // 只保留有意義的句子
      if (isMeaningfulSentence(cleaned)) {
        reconstructed.push(cleaned);
      }

      // 重置當前句子
      currentSentence = '';
    }
  }

  // 處理剩餘的未完成句子
  if (currentSentence.length > 0) {
    const cleaned = cleanSentence(currentSentence);

    // 只保留有意義的句子
    if (isMeaningfulSentence(cleaned)) {
      reconstructed.push(cleaned);
    }
  }

  return reconstructed;
}

/**
 * 從字幕物件陣列中重組句子
 * 這是一個便捷函數，用於處理包含完整字幕資訊的物件
 *
 * @param subtitles 字幕物件陣列（每個物件包含 text, start, end 等屬性）
 * @returns 重組後的完整句子陣列
 *
 * @example
 * const subtitles = [
 *   { start: 0, end: 1, text: 'Hello' },
 *   { start: 1, end: 2, text: 'world.' },
 *   { start: 2, end: 3, text: 'How are' },
 *   { start: 3, end: 4, text: 'you?' }
 * ];
 *
 * const sentences = reconstructSentencesFromObjects(subtitles);
 * // ['Hello world.', 'How are you?']
 */
export function reconstructSentencesFromObjects(
  subtitles: Array<{ text: string; [key: string]: any }>
): string[] {
  const textArray = subtitles.map(sub => sub.text);
  return reconstructSentences(textArray);
}

/**
 * 獲取重組統計資訊
 * 用於調試和了解重組效果
 *
 * @param original 原始字幕陣列
 * @param reconstructed 重組後的句子陣列
 * @returns 統計資訊物件
 */
export function getReconstructionStats(
  original: string[],
  reconstructed: string[]
): {
  originalCount: number;
  reconstructedCount: number;
  compressionRatio: number;
  avgOriginalLength: number;
  avgReconstructedLength: number;
} {
  const originalCount = original.length;
  const reconstructedCount = reconstructed.length;

  const avgOriginalLength = originalCount > 0
    ? original.reduce((sum, text) => sum + text.length, 0) / originalCount
    : 0;

  const avgReconstructedLength = reconstructedCount > 0
    ? reconstructed.reduce((sum, text) => sum + text.length, 0) / reconstructedCount
    : 0;

  const compressionRatio = originalCount > 0
    ? reconstructedCount / originalCount
    : 0;

  return {
    originalCount,
    reconstructedCount,
    compressionRatio: Math.round(compressionRatio * 100) / 100,
    avgOriginalLength: Math.round(avgOriginalLength * 100) / 100,
    avgReconstructedLength: Math.round(avgReconstructedLength * 100) / 100,
  };
}
