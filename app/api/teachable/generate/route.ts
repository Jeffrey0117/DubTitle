import { NextRequest, NextResponse } from 'next/server';

interface TokenUsage {
  input: number;
  output: number;
}

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
 * AI 智能分句：將無標點的字幕文字分割成完整句子
 */
async function intelligentSentenceSplit(
  rawText: string,
  apiKey: string
): Promise<{ sentences: string[]; tokensUsed: TokenUsage }> {
  const prompt = `將以下英文文字分割成獨立的完整句子。每句應該是一個完整的語意單位。

文字：
${rawText}

要求：
1. 根據語意自然斷句，找出句子的開始和結束
2. 每句保持完整性和連貫性
3. 不要改變原文內容，只做分割
4. 只回傳 JSON：{"sentences": ["句子1", "句子2", ...]}`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
            content: '你是文本處理專家。將英文文字分割成獨立的完整句子。只回傳 JSON 格式。'
          },
          { role: 'user', content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1, // 低溫度確保穩定分句
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    const responseText = data.choices?.[0]?.message?.content?.trim() || '{}';

    const parsed = JSON.parse(responseText);

    const sentences = parsed.sentences || [];
    const tokensUsed: TokenUsage = {
      input: data.usage?.prompt_tokens || 0,
      output: data.usage?.completion_tokens || 0,
    };

    console.log('[Teachable API] AI 分句完成：', sentences.length, '個句子，tokens:', tokensUsed);
    return { sentences, tokensUsed };

  } catch (error: any) {
    console.error('[Teachable API] AI 分句失敗：', error);
    throw new Error(`AI sentence split failed: ${error.message}`);
  }
}

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
 * 將 vocabulary cache 從原始字幕映射到 AI 分句後的句子（使用文字比對）
 *
 * @param sentences - AI 分句後的句子陣列
 * @param originalSubtitles - 原始字幕文字陣列
 * @param vocabCache - 原始的 vocabulary cache（以字幕索引為 key）
 * @returns 每個句子對應的 vocabulary 陣列
 */
