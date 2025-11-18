// types/note.ts - Note 頁面類型定義

/**
 * 字幕項目
 */
export interface Subtitle {
  start: number;
  end: number;
  text: string;
}

/**
 * 段落（合併多句字幕）
 */
export interface Paragraph {
  id: number;
  english: string;
  chinese: string;
  startTime?: number;
  endTime?: number;
  subtitleIndices?: number[]; // 包含的字幕索引
}

/**
 * Note 生成 API 請求
 */
export interface GenerateNoteRequest {
  videoId: string;
  subtitles?: Subtitle[]; // 可選：如果沒有則自動從 /api/subtitles 獲取
  forceRegenerate?: boolean; // 強制重新生成（忽略快取）
}

/**
 * Note 生成 API 回應
 */
export interface GenerateNoteResponse {
  success: boolean;
  videoId: string;
  paragraphs: Paragraph[];
  stats?: {
    totalSubtitles: number;
    totalParagraphs: number;
    avgParagraphLength: number;
    translationMethod: string;
    fromCache: boolean;
    processingTime: number; // 毫秒
  };
  error?: string;
}

/**
 * 翻譯批次
 */
export interface TranslationBatch {
  texts: string[];
  startIndex: number;
  endIndex: number;
}

/**
 * 段落分割選項
 */
export interface ParagraphOptions {
  minSentences?: number; // 最少句子數（預設 3）
  maxSentences?: number; // 最多句子數（預設 5）
  maxLength?: number; // 最大字元數（預設 150）
}
