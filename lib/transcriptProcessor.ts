// lib/transcriptProcessor.ts - 段落分割與處理邏輯

import { Subtitle, Paragraph, ParagraphOptions } from '@/types/note';

/**
 * 將字幕陣列轉換為段落
 * 規則：根據句尾標點合併 3-5 句為一段
 */
export function convertSubtitlesToParagraphs(
  subtitles: Subtitle[],
  options: ParagraphOptions = {}
): Paragraph[] {
  const {
    minSentences = 3,
    maxSentences = 5,
    maxLength = 150,
  } = options;

  const paragraphs: Paragraph[] = [];
  let currentSentences: Subtitle[] = [];
  let currentText = '';

  for (let i = 0; i < subtitles.length; i++) {
    const subtitle = subtitles[i];
    const text = subtitle.text.trim();

    if (!text) continue; // 跳過空白字幕

    currentSentences.push(subtitle);
    currentText += (currentText ? ' ' : '') + text;

    // 判斷是否應該結束當前段落
    const shouldEndParagraph =
      // 條件 1: 句尾有終止標點
      /[.!?]$/.test(text) &&
      // 條件 2: 已達最小句子數
      currentSentences.length >= minSentences &&
      // 條件 3: 滿足以下任一條件
      (
        // 3a. 已達最大句子數
        currentSentences.length >= maxSentences ||
        // 3b. 長度超過限制
        currentText.length >= maxLength ||
        // 3c. 下一句開頭是主題轉換詞
        (i + 1 < subtitles.length && isTopicTransition(subtitles[i + 1].text))
      );

    if (shouldEndParagraph) {
      paragraphs.push({
        id: paragraphs.length,
        english: currentText,
        chinese: '', // 待翻譯
        startTime: currentSentences[0].start,
        endTime: currentSentences[currentSentences.length - 1].end,
        subtitleIndices: currentSentences.map((_, idx) => i - currentSentences.length + 1 + idx),
      });

      currentSentences = [];
      currentText = '';
    }
  }

  // 處理剩餘句子
  if (currentSentences.length > 0) {
    paragraphs.push({
      id: paragraphs.length,
      english: currentText,
      chinese: '',
      startTime: currentSentences[0].start,
      endTime: currentSentences[currentSentences.length - 1].end,
      subtitleIndices: currentSentences.map((_, idx) => subtitles.length - currentSentences.length + idx),
    });
  }

  return paragraphs;
}

/**
 * 判斷是否為主題轉換詞
 */
function isTopicTransition(text: string): boolean {
  const transitionWords = [
    'However',
    'Moreover',
    'Furthermore',
    'Therefore',
    'Nevertheless',
    'On the other hand',
    'In addition',
    'First',
    'Second',
    'Finally',
    'In conclusion',
    'To summarize',
  ];

  return transitionWords.some(word => text.trim().startsWith(word));
}

/**
 * 批次分組（用於翻譯）
 * 將段落分成多批，避免超過 API 限制
 */
export function createTranslationBatches(
  paragraphs: Paragraph[],
  maxBatchSize: number = 100
): string[][] {
  const batches: string[][] = [];
  
  for (let i = 0; i < paragraphs.length; i += maxBatchSize) {
    const batch = paragraphs
      .slice(i, i + maxBatchSize)
      .map(p => p.english);
    batches.push(batch);
  }

  return batches;
}

/**
 * 應用翻譯結果到段落
 */
export function applyTranslations(
  paragraphs: Paragraph[],
  translations: string[]
): Paragraph[] {
  if (paragraphs.length !== translations.length) {
    console.warn(`段落數量 (${paragraphs.length}) 與翻譯數量 (${translations.length}) 不符`);
  }

  return paragraphs.map((paragraph, index) => ({
    ...paragraph,
    chinese: translations[index] || paragraph.english, // 翻譯失敗則使用原文
  }));
}

/**
 * 估算文本的 token 數量（粗略估算）
 */
export function estimateTokens(text: string): number {
  // 英文約 4 字元 = 1 token
  return Math.ceil(text.length / 4);
}

/**
 * 句子重組：將字幕片段重組為完整句子
 * 用於 Teachable 投影片生成（每張投影片顯示一個完整句子）
 */
export interface ReconstructedSentence {
  id: number;
  text: string;
  startTime: number;
  endTime: number;
  subtitleIndices: number[]; // 原始字幕索引
}

export function reconstructSentences(transcript: string[]): ReconstructedSentence[] {
  const sentences: ReconstructedSentence[] = [];
  let currentText = '';
  let currentIndices: number[] = [];
  let sentenceStartIndex = 0;

  for (let i = 0; i < transcript.length; i++) {
    const text = transcript[i].trim();
    if (!text) continue; // 跳過空白字幕

    // 記錄索引
    currentIndices.push(i);

    // 合併文本
    currentText += (currentText ? ' ' : '') + text;

    // 檢查是否為句尾（包含終止標點）
    const isSentenceEnd = /[.!?]$/.test(text);

    if (isSentenceEnd) {
      // 完成一個句子
      sentences.push({
        id: sentences.length,
        text: currentText,
        startTime: sentenceStartIndex,
        endTime: i,
        subtitleIndices: [...currentIndices],
      });

      // 重置
      currentText = '';
      currentIndices = [];
      sentenceStartIndex = i + 1;
    }
  }

  // 處理最後的殘留文本（沒有終止標點的情況）
  if (currentText.trim()) {
    sentences.push({
      id: sentences.length,
      text: currentText,
      startTime: sentenceStartIndex,
      endTime: transcript.length - 1,
      subtitleIndices: [...currentIndices],
    });
  }

  return sentences;
}

/**
 * 將字幕片段重組為完整句子（僅返回文本陣列）
 * 這是 reconstructSentences 的簡化版本，用於不需要時間戳的場景（如 Note API）
 *
 * @param transcript - 原始字幕陣列（字串陣列）
 * @returns 重組後的完整句子陣列（字串陣列）
 *
 * @example
 * Input:  ['Hello', 'world.', 'How are', 'you?']
 * Output: ['Hello world.', 'How are you?']
 */
export function reconstructSentencesSimple(transcript: string[]): string[] {
  if (!transcript || transcript.length === 0) {
    return [];
  }

  const sentences: string[] = [];
  let currentSentence = '';

  for (const fragment of transcript) {
    const trimmed = fragment.trim();

    // 跳過空字幕
    if (!trimmed) continue;

    // 將片段加入當前句子
    currentSentence += (currentSentence ? ' ' : '') + trimmed;

    // 如果片段以句尾標點結束，表示句子完成
    if (/[.!?]$/.test(trimmed)) {
      sentences.push(currentSentence);
      currentSentence = '';
    }
  }

  // 處理最後的未完成句子
  if (currentSentence) {
    sentences.push(currentSentence);
  }

  return sentences;
}