function mapVocabularyToSentencesNew(
  sentences: string[],
  originalSubtitles: string[],
  vocabCache: VocabularyCache
): VocabularyItem[][] {
  const result: VocabularyItem[][] = [];

  for (const sentence of sentences) {
    const vocabularyForSentence: VocabularyItem[] = [];
    const seenWords = new Set<string>(); // 避免重複單字
    const sentenceLower = sentence.toLowerCase();

    // 對每個原始字幕，檢查它的文字是否出現在這個句子中
    for (let i = 0; i < originalSubtitles.length; i++) {
      const subtitleText = originalSubtitles[i].trim().toLowerCase();

      // 如果字幕文字出現在句子中，收集該字幕的 vocabulary
      if (subtitleText && sentenceLower.includes(subtitleText)) {
        const vocab = vocabCache[i];
        if (vocab && Array.isArray(vocab)) {
          for (const item of vocab) {
            // 額外檢查：單字本身也要出現在句子中
            if (!seenWords.has(item.word) && sentenceLower.includes(item.word.toLowerCase())) {
              vocabularyForSentence.push(item);
              seenWords.add(item.word);
            }
          }
        }
      }
    }

    // 備選方案：如果上面沒找到任何 vocabulary，直接檢查每個單字是否在句子中
    if (vocabularyForSentence.length === 0) {
      for (let i = 0; i < originalSubtitles.length; i++) {
        const vocab = vocabCache[i];
        if (vocab && Array.isArray(vocab)) {
          for (const item of vocab) {
            if (!seenWords.has(item.word) && sentenceLower.includes(item.word.toLowerCase())) {
              vocabularyForSentence.push(item);
              seenWords.add(item.word);
            }
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

    // 步驟 1: 合併字幕片段為一段文字，然後用 AI 智能分句
    console.log('[Teachable API] 開始處理，原始字幕片段數:', transcript.length);

    const rawText = transcript
      .map((t: string) => t.trim())
      .filter((t: string) => t.length > 0)
      .join(' ');

    if (!rawText) {
      console.warn('[Teachable API] 沒有可用的文字');
      return NextResponse.json({
        success: true,
        slides: [],
        stats: {
          totalSlides: 0,
          totalVocabulary: 0,
          tokensUsed: { input: 0, output: 0, total: 0 },
          fromCache: false,
          processingTime: Date.now() - startTime,
        },
      });
    }

    console.log('[Teachable API] 合併後文字長度：', rawText.length, '字元');

    // 步驟 2: AI 智能分句
    let sentences: string[] = [];
    let splitTokensUsed: TokenUsage = { input: 0, output: 0 };

    try {
      const splitResult = await intelligentSentenceSplit(rawText, apiKey);
      sentences = splitResult.sentences;
      splitTokensUsed = splitResult.tokensUsed;
      console.log('[Teachable API] AI 分句成功，完整句子數：', sentences.length);
    } catch (error) {
      console.warn('[Teachable API] AI 分句失敗，降級使用簡單分句：', error);
      // 降級處理：簡單用標點分句
      sentences = rawText.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
      if (sentences.length === 0) {
        sentences = [rawText]; // 最後降級：整段當一句
      }
    }

    // 如果分句後沒有句子，返回空結果
    if (sentences.length === 0) {
      console.warn('[Teachable API] 沒有可用的句子');
      return NextResponse.json({
        success: true,
        slides: [],
        stats: {
          totalSlides: 0,
          totalVocabulary: 0,
          tokensUsed: splitTokensUsed,
          fromCache: false,
          processingTime: Date.now() - startTime,
        },
      });
    }

    console.log('[Teachable API] 句子範例:', sentences.slice(0, 3).map(s =>
      s.substring(0, 60) + (s.length > 60 ? '...' : '')
    ));

    // 步驟 3: 批次翻譯所有完整句子
    console.log('[Teachable API] 開始批次翻譯', sentences.length, '個完整句子...');
    const { translations, tokensUsed: translateTokensUsed } = await batchTranslateToTraditionalChinese(
      sentences,
      apiKey
    );

    // 合併分句和翻譯的 token 使用量
    const tokensUsed = {
      input: splitTokensUsed.input + translateTokensUsed.input,
      output: splitTokensUsed.output + translateTokensUsed.output,
    };

    // 步驟 4: 映射 vocabulary cache 到 AI 分句後的句子（使用文字比對）
    const vocabCache: VocabularyCache = vocabularyCache || {};
    const vocabularyBySentence = mapVocabularyToSentencesNew(sentences, transcript, vocabCache);

    // 統計 vocabulary 映射情況
    const vocabMappingStats = {
      totalOriginalVocab: Object.values(vocabCache).reduce((sum, arr) => sum + (arr?.length || 0), 0),
      totalMappedVocab: vocabularyBySentence.reduce((sum, arr) => sum + arr.length, 0),
      sentencesWithVocab: vocabularyBySentence.filter(arr => arr.length > 0).length,
    };
    console.log('[Teachable API] Vocabulary 映射統計:', vocabMappingStats);

    // 步驟 5: 組裝投影片（每個完整句子生成一張投影片）
    const slides: TeachableSlide[] = sentences.map((sentence, index) => {
      return {
        id: index + 1,
        type: 'content' as const,
        english: sentence,
        chinese: translations[index] || sentence, // 如果翻譯失敗則使用原文
        vocabulary: vocabularyBySentence[index] || [],
      };
    });

    console.log('[Teachable API] 成功生成', slides.length, '張投影片（每張1個完整句子）');
    console.log('[Teachable API] Token 使用統計:', tokensUsed, '(分句:', splitTokensUsed, '+ 翻譯:', translateTokensUsed, ')');

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
