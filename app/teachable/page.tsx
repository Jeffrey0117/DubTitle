'use client';

import { useState, useEffect, useRef } from 'react';

// Youglish Widget 類型聲明
declare global {
  interface Window {
    YG: {
      Widget: new (containerId: string, options: {
        width?: number;
        components?: number;
        events?: {
          onFetchDone?: (event: { totalResult: number }) => void;
          onVideoChange?: (event: { trackNumber: number }) => void;
          onCaptionConsumed?: () => void;
        };
      }) => {
        fetch: (word: string, language: string) => void;
        replay: () => void;
        next: () => void;
      };
    };
  }
}

// 資料結構定義
export interface TeachableSlide {
  id: number;
  type: 'content';
  english: string;
  chinese: string;
  vocabulary: VocabularyItem[];
}

export interface YouglishSlide {
  id: number;
  type: 'youglish';
  word: string;
  translation: string;
  sourceSlideId: number;
}

export type Slide = TeachableSlide | YouglishSlide;

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
 * Youglish 投影片組件 - 使用 Youglish Widget API 播放單字發音影片
 */
interface YouglishSlideProps {
  slide: YouglishSlide;
  onComplete: () => void;
  autoPlay?: boolean;
  replayCount?: number;
}

function YouglishSlideComponent({
  slide,
  onComplete,
  autoPlay = true,
  replayCount = 3
}: YouglishSlideProps) {
  const widgetRef = useRef<any>(null);
  const viewsRef = useRef(0);
  const [currentViews, setCurrentViews] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [noResults, setNoResults] = useState(false);
  const containerId = `youglish-widget-${slide.id}`;

  useEffect(() => {
    let widget: any = null;
    let isMounted = true;

    let retryCount = 0;
    const maxRetries = 50; // 5 秒超時

    const initWidget = () => {
      retryCount++;

      if (!window.YG) {
        // 等待 API 載入
        if (retryCount <= maxRetries) {
          setTimeout(initWidget, 100);
        } else {
          console.error('[Youglish] API 載入超時');
          setIsLoading(false);
          setNoResults(true);
          setTimeout(() => {
            if (isMounted) onComplete();
          }, 2000);
        }
        return;
      }

      if (!isMounted) return;

      // 確保容器元素存在
      const container = document.getElementById(containerId);
      if (!container) {
        // 容器還沒渲染，等待後重試
        if (retryCount <= maxRetries) {
          setTimeout(initWidget, 100);
        }
        return;
      }

      console.log(`[Youglish] 初始化 Widget for "${slide.word}"`)

      // 清空容器
      container.innerHTML = '';

      try {
        widget = new window.YG.Widget(containerId, {
        width: 640,
        components: 9, // search box & caption
        events: {
          onFetchDone: (event: { totalResult: number }) => {
            setIsLoading(false);
            if (event.totalResult === 0) {
              console.log(`[Youglish] No results for: ${slide.word}`);
              setNoResults(true);
              // 3 秒後自動跳過
              setTimeout(() => {
                if (isMounted) {
                  onComplete();
                }
              }, 3000);
            }
          },
          onCaptionConsumed: () => {
            viewsRef.current++;
            setCurrentViews(viewsRef.current);

            if (viewsRef.current >= replayCount) {
              if (autoPlay) {
                onComplete();
              }
            } else {
              widget.replay();
            }
          }
        }
      });

        widgetRef.current = widget;
        widget.fetch(slide.word, 'english');
      } catch (error) {
        console.error('[Youglish] Widget 初始化錯誤:', error);
        setIsLoading(false);
        setNoResults(true);
        // 3 秒後自動跳過
        setTimeout(() => {
          if (isMounted) {
            onComplete();
          }
        }, 3000);
      }
    };

    initWidget();

    return () => {
      isMounted = false;
      // 清理
      widgetRef.current = null;
      viewsRef.current = 0;
    };
  }, [slide.word, slide.id, containerId, onComplete, autoPlay, replayCount]);

  return (
    <div className="youglish-slide bg-neutral-900 rounded-2xl shadow-2xl p-8 min-h-[600px] flex flex-col">
      {/* 單字標題 */}
      <div className="text-center mb-6">
        <span className="text-4xl font-bold text-green-400">{slide.word}</span>
        <span className="text-2xl text-neutral-400 ml-4">{slide.translation}</span>
      </div>

      {/* 載入中提示 */}
      {isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-neutral-400">載入 Youglish...</p>
          </div>
        </div>
      )}

      {/* 無結果提示 */}
      {noResults && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-neutral-400 mb-2">找不到「{slide.word}」的發音影片</p>
            <p className="text-neutral-500 text-sm">3 秒後自動跳到下一張...</p>
          </div>
        </div>
      )}

      {/* Widget 容器 */}
      <div
        id={containerId}
        className={`mx-auto flex justify-center flex-1 ${isLoading || noResults ? 'hidden' : ''}`}
      />

      {/* 播放狀態 */}
      {!isLoading && !noResults && (
        <div className="mt-4 text-center text-neutral-500">
          播放 {currentViews}/{replayCount} 次後自動跳到下一張
        </div>
      )}

      {/* 跳過按鈕 */}
      <div className="mt-4 flex justify-center">
        <button
          onClick={onComplete}
          className="px-6 py-2 bg-neutral-700 hover:bg-neutral-600 rounded-lg transition-colors"
        >
          跳過此單字
        </button>
      </div>
    </div>
  );
}


