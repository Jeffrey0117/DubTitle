'use client';

import { useState, useEffect, useRef } from 'react';
import SubtitlePanel from '@/components/SubtitlePanel';
import StyleControl from '@/components/StyleControl';
import TextStyleControl from '@/components/TextStyleControl';
import { TimingConfig, DEFAULT_TIMING, deserializeTimingConfig, serializeTimingConfig } from '@/lib/timingUtils';

interface Subtitle {
  start: number;
  end: number;
  text: string;
}

interface TextStyle {
  textBold: boolean;
  textShadowStrength: number;
  highlighterColor: string;
  highlighterPaddingX: number;
  highlighterPaddingY: number;
}

interface VocabularyItem {
  word: string;
  translation: string;
}

interface VocabularyMap {
  [index: number]: VocabularyItem[];
}

const VIDEO_ID_STORAGE_KEY = 'dubtitle_video_id';
const TIMING_STORAGE_KEY = 'dubtitle_timing_config';
const TEXT_STYLE_STORAGE_KEY = 'dubtitle_text_style';
const BROADCAST_CHANNEL_NAME = 'dubtitle-video';
const VOCABULARY_CACHE_PREFIX = 'dubtitle_vocab_';

export default function SubtitlePage() {
  const [videoId, setVideoId] = useState<string>('');
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [bgColor, setBgColor] = useState<string>('#000000');
  const [textColor, setTextColor] = useState<string>('#ffffff');
  const [fontSize, setFontSize] = useState<number>(60);
  const [textBold, setTextBold] = useState<boolean>(false);
  const [textShadowStrength, setTextShadowStrength] = useState<number>(0);
  const [highlighterColor, setHighlighterColor] = useState<string>('transparent');
  const [highlighterPaddingX, setHighlighterPaddingX] = useState<number>(0);
  const [highlighterPaddingY, setHighlighterPaddingY] = useState<number>(0);
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [timingConfig, setTimingConfig] = useState<TimingConfig>(DEFAULT_TIMING);
  const [vocabularyMap, setVocabularyMap] = useState<VocabularyMap>({});
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisProgress, setAnalysisProgress] = useState<string>('');
  const [currentSubtitleIndex, setCurrentSubtitleIndex] = useState<number>(-1);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const analyzingRef = useRef<Set<number>>(new Set()); // 追蹤正在分析的字幕索引

  // Initialize BroadcastChannel for listening to real-time updates
  useEffect(() => {
    try {
      const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      broadcastChannelRef.current = channel;

      const handleMessage = (event: MessageEvent) => {
        const { type, data } = event.data;

        switch (type) {
          case 'VIDEO_ID_CHANGED':
            if (data?.videoId) {
              setVideoId(data.videoId);
              fetchSubtitles(data.videoId);
            }
            break;

          case 'TIME_UPDATED':
            if (typeof data?.currentTime === 'number') {
              setCurrentTime(data.currentTime);
            }
            break;

          case 'STYLE_CHANGED':
            if (data?.bgColor) setBgColor(data.bgColor);
            if (data?.textColor) setTextColor(data.textColor);
            if (typeof data?.fontSize === 'number') setFontSize(data.fontSize);
            break;

          case 'TEXT_STYLE_CHANGED':
            if (typeof data?.textBold === 'boolean') setTextBold(data.textBold);
            if (typeof data?.textShadowStrength === 'number') setTextShadowStrength(data.textShadowStrength);
            if (data?.highlighterColor) setHighlighterColor(data.highlighterColor);
            if (typeof data?.highlighterPaddingX === 'number') setHighlighterPaddingX(data.highlighterPaddingX);
            if (typeof data?.highlighterPaddingY === 'number') setHighlighterPaddingY(data.highlighterPaddingY);
            break;

          case 'TIMING_CONFIG_CHANGED':
            if (data?.timingConfig) {
              setTimingConfig(data.timingConfig);
            }
            break;
        }
      };

      channel.addEventListener('message', handleMessage);

      return () => {
        channel.removeEventListener('message', handleMessage);
        channel.close();
      };
    } catch (err) {
      console.warn('BroadcastChannel not supported:', err);
    }
  }, []);

  // Load initial data from localStorage
  useEffect(() => {
    const storedVideoId = localStorage.getItem(VIDEO_ID_STORAGE_KEY);
    if (storedVideoId) {
      setVideoId(storedVideoId);
      fetchSubtitles(storedVideoId);
    }

    // Load timing config from localStorage
    const storedTiming = localStorage.getItem(TIMING_STORAGE_KEY);
    if (storedTiming) {
      const config = deserializeTimingConfig(storedTiming);
      setTimingConfig(config);
    }

    // Load text styling preferences from localStorage
    const storedTextStyle = localStorage.getItem(TEXT_STYLE_STORAGE_KEY);
    if (storedTextStyle) {
      try {
        const style: TextStyle = JSON.parse(storedTextStyle);
        if (typeof style.textBold === 'boolean') setTextBold(style.textBold);
        if (typeof style.textShadowStrength === 'number') setTextShadowStrength(style.textShadowStrength);
        if (style.highlighterColor) setHighlighterColor(style.highlighterColor);
        if (typeof style.highlighterPaddingX === 'number') setHighlighterPaddingX(style.highlighterPaddingX);
        if (typeof style.highlighterPaddingY === 'number') setHighlighterPaddingY(style.highlighterPaddingY);
      } catch (err) {
        console.warn('Failed to parse text style from localStorage:', err);
      }
    }
  }, []);

  // Listen for storage changes (from other tabs)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === VIDEO_ID_STORAGE_KEY && e.newValue) {
        setVideoId(e.newValue);
        fetchSubtitles(e.newValue);
      }

      if (e.key === TIMING_STORAGE_KEY && e.newValue) {
        const config = deserializeTimingConfig(e.newValue);
        setTimingConfig(config);
      }

      if (e.key === TEXT_STYLE_STORAGE_KEY && e.newValue) {
        try {
          const style: TextStyle = JSON.parse(e.newValue);
          if (typeof style.textBold === 'boolean') setTextBold(style.textBold);
          if (typeof style.textShadowStrength === 'number') setTextShadowStrength(style.textShadowStrength);
          if (style.highlighterColor) setHighlighterColor(style.highlighterColor);
          if (typeof style.highlighterPaddingX === 'number') setHighlighterPaddingX(style.highlighterPaddingX);
          if (typeof style.highlighterPaddingY === 'number') setHighlighterPaddingY(style.highlighterPaddingY);
        } catch (err) {
          console.warn('Failed to parse text style from localStorage:', err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Fetch subtitles for the given video ID
  const fetchSubtitles = async (id: string) => {
    if (!id) return;

    setError('');
    setLoading(true);
    setSubtitles([]);

    try {
      const response = await fetch('/api/subtitles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ videoId: id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load subtitles');
      }

      const loadedSubtitles = data.subtitles || [];
      setSubtitles(loadedSubtitles);

      // 載入字幕後，從 localStorage 載入已有的詞彙快取
      if (loadedSubtitles.length > 0) {
        loadVocabularyCache(id);
      }
    } catch (err: any) {
      console.error('Subtitle loading error:', err);
      setError(err.message || 'Failed to load subtitles');
      setSubtitles([]);
    } finally {
      setLoading(false);
    }
  };

  // 載入詞彙快取
  const loadVocabularyCache = (id: string) => {
    const cacheKey = `${VOCABULARY_CACHE_PREFIX}${id}`;
    const cached = localStorage.getItem(cacheKey);

    if (cached) {
      try {
        const cachedData = JSON.parse(cached);
        setVocabularyMap(cachedData);
        console.log('[前端] 💾 已載入快取的詞彙分析，條目數:', Object.keys(cachedData).length);
      } catch (err) {
        console.warn('[前端] ⚠️  快取解析失敗:', err);
      }
    } else {
      console.log('[前端] 📭 沒有快取資料');
    }
  };

  // 按需分析單句字幕
  const analyzeSubtitle = async (index: number, text: string) => {
    if (!videoId || !text || text.trim().length < 10) {
      console.log('[前端] 跳過分析 - videoId:', videoId, 'text長度:', text?.length);
      return;
    }

    // 避免重複分析
    if (analyzingRef.current.has(index)) {
      console.log('[前端] ⏸️  字幕', index, '正在分析中，跳過重複呼叫');
      return;
    }

    // 檢查快取
    if (vocabularyMap[index] !== undefined) {
      console.log('[前端] ✅ 字幕', index, '已有快取，難字數:', vocabularyMap[index]?.length || 0);
      return;
    }

    console.log('[前端] 🚀 開始分析字幕', index, ':', text.substring(0, 50));
    analyzingRef.current.add(index);
    setIsAnalyzing(true);

    try {
      const response = await fetch('/api/analyze-vocabulary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId,
          subtitleIndex: index,
          text,
        }),
      });

      const data = await response.json();
      console.log('[前端] 📦 API 回應:', data);

      if (data.success && data.vocabulary !== undefined) {
        // 更新狀態
        setVocabularyMap(prev => {
          const updated = { ...prev, [index]: data.vocabulary };

          // 存入 localStorage 快取
          const cacheKey = `${VOCABULARY_CACHE_PREFIX}${videoId}`;
          localStorage.setItem(cacheKey, JSON.stringify(updated));

          console.log('[前端] ✅ 字幕', index, '分析完成，難字數:', data.vocabulary.length, data.vocabulary);
          return updated;
        });
      } else {
        console.error('[前端] ❌ 分析失敗:', data.error);
      }
    } catch (error) {
      console.error('[前端] ❌ 分析請求失敗:', error);
    } finally {
      analyzingRef.current.delete(index);
      setIsAnalyzing(false);
      console.log('[前端] 🏁 分析結束，清除 analyzingRef 中的索引', index);
    }
  };

  // Broadcast style changes to other tabs
  const broadcastStyleChange = (newBgColor?: string, newTextColor?: string, newFontSize?: number) => {
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({
        type: 'STYLE_CHANGED',
        data: {
          bgColor: newBgColor || bgColor,
          textColor: newTextColor || textColor,
          fontSize: newFontSize !== undefined ? newFontSize : fontSize,
        },
      });
    }
  };

  // Broadcast text style changes to other tabs and save to localStorage
  const broadcastTextStyleChange = (
    newTextBold?: boolean,
    newTextShadowStrength?: number,
    newHighlighterColor?: string,
    newHighlighterPaddingX?: number,
    newHighlighterPaddingY?: number
  ) => {
    const updatedBold = newTextBold !== undefined ? newTextBold : textBold;
    const updatedShadowStrength = newTextShadowStrength !== undefined ? newTextShadowStrength : textShadowStrength;
    const updatedHighlighterColor = newHighlighterColor !== undefined ? newHighlighterColor : highlighterColor;
    const updatedHighlighterPaddingX = newHighlighterPaddingX !== undefined ? newHighlighterPaddingX : highlighterPaddingX;
    const updatedHighlighterPaddingY = newHighlighterPaddingY !== undefined ? newHighlighterPaddingY : highlighterPaddingY;

    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({
        type: 'TEXT_STYLE_CHANGED',
        data: {
          textBold: updatedBold,
          textShadowStrength: updatedShadowStrength,
          highlighterColor: updatedHighlighterColor,
          highlighterPaddingX: updatedHighlighterPaddingX,
          highlighterPaddingY: updatedHighlighterPaddingY,
        },
      });
    }

    // Save to localStorage
    const textStyle: TextStyle = {
      textBold: updatedBold,
      textShadowStrength: updatedShadowStrength,
      highlighterColor: updatedHighlighterColor,
      highlighterPaddingX: updatedHighlighterPaddingX,
      highlighterPaddingY: updatedHighlighterPaddingY,
    };
    localStorage.setItem(TEXT_STYLE_STORAGE_KEY, JSON.stringify(textStyle));
  };

  // Broadcast timing config changes to other tabs
  const broadcastTimingConfigChange = (newTimingConfig: TimingConfig) => {
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({
        type: 'TIMING_CONFIG_CHANGED',
        data: {
          timingConfig: newTimingConfig,
        },
      });
    }

    // Save to localStorage
    localStorage.setItem(TIMING_STORAGE_KEY, serializeTimingConfig(newTimingConfig));
  };

  const handleBgColorChange = (color: string) => {
    setBgColor(color);
    broadcastStyleChange(color, undefined, undefined);
  };

  const handleTextColorChange = (color: string) => {
    setTextColor(color);
    broadcastStyleChange(undefined, color, undefined);
  };

  const handleFontSizeChange = (size: number) => {
    setFontSize(size);
    broadcastStyleChange(undefined, undefined, size);
  };

  const handleTextBoldChange = (value: boolean) => {
    setTextBold(value);
    broadcastTextStyleChange(value, undefined, undefined, undefined, undefined);
  };

  const handleTextShadowStrengthChange = (value: number) => {
    setTextShadowStrength(value);
    broadcastTextStyleChange(undefined, value, undefined, undefined, undefined);
  };

  const handleHighlighterColorChange = (value: string) => {
    setHighlighterColor(value);
    broadcastTextStyleChange(undefined, undefined, value, undefined, undefined);
  };

  const handleHighlighterPaddingXChange = (value: number) => {
    setHighlighterPaddingX(value);
    broadcastTextStyleChange(undefined, undefined, undefined, value, undefined);
  };

  const handleHighlighterPaddingYChange = (value: number) => {
    setHighlighterPaddingY(value);
    broadcastTextStyleChange(undefined, undefined, undefined, undefined, value);
  };

  // 監聽當前時間變化，更新當前字幕索引並觸發按需分析
  useEffect(() => {
    if (subtitles.length === 0) {
      setCurrentSubtitleIndex(-1);
      return;
    }

    const newIndex = subtitles.findIndex(
      (sub) => currentTime >= sub.start && currentTime <= sub.end
    );

    if (newIndex !== currentSubtitleIndex) {
      console.log('[前端] 🔄 字幕切換:', currentSubtitleIndex, '->', newIndex);
      setCurrentSubtitleIndex(newIndex);

      // 當切換到新字幕時，觸發按需分析
      if (newIndex >= 0) {
        // 再次檢查是否需要分析（防止重複呼叫）
        const needsAnalysis = !analyzingRef.current.has(newIndex) &&
                              vocabularyMap[newIndex] === undefined &&
                              subtitles[newIndex].text.trim().length >= 10;

        if (needsAnalysis) {
          console.log('[前端] 🎯 觸發字幕分析:', newIndex);
          analyzeSubtitle(newIndex, subtitles[newIndex].text);
        } else {
          console.log('[前端] ⏭️  跳過字幕', newIndex, '- 已分析或快取中');
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTime, subtitles]);

  // 根據當前字幕索引獲取對應的難字
  const getCurrentVocabulary = (): VocabularyItem[] => {
    if (currentSubtitleIndex >= 0 && vocabularyMap[currentSubtitleIndex]) {
      const vocab = vocabularyMap[currentSubtitleIndex];
      // console.log('[前端] 📚 當前字幕', currentSubtitleIndex, '難字:', vocab);
      return vocab;
    }
    return [];
  };

  const currentVocabulary = getCurrentVocabulary();

  return (
    <main className="h-screen flex flex-col bg-neutral-950 relative">
      {/* 左下角狀態面板 - 不擋畫面 */}
      <div className="absolute bottom-24 left-6 z-[9998] bg-neutral-900/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-neutral-700 text-xs font-mono">
        <div className="flex items-center gap-4 text-neutral-400">
          <div>字幕: <span className="text-neutral-200">{currentSubtitleIndex + 1}/{subtitles.length}</span></div>
          <div>快取: <span className="text-neutral-200">{Object.keys(vocabularyMap).length}</span></div>
          <div>難字: <span className={currentVocabulary.length > 0 ? 'text-green-400' : 'text-neutral-500'}>{currentVocabulary.length}</span></div>
          {isAnalyzing && <div className="text-yellow-400">⏳ 分析中</div>}
        </div>
      </div>

      {/* Full-screen subtitle panel */}
      <div className="flex-1 flex flex-col">
        {/* Subtitle display area */}
        <div className="flex-1 flex items-center justify-center p-8 relative">
          {/* 左上角：難字顯示區 - 總是顯示（在字幕顯示區域內，全螢幕時也會顯示） */}
          <div className="absolute top-6 left-6 z-50 bg-neutral-900/95 backdrop-blur-sm px-5 py-4 rounded-xl border border-neutral-700 shadow-2xl min-w-[200px]">
            <div className="mb-2 text-xs text-neutral-500">
              字幕 #{currentSubtitleIndex >= 0 ? currentSubtitleIndex + 1 : '-'}
            </div>

            {isAnalyzing ? (
              <div className="flex items-center gap-2 text-blue-400">
                <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm">分析中...</span>
              </div>
            ) : currentVocabulary.length > 0 ? (
              <div className="space-y-2">
                {currentVocabulary.map((item, index) => (
                  <div key={index} className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-blue-400">{item.word}</span>
                    <span className="text-xs text-neutral-500">:</span>
                    <span className="text-sm text-neutral-300">{item.translation}</span>
                  </div>
                ))}
              </div>
            ) : currentSubtitleIndex >= 0 ? (
              <div className="text-sm text-neutral-500">本句無難字</div>
            ) : (
              <div className="text-sm text-neutral-600">等待播放...</div>
            )}
          </div>

          <SubtitlePanel
            currentTime={currentTime}
            bgColor={bgColor}
            textColor={textColor}
            fontSize={fontSize}
            subtitles={subtitles}
            loading={loading}
            error={error}
            timingConfig={timingConfig}
            textBold={textBold}
            textShadowStrength={textShadowStrength}
            highlighterColor={highlighterColor}
            highlighterPaddingX={highlighterPaddingX}
            highlighterPaddingY={highlighterPaddingY}
          />
        </div>

        {/* Style control panel */}
        <div className="border-t border-neutral-800 space-y-4">
          <StyleControl
            bgColor={bgColor}
            textColor={textColor}
            fontSize={fontSize}
            onBgColorChange={handleBgColorChange}
            onTextColorChange={handleTextColorChange}
            onFontSizeChange={handleFontSizeChange}
          />
          <TextStyleControl
            textBold={textBold}
            textShadowStrength={textShadowStrength}
            highlighterColor={highlighterColor}
            highlighterPaddingX={highlighterPaddingX}
            highlighterPaddingY={highlighterPaddingY}
            onTextBoldChange={handleTextBoldChange}
            onTextShadowStrengthChange={handleTextShadowStrengthChange}
            onHighlighterColorChange={handleHighlighterColorChange}
            onHighlighterPaddingXChange={handleHighlighterPaddingXChange}
            onHighlighterPaddingYChange={handleHighlighterPaddingYChange}
          />
        </div>
      </div>
    </main>
  );
}
