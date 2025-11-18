import { NextRequest, NextResponse } from 'next/server';

interface Paragraph {
  id: number;
  english: string;
  chinese: string;
}

interface GenerateNoteRequest {
  videoId: string;
  transcript: string[];
  forceRegenerate?: boolean;
}

interface TokenUsage {
  input: number;
  output: number;
}

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

    console.log('[Note API] AI 分句完成：', sentences.length, '個句子，tokens:', tokensUsed);
    return { sentences, tokensUsed };

  } catch (error: any) {
    console.error('[Note API] AI 分句失敗：', error);
    throw new Error(`AI sentence split failed: ${error.message}`);
  }
}

const serverCache = new Map<string, { paragraphs: Paragraph[]; timestamp: number }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000;

function getCachedParagraphs(videoId: string): Paragraph[] | null {
  const cached = serverCache.get(videoId);
  if (!cached) return null;
  const now = Date.now();
  if (now - cached.timestamp > CACHE_DURATION) {
    serverCache.delete(videoId);
    return null;
  }
  return cached.paragraphs;
}

function setCachedParagraphs(videoId: string, paragraphs: Paragraph[]): void {
  serverCache.set(videoId, { paragraphs, timestamp: Date.now() });
}

async function generateParagraphsWithGroq(
  transcript: string[],
  apiKey: string
): Promise<{ paragraphs: Paragraph[]; tokensUsed: { input: number; output: number }; sentencesCount: number }> {
  // 步驟 1: 合併字幕片段為一段文字
  console.log('[Note API] 開始處理，原始字幕片段數：', transcript.length);

  const rawText = transcript
    .map(t => t.trim())
    .filter(t => t.length > 0)
    .join(' ');

  if (!rawText) {
    console.warn('[Note API] 沒有可用的文字');
    return {
      paragraphs: [],
      tokensUsed: { input: 0, output: 0 },
      sentencesCount: 0
    };
  }

  console.log('[Note API] 合併後文字長度：', rawText.length, '字元');

  // 步驟 2: AI 智能分句
  let sentences: string[] = [];
  let splitTokensUsed: TokenUsage = { input: 0, output: 0 };

  try {
    const splitResult = await intelligentSentenceSplit(rawText, apiKey);
    sentences = splitResult.sentences;
    splitTokensUsed = splitResult.tokensUsed;
    console.log('[Note API] AI 分句成功，完整句子數：', sentences.length);
  } catch (error) {
    console.warn('[Note API] AI 分句失敗，降級使用簡單分句：', error);
    // 降級處理：簡單用標點分句
    sentences = rawText.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
    if (sentences.length === 0) {
      sentences = [rawText]; // 最後降級：整段當一句
    }
  }

  // 如果分句後沒有句子，返回空結果
  if (sentences.length === 0) {
    console.warn('[Note API] 沒有可用的句子');
    return {
      paragraphs: [],
      tokensUsed: splitTokensUsed,
      sentencesCount: 0
    };
  }

  // 步驟 3: 限制處理句子數量（避免輸入太長）
  const limitedSentences = sentences.slice(0, 100);
  console.log('[Note API] 限制處理句子數：', limitedSentences.length);

  // 為每個完整句子編號
  const numberedSentences = limitedSentences
    .map((text, index) => `${index + 1}. ${text}`)
    .join('\n');

  const prompt = `整理為段落筆記（每段2-4句）。保留原文，翻譯為繁體中文。

${numberedSentences}

輸出：{"p":[{"i":1,"e":"英文","c":"中文"}]}`;

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
          { role: 'system', content: '英語教學專家。輸出JSON：p=paragraphs,i=id,e=english,c=chinese(繁體)' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 16000,
      }),
    });

    if (!groqResponse.ok) {
      throw new Error(`Groq API error: ${groqResponse.status}`);
    }

    const groqData = await groqResponse.json();
    const responseText = groqData.choices?.[0]?.message?.content?.trim() || '{}';

    const parsed = JSON.parse(responseText);
    // 支援縮短欄位名稱：p=paragraphs, i=id, e=english, c=chinese
    const rawParagraphs = parsed.p || parsed.paragraphs || [];
    const paragraphs = rawParagraphs.map((item: any) => ({
      id: item.i || item.id,
      english: item.e || item.english,
      chinese: item.c || item.chinese,
    }));

    // 合併分句和翻譯的 token 使用量
    const translateTokens = {
      input: groqData.usage?.prompt_tokens || 0,
      output: groqData.usage?.completion_tokens || 0,
    };

    const tokensUsed = {
      input: splitTokensUsed.input + translateTokens.input,
      output: splitTokensUsed.output + translateTokens.output,
    };

    console.log('[Note API] 生成成功：', paragraphs.length, '個段落');
    console.log('[Note API] Token 使用：分句', splitTokensUsed, '+ 翻譯', translateTokens, '= 總計', tokensUsed);
    return { paragraphs, tokensUsed, sentencesCount: sentences.length };

  } catch (error: any) {
    console.error('[Note API] Groq error:', error);
    throw new Error(`Groq API failed: ${error.message}`);
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body: GenerateNoteRequest = await request.json();
    const { videoId, transcript, forceRegenerate } = body;

    console.log('[Note API] Request:', { videoId, lines: transcript?.length });

    if (!videoId || !transcript || !Array.isArray(transcript) || transcript.length === 0) {
      return NextResponse.json({ success: false, error: 'Missing videoId or transcript' }, { status: 400 });
    }

    if (!forceRegenerate) {
      const cached = getCachedParagraphs(videoId);
      if (cached) {
        console.log('[Note API] Cache hit');
        return NextResponse.json({
          success: true,
          paragraphs: cached,
          stats: {
            totalSubtitles: transcript.length,
            totalParagraphs: cached.length,
            tokensUsed: { input: 0, output: 0, total: 0 },
            fromCache: true,
            processingTime: Date.now() - startTime,
          },
        });
      }
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'GROQ_API_KEY not set' }, { status: 500 });
    }

    const { paragraphs, tokensUsed, sentencesCount } = await generateParagraphsWithGroq(transcript, apiKey);
    setCachedParagraphs(videoId, paragraphs);

    console.log('[Note API] 完成：原始字幕', transcript.length, '片段 → 重組為', sentencesCount, '個完整句子 → 生成', paragraphs.length, '個段落');

    return NextResponse.json({
      success: true,
      paragraphs,
      stats: {
        totalSubtitles: transcript.length,
        totalSentences: sentencesCount,
        totalParagraphs: paragraphs.length,
        tokensUsed: { ...tokensUsed, total: tokensUsed.input + tokensUsed.output },
        fromCache: false,
        processingTime: Date.now() - startTime,
      },
    });

  } catch (error: any) {
    console.error('[Note API] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Generation failed',
      stats: {
        totalSubtitles: 0,
        totalParagraphs: 0,
        tokensUsed: { input: 0, output: 0, total: 0 },
        fromCache: false,
        processingTime: Date.now() - startTime,
      },
    }, { status: 500 });
  }
}
