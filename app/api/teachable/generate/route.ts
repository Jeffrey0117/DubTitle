import { NextRequest, NextResponse } from 'next/server';
import { reconstructSentences, ReconstructedSentence } from '@/lib/transcriptProcessor';

interface VocabularyItem {
  word: string;
  pronunciation?: string;
  partOfSpeech?: string;
  translation: string;
  note?: string;
}

interface TeachableSlide {
  id: number;
  type: 'content';
  english: string;
  chinese: string;
  vocabulary: VocabularyItem[];
}

interface VocabularyCache {
  [subtitleIndex: number]: VocabularyItem[];
}

const serverCache = new Map<string, { slides: TeachableSlide[]; timestamp: number }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000;

// 批次翻譯設定
const BATCH_SIZE = 40; // 每批最大句數
const MAX_RETRIES = 2; // 最大重試次數
const RETRY_DELAY = 1000; // 重試間隔（毫秒）

/**
 * 將陣列分割成指定大小的批次
 */
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * 延遲指定毫秒數
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 嘗試修復不完整的 JSON
 */
function tryRepairJSON(jsonString: string): string {
  let repaired = jsonString.trim();

  // 移除 markdown 標記
  repaired = repaired
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  // 如果以 { 開頭但沒有結尾 }，嘗試補上
  if (repaired.startsWith('{') && !repaired.endsWith('}')) {
    // 嘗試找到最後一個完整的翻譯項目
    const lastValidQuote = repaired.lastIndexOf('"');
    if (lastValidQuote > 0) {
      // 檢查是否在陣列中
      const lastBracket = repaired.lastIndexOf('[');
      if (lastBracket > 0) {
        // 截斷到最後一個完整的引號，補上 ]}
        repaired = repaired.substring(0, lastValidQuote + 1) + ']}';
      }
    }
  }

  // 檢查是否缺少結尾的 ]
  const openBrackets = (repaired.match(/\[/g) || []).length;
  const closeBrackets = (repaired.match(/\]/g) || []).length;
  if (openBrackets > closeBrackets) {
    repaired = repaired + ']'.repeat(openBrackets - closeBrackets);
  }

  // 檢查是否缺少結尾的 }
  const openBraces = (repaired.match(/\{/g) || []).length;
  const closeBraces = (repaired.match(/\}/g) || []).length;
  if (openBraces > closeBraces) {
    repaired = repaired + '}'.repeat(openBraces - closeBraces);
  }

  return repaired;
}

function getCachedSlides(videoId: string): TeachableSlide[] | null {
  const cached = serverCache.get(videoId);
  if (!cached) return null;
  const now = Date.now();
  if (now - cached.timestamp > CACHE_DURATION) {
    serverCache.delete(videoId);
    return null;
  }
  return cached.slides;
}

function setCachedSlides(videoId: string, slides: TeachableSlide[]): void {
  serverCache.set(videoId, { slides, timestamp: Date.now() });
}

/**
 * 翻譯單一批次（含重試機制）
 */
