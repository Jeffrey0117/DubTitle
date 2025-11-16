import { NextRequest, NextResponse } from 'next/server';
import { getSubtitles } from 'youtube-caption-extractor';

interface SubtitleEntry {
  start: number;
  end: number;
  text: string;
}

export async function POST(request: NextRequest) {
  try {
    const { videoId } = await request.json();

    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      );
    }

    try {
      // 嘗試獲取字幕，優先級：中文 > 英文
      const languages = ['zh-Hans', 'zh-Hant', 'zh', 'en'];
      let captions = null;
      let usedLang = '';

      for (const lang of languages) {
        try {
          captions = await getSubtitles({
            videoID: videoId,
            lang: lang,
          });
          usedLang = lang;
          console.log(`成功獲取 ${lang} 字幕`);
          break;
        } catch (err) {
          console.log(`語言 ${lang} 不可用，嘗試下一個...`);
          continue;
        }
      }

      // 如果沒有找到指定語言，嘗試默認語言
      if (!captions) {
        try {
          captions = await getSubtitles({ videoID: videoId });
          usedLang = 'default';
          console.log('使用默認語言字幕');
        } catch (err) {
          console.error('獲取默認字幕失敗:', err);
        }
      }

      if (!captions || captions.length === 0) {
        return NextResponse.json(
          { error: '未找到字幕，該視頻可能沒有可用的字幕' },
          { status: 404 }
        );
      }

      // 轉換為我們的格式並清理文本
      const subtitles: SubtitleEntry[] = captions.map((caption: any) => ({
        start: parseFloat(caption.start),
        end: parseFloat(caption.start) + parseFloat(caption.dur),
        text: caption.text
          .replace(/\n/g, ' ')           // 換行符 → 空格
          .replace(/\r/g, '')            // 移除回車
          .replace(/&#10;/g, ' ')        // HTML換行實體 → 空格
          .replace(/&#39;/g, "'")        // HTML撇號實體 → 撇號
          .replace(/&quot;/g, '"')       // HTML引號實體 → 引號
          .replace(/&amp;/g, '&')        // HTML &實體 → &
          .replace(/&gt;&gt;/g, '')      // &gt;&gt; (>>) → 移除
          .replace(/>>/g, '')            // >> → 移除
          .replace(/♪/g, '')             // 音樂符號 → 移除
          .replace(/\s+/g, ' ')          // 多個空格 → 單個空格
          .trim(),                       // 移除首尾空格
      }));

      return NextResponse.json({
        success: true,
        subtitles,
        language: usedLang,
      });

    } catch (error: any) {
      console.error('字幕獲取錯誤:', error);

      // 檢查常見錯誤
      const errorMsg = error.message || '';

      if (errorMsg.includes('unavailable') || errorMsg.includes('not found')) {
        return NextResponse.json(
          { error: '視頻不可用或為私有視頻' },
          { status: 404 }
        );
      }

      if (errorMsg.includes('disabled')) {
        return NextResponse.json(
          { error: '該視頻的字幕功能已禁用' },
          { status: 404 }
        );
      }

      throw error;
    }

  } catch (error: any) {
    console.error('字幕提取錯誤:', error);
    return NextResponse.json(
      {
        error: '字幕提取失敗',
        details: error.message || '未知錯誤'
      },
      { status: 500 }
    );
  }
}
