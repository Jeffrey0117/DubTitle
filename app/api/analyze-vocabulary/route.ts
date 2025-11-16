import { NextRequest, NextResponse } from 'next/server';

interface Subtitle {
  start: number;
  end: number;
  text: string;
}

interface VocabularyMap {
  [index: number]: Array<{ word: string; translation: string }>;
}

export async function POST(request: NextRequest) {
  try {
    const { videoId, subtitles } = await request.json();

    if (!videoId || !Array.isArray(subtitles)) {
      return NextResponse.json(
        { error: '未提供 videoId 或字幕陣列' },
        { status: 400 }
      );
    }

    const vocabularies: VocabularyMap = {};
    let processedCount = 0;

    // 批次分析所有字幕
    for (let i = 0; i < subtitles.length; i++) {
      const subtitle = subtitles[i];

      // 跳過空白或過短的句子
      if (!subtitle.text || subtitle.text.trim().length < 10) {
        vocabularies[i] = [];
        processedCount++;
        continue;
      }

      try {
        // 呼叫 Ollama API 分析單句
        const ollamaResponse = await fetch('http://localhost:11434/api/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'qwen3:4b',
            prompt: `分析以下英文句子，找出最多3個難度較高的單字（中高級以上），每個單字提供中文翻譯。
格式要求：只回傳 JSON 陣列，格式為 [{"word": "英文單字", "translation": "中文翻譯"}]
如果沒有難字，回傳空陣列 []

句子：${subtitle.text}

回傳：`,
            stream: false,
            options: {
              temperature: 0.3,
            }
          }),
        });

        if (ollamaResponse.ok) {
          const ollamaData = await ollamaResponse.json();
          const responseText = ollamaData.response?.trim() || '[]';

          try {
            // 移除可能的 markdown 標記
            const cleanedText = responseText
              .replace(/```json\n?/g, '')
              .replace(/```\n?/g, '')
              .trim();

            let vocabulary = JSON.parse(cleanedText);

            // 確保最多只有 3 個單字
            if (Array.isArray(vocabulary) && vocabulary.length > 3) {
              vocabulary = vocabulary.slice(0, 3);
            }

            vocabularies[i] = Array.isArray(vocabulary) ? vocabulary : [];
          } catch (parseError) {
            console.error(`解析第 ${i} 句失敗:`, parseError);
            vocabularies[i] = [];
          }
        } else {
          vocabularies[i] = [];
        }
      } catch (error) {
        console.error(`分析第 ${i} 句失敗:`, error);
        vocabularies[i] = [];
      }

      processedCount++;

      // 每處理 10 句輸出進度
      if (processedCount % 10 === 0) {
        console.log(`已處理: ${processedCount}/${subtitles.length}`);
      }
    }

    console.log(`完成分析: ${processedCount}/${subtitles.length} 句`);

    return NextResponse.json({
      success: true,
      videoId,
      vocabularies,
      total: subtitles.length,
      processed: processedCount,
    });

  } catch (error: any) {
    console.error('批次分析詞彙失敗:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '分析失敗',
      },
      { status: 500 }
    );
  }
}