async function translateBatchWithRetry(
  batch: string[],
  apiKey: string,
  batchIndex: number,
  totalBatches: number,
  retries: number = 0
): Promise<{ translations: string[]; tokensUsed: { input: number; output: number } }> {
  // 將批次句子組合成編號列表
  const numberedSentences = batch
    .map((text, index) => `${index + 1}. ${text}`)
    .join('\n');

  const prompt = `翻譯為繁體中文，共${batch.length}句：
${numberedSentences}
輸出：{"t":["翻譯1","翻譯2"]}`;

  try {
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: '翻譯專家。輸出JSON：t=translations陣列'
          },
          { role: 'user', content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      throw new Error(`Groq API error: ${groqResponse.status} - ${errorText}`);
    }

    const groqData = await groqResponse.json();
    const responseText = groqData.choices?.[0]?.message?.content?.trim() || '{}';

    // 解析 JSON（response_format 已強制 JSON 輸出）
    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch (parseError) {
      // 備用：嘗試修復 JSON
      console.warn(`[Teachable API] 批次 ${batchIndex + 1}/${totalBatches} JSON 解析失敗，嘗試修復...`);
      const repairedText = tryRepairJSON(responseText);
      parsed = JSON.parse(repairedText);
      console.log(`[Teachable API] 批次 ${batchIndex + 1}/${totalBatches} JSON 修復成功`);
    }

    // 支援縮短欄位名稱：t=translations
    const translations = parsed.t || parsed.translations || [];

    const tokensUsed = {
      input: groqData.usage?.prompt_tokens || 0,
      output: groqData.usage?.completion_tokens || 0,
    };

    // 確保翻譯數量與批次句子數量一致
    if (translations.length !== batch.length) {
      console.warn(`[Teachable API] 批次 ${batchIndex + 1}/${totalBatches} 翻譯數量不匹配:`, {
        expected: batch.length,
        received: translations.length
      });
      // 補齊缺少的翻譯
      while (translations.length < batch.length) {
        translations.push(batch[translations.length]);
      }
      // 截斷多餘的翻譯
      if (translations.length > batch.length) {
        translations.length = batch.length;
      }
    }

    console.log(`[Teachable API] 批次 ${batchIndex + 1}/${totalBatches} 完成 (${translations.length} 句)`);
    return { translations, tokensUsed };

  } catch (error: any) {
    console.error(`[Teachable API] 批次 ${batchIndex + 1}/${totalBatches} 翻譯錯誤 (重試 ${retries}/${MAX_RETRIES}):`, error.message);

    // 重試機制
    if (retries < MAX_RETRIES) {
      console.log(`[Teachable API] 等待 ${RETRY_DELAY}ms 後重試...`);
      await sleep(RETRY_DELAY);
      return translateBatchWithRetry(batch, apiKey, batchIndex, totalBatches, retries + 1);
    }

    // 所有重試都失敗，降級處理：使用原文作為翻譯
    console.warn(`[Teachable API] 批次 ${batchIndex + 1}/${totalBatches} 所有重試失敗，使用原文作為翻譯`);
    return {
      translations: batch, // 返回原文
      tokensUsed: { input: 0, output: 0 }
    };
  }
}

/**
 * 批次翻譯所有句子為繁體中文
 * 分批處理以避免 JSON 截斷問題，包含重試機制和錯誤恢復
 */
async function batchTranslateToTraditionalChinese(
  sentences: string[],
  apiKey: string
): Promise<{ translations: string[]; tokensUsed: { input: number; output: number } }> {
  // 分批處理
  const batches = chunkArray(sentences, BATCH_SIZE);
  const totalBatches = batches.length;

  console.log(`[Teachable API] 開始批次翻譯 ${sentences.length} 句（分 ${totalBatches} 批，每批最多 ${BATCH_SIZE} 句）...`);

  const allTranslations: string[] = [];
  let totalTokens = { input: 0, output: 0 };

  // 依序處理每個批次
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const result = await translateBatchWithRetry(batch, apiKey, i, totalBatches);
    allTranslations.push(...result.translations);
    totalTokens.input += result.tokensUsed.input;
    totalTokens.output += result.tokensUsed.output;

    // 在批次之間稍作延遲，避免 rate limiting
    if (i < batches.length - 1) {
      await sleep(200);
    }
  }

  console.log(`[Teachable API] 批次翻譯完成，總計 ${allTranslations.length} 句, tokens:`, totalTokens);

  return { translations: allTranslations, tokensUsed: totalTokens };
}

/**
 * 將 vocabulary cache 從原始字幕索引映射到重組後的句子
 *
 * @param sentences - 重組後的句子陣列
 * @param vocabCache - 原始的 vocabulary cache（以字幕索引為 key）
 * @returns 每個句子對應的 vocabulary 陣列
 */
