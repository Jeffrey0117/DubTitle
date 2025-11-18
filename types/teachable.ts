/**
 * Teachable 投影片教材類型定義
 * 用於 AI 生成的英語教學投影片系統
 */

/**
 * 詞彙項目 - 出現在內容投影片中
 */
export interface VocabularyItem {
  /** 英文單字或片語 */
  word: string;
  /** 發音（音標）- 可選 */
  pronunciation?: string;
  /** 詞性（n., v., adj., adv., phrase 等）- 可選 */
  partOfSpeech?: string;
  /** 中文翻譯 */
  translation: string;
  /** 補充說明（如常見搭配、用法說明等）- 可選 */
  note?: string;
}

/**
 * 單字詳解 - 用於詞彙詳解投影片
 */
export interface WordDetail {
  /** 單字 */
  word: string;
  /** 發音（音標） */
  pronunciation: string;
  /** 詞性變換 */
  wordForms: Array<{
    /** 詞性 (n./v./adj./adv.) */
    pos: string;
    /** 變化形式 */
    form: string;
    /** 中文翻譯 */
    translation: string;
  }>;
  /** 例句 */
  examples: Array<{
    /** 英文例句 */
    english: string;
    /** 中文翻譯 */
    chinese: string;
  }>;
  /** 常見搭配 */
  collocations: string[];
}

/**
 * 投影片 - 基礎類型
 */
export interface TeachableSlide {
  /** 投影片 ID（唯一） */
  id: number;
  /** 投影片類型 */
  type: 'content' | 'word-detail';

  // 內容投影片欄位
  /** 英文句子（僅 content 類型） */
  english?: string;
  /** 中文翻譯（僅 content 類型） */
  chinese?: string;
  /** 關鍵詞彙列表（僅 content 類型） */
  vocabulary?: VocabularyItem[];

  // 詞彙詳解投影片欄位
  /** 詞彙詳細資訊（僅 word-detail 類型） */
  wordDetail?: WordDetail;
}

/**
 * Vocabulary Cache 格式
 */
export interface VocabularyCache {
  [subtitleIndex: number]: VocabularyItem[];
}

/**
 * API 請求格式
 */
export interface GenerateTeachableRequest {
  /** YouTube 影片 ID */
  videoId: string;
  /** 逐字稿（字幕文字陣列） */
  transcript: string[];
  /** Vocabulary cache（從 localStorage 傳入）- 可選 */
  vocabularyCache?: VocabularyCache;
  /** 是否強制重新生成（忽略快取） */
  forceRegenerate?: boolean;
}

/**
 * API 回應格式
 */
export interface GenerateTeachableResponse {
  /** 是否成功 */
  success: boolean;
  /** 錯誤訊息 */
  error?: string;
  /** 投影片陣列 */
  slides?: TeachableSlide[];
  /** 統計資訊 */
  stats?: {
    /** 總投影片數 */
    totalSlides: number;
    /** 內容投影片數 */
    contentSlides: number;
    /** 詞彙詳解投影片數 */
    detailSlides: number;
    /** 總詞彙數 */
    totalVocabulary: number;
    /** Token 使用量 */
    tokensUsed: {
      input: number;
      output: number;
      total: number;
    };
    /** 是否來自快取 */
    fromCache: boolean;
    /** 處理時間（毫秒） */
    processingTime: number;
  };
}

/**
 * Claude API 請求的 JSON Schema
 * 用於 Structured Output，確保格式正確
 */
export const TEACHABLE_SLIDE_SCHEMA = {
  type: "object",
  properties: {
    slides: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "number" },
          type: { type: "string", enum: ["content", "word-detail"] },
          english: { type: "string" },
          chinese: { type: "string" },
          vocabulary: {
            type: "array",
            items: {
              type: "object",
              properties: {
                chinese: { type: "string" },
                english: { type: "string" },
                needsDetail: { type: "boolean" }
              },
              required: ["chinese", "english", "needsDetail"]
            }
          },
          wordDetail: {
            type: "object",
            properties: {
              word: { type: "string" },
              pronunciation: { type: "string" },
              wordForms: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    pos: { type: "string" },
                    form: { type: "string" },
                    translation: { type: "string" }
                  },
                  required: ["pos", "form", "translation"]
                }
              },
              examples: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    english: { type: "string" },
                    chinese: { type: "string" }
                  },
                  required: ["english", "chinese"]
                }
              },
              collocations: {
                type: "array",
                items: { type: "string" }
              }
            },
            required: ["word", "pronunciation", "wordForms", "examples", "collocations"]
          }
        },
        required: ["id", "type"]
      }
    }
  },
  required: ["slides"]
};
