import { NextRequest, NextResponse } from 'next/server';

interface Subtitle {
  start: number;
  end: number;
  text: string;
}

export async function POST(request: NextRequest) {
  try {
    const { videoId, subtitleIndex, text } = await request.json();

    console.log('[API] 收到分析請求:', { videoId, subtitleIndex, text: text?.substring(0, 50) });

    if (!videoId || subtitleIndex === undefined || !text) {
      console.error('[API] 缺少必要參數:', { videoId, subtitleIndex, text });
      return NextResponse.json(
        { error: '缺少必要參數 (videoId, subtitleIndex, text)' },
        { status: 400 }
      );
    }

    // 跳過空白或過短的句子
    if (text.trim().length < 10) {
      console.log('[API] 句子太短，跳過分析');
      return NextResponse.json({
        success: true,
        videoId,
        subtitleIndex,
        vocabulary: [],
      });
    }

    // 檢查 API Key
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.error('[API] GROQ_API_KEY 未設置');
      return NextResponse.json(
        { error: 'API Key 未設置' },
        { status: 500 }
      );
    }

    console.log('[API] 準備呼叫 Groq API...');

    try {
      // 呼叫 Groq API 分析單句
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
              content: '你是英文教學助手，專門分析句子中的難字。只回傳 JSON 格式，不要其他說明。'
            },
            {
              role: 'user',
              content: `分析以下英文句子，找出最多3個難度較高的單字（中高級以上），每個單字提供中文翻譯。
格式要求：只回傳 JSON 陣列，格式為 [{"word": "英文單字", "translation": "中文翻譯"}]
如果沒有難字，回傳空陣列 []

句子：${text}

回傳：`
            }
          ],
          temperature: 0.3,
          max_tokens: 200,
        }),
      });

      console.log('[API] Groq API 回應狀態:', groqResponse.status);

      if (!groqResponse.ok) {
        const errorText = await groqResponse.text();
        console.error('[API] Groq API 錯誤:', errorText);
        return NextResponse.json({
          success: false,
          error: `Groq API 錯誤: ${groqResponse.status}`,
        }, { status: 500 });
      }

      const groqData = await groqResponse.json();
      const responseText = groqData.choices?.[0]?.message?.content?.trim() || '[]';

      console.log('[API] Groq API 原始回應:', responseText);

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

        const result = Array.isArray(vocabulary) ? vocabulary : [];
        console.log('[API] 解析成功，難字數量:', result.length, result);

        return NextResponse.json({
          success: true,
          videoId,
          subtitleIndex,
          vocabulary: result,
        });

      } catch (parseError) {
        console.error('[API] JSON 解析失敗:', parseError, '原始內容:', responseText);
        return NextResponse.json({
          success: true,
          videoId,
          subtitleIndex,
          vocabulary: [],
        });
      }

    } catch (fetchError: any) {
      console.error('[API] Fetch 錯誤:', fetchError);
      return NextResponse.json({
        success: false,
        error: fetchError.message || 'API 呼叫失敗',
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('[API] 總體錯誤:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '分析失敗',
      },
      { status: 500 }
    );
  }
}