function mapVocabularyToSentences(
  sentences: ReconstructedSentence[],
  vocabCache: VocabularyCache
): VocabularyItem[][] {
  const result: VocabularyItem[][] = [];

  for (const sentence of sentences) {
    const vocabularyForSentence: VocabularyItem[] = [];
    const seenWords = new Set<string>(); // 避免重複單字

    // 收集該句子包含的所有原始字幕索引的 vocabulary
    for (const subtitleIndex of sentence.subtitleIndices) {
      const vocab = vocabCache[subtitleIndex];
      if (vocab && Array.isArray(vocab)) {
        for (const item of vocab) {
          // 避免重複加入相同單字
          if (!seenWords.has(item.word)) {
            vocabularyForSentence.push(item);
            seenWords.add(item.word);
          }
        }
      }
    }

    result.push(vocabularyForSentence);
  }

  return result;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { videoId, transcript, vocabularyCache, forceRegenerate } = body;

    console.log('[Teachable API] Request:', {
      videoId,
      transcriptLines: transcript?.length,
      vocabularyCacheSize: vocabularyCache ? Object.keys(vocabularyCache).length : 0,
      forceRegenerate
    });

    // 驗證必要參數
    if (!videoId || !transcript || !Array.isArray(transcript) || transcript.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing videoId or transcript' },
        { status: 400 }
      );
    }

    // 檢查伺服器快取（除非強制重新生成）
    if (!forceRegenerate) {
      const cached = getCachedSlides(videoId);
      if (cached) {
        console.log('[Teachable API] Cache hit - 返回快取的投影片');
        return NextResponse.json({
          success: true,
          slides: cached,
          stats: {
            totalSlides: cached.length,
            totalVocabulary: cached.reduce((sum, s) => sum + (s.vocabulary?.length || 0), 0),
            tokensUsed: { input: 0, output: 0, total: 0 },
            fromCache: true,
            processingTime: Date.now() - startTime,
          },
        });
      }
    }

    // 檢查 API Key
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'GROQ_API_KEY not set' },
        { status: 500 }
      );
    }

    // 步驟 1: 重組字幕為完整句子
    console.log('[Teachable API] 開始重組字幕片段為完整句子...');
    console.log('[Teachable API] 原始字幕片段數:', transcript.length);
    const sentences = reconstructSentences(transcript);
    console.log('[Teachable API] 重組後句子數:', sentences.length);
    console.log('[Teachable API] 句子範例:', sentences.slice(0, 3).map(s => ({
      id: s.id,
      text: s.text.substring(0, 60) + '...',
      subtitleIndices: s.subtitleIndices
    })));

    // 步驟 2: 批次翻譯所有完整句子（只調用一次 Groq API）
    const sentenceTexts = sentences.map(s => s.text);
    console.log('[Teachable API] 開始批次翻譯', sentenceTexts.length, '個完整句子...');
    const { translations, tokensUsed } = await batchTranslateToTraditionalChinese(
      sentenceTexts,
      apiKey
    );

    // 步驟 3: 映射 vocabulary cache 到重組後的句子
    const vocabCache: VocabularyCache = vocabularyCache || {};
    const vocabularyBySentence = mapVocabularyToSentences(sentences, vocabCache);

    // 統計 vocabulary 映射情況
    const vocabMappingStats = {
      totalOriginalVocab: Object.values(vocabCache).reduce((sum, arr) => sum + (arr?.length || 0), 0),
      totalMappedVocab: vocabularyBySentence.reduce((sum, arr) => sum + arr.length, 0),
      sentencesWithVocab: vocabularyBySentence.filter(arr => arr.length > 0).length,
    };
    console.log('[Teachable API] Vocabulary 映射統計:', vocabMappingStats);

    // 步驟 4: 組裝投影片（每個完整句子生成一張投影片）
    const slides: TeachableSlide[] = sentences.map((sentence, index) => {
      return {
        id: index + 1,
        type: 'content' as const,
        english: sentence.text,
        chinese: translations[index] || sentence.text, // 如果翻譯失敗則使用原文
        vocabulary: vocabularyBySentence[index] || [],
      };
    });

    console.log('[Teachable API] 成功生成', slides.length, '張投影片（每張1個完整句子）');
    console.log('[Teachable API] Token 使用統計:', tokensUsed);

    // 儲存到伺服器快取
    setCachedSlides(videoId, slides);

    // 統計 vocabulary 總數
    const totalVocabulary = slides.reduce((sum, s) => sum + (s.vocabulary?.length || 0), 0);

    return NextResponse.json({
      success: true,
      slides,
      stats: {
        totalSlides: slides.length,
        totalVocabulary,
        tokensUsed: {
          ...tokensUsed,
          total: tokensUsed.input + tokensUsed.output
        },
        fromCache: false,
        processingTime: Date.now() - startTime,
      },
    });

  } catch (error: any) {
    console.error('[Teachable API] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Generation failed',
      stats: {
        totalSlides: 0,
        totalVocabulary: 0,
        tokensUsed: { input: 0, output: 0, total: 0 },
        fromCache: false,
        processingTime: Date.now() - startTime,
      },
    }, { status: 500 });
  }
}