/**
 * 建立投影片序列（含 Youglish 插入）
 * 在每個有單字的 ContentSlide 後面插入 YouglishSlide
 */
function buildSlideSequence(contentSlides: TeachableSlide[]): Slide[] {
  const sequence: Slide[] = [];
  let youglishId = 10000;

  for (const slide of contentSlides) {
    // 加入內容投影片
    sequence.push(slide);

    // 如果有單字，加入 Youglish 投影片
    if (slide.vocabulary && slide.vocabulary.length > 0) {
      for (const vocab of slide.vocabulary) {
        sequence.push({
          id: youglishId++,
          type: 'youglish',
          word: vocab.word,
          translation: vocab.translation,
          sourceSlideId: slide.id
        });
      }
    }
  }

  return sequence;
}

/**
 * 取得投影片類型標籤
 */
function getSlideTypeLabel(slide: Slide): string {
  if (slide.type === 'youglish') {
    return `🔊 ${slide.word}`;
  }
  return `📝 第 ${slide.id} 頁`;
}

/**
 * 主頁面組件
 */
export default function TeachablePage() {
  const [videoId, setVideoId] = useState<string>('');
  const [slides, setSlides] = useState<TeachableSlide[]>([]);
  const [slideSequence, setSlideSequence] = useState<Slide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [fadeIn, setFadeIn] = useState(true);

  // Youglish 控制狀態
  const [youglishEnabled, setYouglishEnabled] = useState(false); // 預設停用，因為可能載入失敗
  const [youglishScriptLoaded, setYouglishScriptLoaded] = useState(false);
  const [youglishScriptError, setYouglishScriptError] = useState(false);
  const [youglishReplayCount, setYouglishReplayCount] = useState(3);

  // 載入 Youglish Script
  useEffect(() => {
    // 檢查是否已載入
    if (document.getElementById('youglish-script')) {
      console.log('[Youglish] Script 已存在');
      return;
    }

    console.log('[Youglish] 載入 Widget script...');
    const script = document.createElement('script');
    script.id = 'youglish-script';
    script.src = 'https://youglish.com/public/emb/widget.js';
    script.async = true;

    script.onload = () => {
      console.log('[Youglish] Script 載入完成, window.YG =', !!(window as any).YG);
      setYouglishScriptLoaded(true);
    };

    script.onerror = () => {
      console.error('[Youglish] Script 載入失敗 - 可能需要 API 設定或網路問題');
      setYouglishScriptError(true);
      setYouglishEnabled(false); // 自動停用
    };

    document.body.appendChild(script);

    return () => {
      // 清理時不移除 script，因為可能其他組件還在使用
    };
  }, []);

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

  // 當 slides 或 youglishEnabled 改變時，更新投影片序列
  useEffect(() => {
    if (slides.length > 0) {
      if (youglishEnabled) {
        setSlideSequence(buildSlideSequence(slides));
      } else {
        setSlideSequence(slides);
      }
      // 重置索引以避免越界
      setCurrentSlideIndex(0);
    }
  }, [slides, youglishEnabled]);

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
      } else if (e.key === 's' || e.key === 'S') {
        // 跳過當前 Youglish
        e.preventDefault();
        const current = slideSequence[currentSlideIndex];
        if (current?.type === 'youglish') {
          goToNextSlide();
        }
      } else if (e.key === 'y' || e.key === 'Y') {
        // 切換 Youglish 開關
        e.preventDefault();
        setYouglishEnabled(!youglishEnabled);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlideIndex, slideSequence, fadeIn, youglishEnabled]);

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
    if (currentSlideIndex < slideSequence.length - 1) {
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

  const currentSlide = slideSequence[currentSlideIndex];

  // 渲染當前投影片
  const renderCurrentSlide = () => {
    if (!currentSlide) return null;

    if (currentSlide.type === 'youglish') {
      return (
        <YouglishSlideComponent
          slide={currentSlide}
          onComplete={goToNextSlide}
          autoPlay={true}
          replayCount={youglishReplayCount}
        />
      );
    } else {
      return <ContentSlide slide={currentSlide} />;
    }
  };

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

  // 計算統計
  const contentCount = slideSequence.filter(s => s.type !== 'youglish').length;
  const youglishCount = slideSequence.filter(s => s.type === 'youglish').length;

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Youglish 控制面板 */}
      <div className="bg-neutral-800 border-b border-neutral-700 px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            {/* 開關 */}
            <label className={`flex items-center gap-2 ${youglishScriptError ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
              <input
                type="checkbox"
                checked={youglishEnabled}
                onChange={(e) => setYouglishEnabled(e.target.checked)}
                disabled={youglishScriptError}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">啟用單字發音影片</span>
            </label>

            {/* Script 載入錯誤提示 */}
            {youglishScriptError && (
              <span className="text-xs text-red-400 bg-red-900/30 px-2 py-1 rounded">
                ⚠️ Youglish 暫時無法使用（腳本載入失敗）
              </span>
            )}

            {/* 播放次數 */}
            {youglishEnabled && !youglishScriptError && (
              <label className="flex items-center gap-2">
                <span className="text-sm text-neutral-400">播放次數：</span>
                <select
                  value={youglishReplayCount}
                  onChange={(e) => setYouglishReplayCount(Number(e.target.value))}
                  className="bg-neutral-700 rounded px-2 py-1 text-sm"
                >
                  <option value={1}>1 次</option>
                  <option value={2}>2 次</option>
                  <option value={3}>3 次</option>
                  <option value={5}>5 次</option>
                </select>
              </label>
            )}
          </div>

          {/* 統計 */}
          <div className="text-sm text-neutral-400 flex items-center gap-4">
            <span>📝 內容: {contentCount}</span>
            {!youglishScriptError && <span>🔊 單字: {youglishCount}</span>}
          </div>
        </div>
      </div>

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
                {currentSlideIndex + 1} / {slideSequence.length}
              </span>
              <span className="text-sm">
                {slideSequence[currentSlideIndex] && getSlideTypeLabel(slideSequence[currentSlideIndex])}
              </span>
              {slideSequence.length > 10 && (
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max={slideSequence.length - 1}
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
            {slideSequence.length > 0 && (
              <div className="w-full max-w-md bg-neutral-800 rounded-full h-1 overflow-hidden">
                <div
                  className="bg-blue-500 h-full transition-all duration-300"
                  style={{ width: `${((currentSlideIndex + 1) / slideSequence.length) * 100}%` }}
                />
              </div>
            )}
            {/* 導航點 - 僅在投影片少時顯示 */}
            {slideSequence.length <= 50 && (
              <div className="flex gap-1 flex-wrap justify-center max-w-md">
                {slideSequence.slice(Math.max(0, currentSlideIndex - 5), Math.min(slideSequence.length, currentSlideIndex + 6)).map((slide, idx) => {
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
                        realIdx === currentSlideIndex
                          ? 'bg-yellow-500 w-6'
                          : slide.type === 'youglish'
                            ? 'bg-blue-500 hover:bg-blue-400'
                            : 'bg-neutral-700 hover:bg-neutral-600'
                      }`}
                    />
                  );
                })}
              </div>
            )}
          </div>

          <button
            onClick={goToNextSlide}
            disabled={currentSlideIndex === slideSequence.length - 1}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            下一張 ▶
          </button>
        </div>
      </div>

      {/* 投影片內容 */}
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className={`transition-opacity duration-300 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}>
          {renderCurrentSlide()}
        </div>
      </div>

      {/* 快捷鍵提示 */}
      <div className="fixed bottom-6 right-6 bg-neutral-900/80 backdrop-blur-sm px-4 py-2 rounded-lg text-xs text-neutral-500 space-y-1">
        <div>
          鍵盤: ← 上一張 | → 下一張 | Space 下一張
          {!youglishScriptError && ' | S 跳過 | Y 切換 Youglish'}
        </div>
        {slideSequence.length > 10 && (
          <div className="text-neutral-600">拖曳滑桿快速跳轉</div>
        )}
      </div>
    </div>
  );
}
