'use client';

import { useState, useEffect } from 'react';

// 資料結構定義
export interface TeachableSlide {
  id: number;
  type: 'content';
  english: string;
  chinese: string;
  vocabulary: VocabularyItem[];
}

export interface VocabularyItem {
  word: string;
  pronunciation: string;
  partOfSpeech: string;
  translation: string;
  note?: string;
}

/**
 * 內容投影片組件
 */
function ContentSlide({ slide }: { slide: TeachableSlide }) {
  // 將英文句子中的單字標記為綠色
  const renderHighlightedEnglish = () => {
    let text = slide.english;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    // 按單字長度排序，優先匹配長的片語
    const sortedVocab = [...slide.vocabulary].sort((a, b) => b.word.length - a.word.length);

    // 記錄已經高亮的位置
    const highlightedRanges: Array<{ start: number; end: number }> = [];

    sortedVocab.forEach((vocab) => {
      const regex = new RegExp(`\\b${vocab.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      let match;

      while ((match = regex.exec(text)) !== null) {
        const start = match.index;
        const end = start + match[0].length;

        // 檢查是否與已高亮的範圍重疊
        const isOverlapping = highlightedRanges.some(
          (range) => (start >= range.start && start < range.end) || (end > range.start && end <= range.end)
        );

        if (!isOverlapping) {
          highlightedRanges.push({ start, end });
        }
      }
    });

    // 按位置排序
    highlightedRanges.sort((a, b) => a.start - b.start);

    // 渲染文本
    highlightedRanges.forEach((range, idx) => {
      if (range.start > lastIndex) {
        parts.push(text.substring(lastIndex, range.start));
      }
      parts.push(
        <span key={idx} className="text-green-400 font-semibold">
          {text.substring(range.start, range.end)}
        </span>
      );
      lastIndex = range.end;
    });

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  return (
    <div className="bg-neutral-900 rounded-2xl shadow-2xl p-12 min-h-[600px] flex flex-col justify-between transition-opacity duration-300">
      {/* 英文句子（帶高亮） */}
      <div className="flex-1 flex items-start justify-center pt-16">
        <p className="text-4xl font-light text-center text-neutral-100 leading-relaxed">
          {renderHighlightedEnglish()}
        </p>
      </div>

      {/* 中文翻譯 */}
      <div className="text-center mb-8">
        <p className="text-2xl text-neutral-400">
          {slide.chinese}
        </p>
      </div>

      {/* 單字列表 */}
      {slide.vocabulary && slide.vocabulary.length > 0 && (
        <div className="border-t border-neutral-800 pt-6">
          <div className="space-y-2">
            {slide.vocabulary.map((vocab, idx) => (
              <div key={idx} className="text-neutral-300">
                <span className="font-semibold text-green-400">{vocab.word}</span>
                {' '}
                <span className="text-neutral-500">{vocab.pronunciation}</span>
                {' '}
                <span className="text-blue-400">{vocab.partOfSpeech}</span>
                {' '}
                <span>{vocab.translation}</span>
                {vocab.note && (
                  <>
                    <br />
                    <span className="text-sm text-neutral-500 ml-4">{vocab.note}</span>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


/**
 * 主頁面組件
 */
export default function TeachablePage() {
  const [videoId, setVideoId] = useState<string>('');
  const [slides, setSlides] = useState<TeachableSlide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [fadeIn, setFadeIn] = useState(true);

  // 從 localStorage 自動載入 videoId
  useEffect(() => {
    const savedVideoId = localStorage.getItem('dubtitle_video_id');
    if (savedVideoId) {
      console.log('[Teachable] 從 localStorage 載入 videoId:', savedVideoId);
      setVideoId(savedVideoId);
      loadSlides(savedVideoId);
    } else {
      setError('請先在播放器頁面載入影片');
    }
  }, []);

  // 鍵盤快捷鍵
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 忽略在輸入框中的按鍵
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // 防抖處理 - 避免快速連按
      if (!fadeIn) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrevSlide();
      } else if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        goToNextSlide();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlideIndex, slides.length, fadeIn]);

  const loadSlides = async (id: string) => {
    setIsLoading(true);
    setError('');

    try {
      // 檢查快取
      const cacheKey = `dubtitle_teachable_${id}`;
      const cached = localStorage.getItem(cacheKey);

      if (cached) {
        const cachedData = JSON.parse(cached);
        setSlides(cachedData);
        setIsLoading(false);
        console.log('[Teachable] 從快取載入', cachedData.length, '張投影片');
        return;
      }

      // ✅ Agent 1: 優先從 localStorage 讀取字幕（共用機制）
      console.log('[Teachable] 步驟 1/3: 獲取字幕...');
      const subtitlesCacheKey = `dubtitle_subtitles_${id}`;
      let subtitles = [];

      const cachedSubtitles = localStorage.getItem(subtitlesCacheKey);
      if (cachedSubtitles) {
        subtitles = JSON.parse(cachedSubtitles);
        console.log('[Teachable] ✅ 從 localStorage 讀取字幕（共用）:', subtitles.length);
      } else {
        // 如果沒有快取，才調用 API
        const subtitleResponse = await fetch('/api/subtitles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoId: id }),
        });

        if (!subtitleResponse.ok) {
          throw new Error('無法載入字幕');
        }

        const subtitleData = await subtitleResponse.json();
        subtitles = subtitleData.subtitles || [];

        // 存入 localStorage
        if (subtitles.length > 0) {
          localStorage.setItem(subtitlesCacheKey, JSON.stringify(subtitles));
        }
      }

      if (subtitles.length === 0) {
        throw new Error('字幕資料為空');
      }

      // 將字幕轉換為 transcript（文字陣列）
      const transcript = subtitles.map((sub: any) => sub.text);
      console.log('[Teachable] 字幕條數:', transcript.length);

      // 步驟 2: 讀取 vocabulary cache
      console.log('[Teachable] 步驟 2/3: 讀取 vocabulary cache...');
      const vocabularyCacheKey = `dubtitle_vocab_${id}`; // 與字幕頁面使用相同的 key
      let vocabularyCache = {};

      const cachedVocabulary = localStorage.getItem(vocabularyCacheKey);
      if (cachedVocabulary) {
        try {
          vocabularyCache = JSON.parse(cachedVocabulary);
          const vocabCount = Object.keys(vocabularyCache).length;
          console.log('[Teachable] ✅ 從 localStorage 讀取 vocabulary cache:', vocabCount, '條字幕有難字分析');
        } catch (error) {
          console.warn('[Teachable] ⚠️ vocabulary cache 解析失敗，使用空物件:', error);
          vocabularyCache = {};
        }
      } else {
        console.log('[Teachable] ℹ️ 沒有 vocabulary cache，將傳遞空物件');
      }

      // 步驟 3: 生成投影片
      console.log('[Teachable] 步驟 3/3: 生成投影片...');
      const response = await fetch('/api/teachable/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: id,
          transcript: transcript,
          vocabularyCache: vocabularyCache,
        }),
      });

      if (!response.ok) {
        let errorMsg = '無法生成投影片';
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch {
          errorMsg = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();

      if (data.success && data.slides) {
        setSlides(data.slides);
        localStorage.setItem(cacheKey, JSON.stringify(data.slides));
        console.log('[Teachable] 成功生成', data.slides.length, '張投影片');
        console.log('[Teachable] 統計:', data.stats);
      } else {
        throw new Error(data.error || '生成失敗');
      }
    } catch (err: any) {
      console.error('[Teachable] 載入投影片失敗:', err);
      setError(err.message || '載入投影片失敗');
    } finally {
      setIsLoading(false);
    }
  };

  const goToNextSlide = () => {
    if (currentSlideIndex < slides.length - 1) {
      setFadeIn(false);
      setTimeout(() => {
        setCurrentSlideIndex(currentSlideIndex + 1);
        setFadeIn(true);
      }, 150);
    }
  };

  const goToPrevSlide = () => {
    if (currentSlideIndex > 0) {
      setFadeIn(false);
      setTimeout(() => {
        setCurrentSlideIndex(currentSlideIndex - 1);
        setFadeIn(true);
      }, 150);
    }
  };

  const currentSlide = slides[currentSlideIndex];

  // 載入中狀態
  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-400 text-lg">AI 正在生成投影片...</p>
          <p className="text-neutral-600 text-sm mt-2">預計需要 30-60 秒</p>
        </div>
      </div>
    );
  }

  // 錯誤狀態
  if (error) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <p className="text-red-400 text-lg mb-2">載入失敗</p>
          <p className="text-neutral-500 text-sm">{error}</p>
          <button
            onClick={() => videoId && loadSlides(videoId)}
            className="mt-6 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            重試
          </button>
        </div>
      </div>
    );
  }

  // 無投影片狀態
  if (!currentSlide) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-neutral-400 text-lg mb-4">
            {videoId ? '沒有投影片資料' : '請輸入 YouTube 影片 ID'}
          </p>
          <p className="text-neutral-600 text-sm">
            使用 ?v=VIDEO_ID 參數指定影片
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* 控制列 */}
      <div className="sticky top-0 z-50 bg-neutral-900 border-b border-neutral-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <button
            onClick={goToPrevSlide}
            disabled={currentSlideIndex === 0}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            ◀ 上一張
          </button>

          <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <span className="text-neutral-400 text-sm whitespace-nowrap">
                第 {currentSlideIndex + 1} / {slides.length} 張
              </span>
              {slides.length > 10 && (
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max={slides.length - 1}
                    value={currentSlideIndex}
                    onChange={(e) => {
                      const newIndex = parseInt(e.target.value);
                      setFadeIn(false);
                      setTimeout(() => {
                        setCurrentSlideIndex(newIndex);
                        setFadeIn(true);
                      }, 150);
                    }}
                    className="w-32 h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-500 [&::-moz-range-thumb]:border-0"
                  />
                </div>
              )}
            </div>
            {/* 進度條 - 適用於大量投影片 */}
            {slides.length > 0 && (
              <div className="w-full max-w-md bg-neutral-800 rounded-full h-1 overflow-hidden">
                <div
                  className="bg-blue-500 h-full transition-all duration-300"
                  style={{ width: `${((currentSlideIndex + 1) / slides.length) * 100}%` }}
                />
              </div>
            )}
            {/* 導航點 - 僅在投影片少時顯示 */}
            {slides.length <= 50 && (
              <div className="flex gap-1 flex-wrap justify-center max-w-md">
                {slides.slice(Math.max(0, currentSlideIndex - 5), Math.min(slides.length, currentSlideIndex + 6)).map((_, idx) => {
                  const realIdx = Math.max(0, currentSlideIndex - 5) + idx;
                  return (
                    <div
                      key={realIdx}
                      onClick={() => {
                        setFadeIn(false);
                        setTimeout(() => {
                          setCurrentSlideIndex(realIdx);
                          setFadeIn(true);
                        }, 150);
                      }}
                      className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
                        realIdx === currentSlideIndex ? 'bg-blue-500 w-6' : 'bg-neutral-700 hover:bg-neutral-600'
                      }`}
                    />
                  );
                })}
              </div>
            )}
          </div>

          <button
            onClick={goToNextSlide}
            disabled={currentSlideIndex === slides.length - 1}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            下一張 ▶
          </button>
        </div>
      </div>

      {/* 投影片內容 */}
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className={`transition-opacity duration-300 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}>
          <ContentSlide slide={currentSlide} />
        </div>
      </div>

      {/* 快捷鍵提示 */}
      <div className="fixed bottom-6 right-6 bg-neutral-900/80 backdrop-blur-sm px-4 py-2 rounded-lg text-xs text-neutral-500 space-y-1">
        <div>鍵盤: ← 上一張 | → 下一張 | Space 下一張</div>
        {slides.length > 10 && (
          <div className="text-neutral-600">拖曳滑桿快速跳轉</div>
        )}
      </div>
    </div>
  );
}
