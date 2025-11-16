'use client';

import { useEffect, useState, useRef } from 'react';
import { TimingConfig, DEFAULT_TIMING, findSubtitleAtTime } from '@/lib/timingUtils';

interface Subtitle {
  start: number;
  end: number;
  text: string;
}

interface VocabularyItem {
  word: string;
  translation: string;
}

interface SubtitlePanelProps {
  currentTime: number;
  bgColor: string;
  textColor: string;
  fontSize: number;
  subtitles: Subtitle[];
  loading: boolean;
  error: string;
  timingConfig?: TimingConfig;
  textBold?: boolean;
  textShadowStrength?: number;
  highlighterColor?: string;
  highlighterPaddingX?: number;
  highlighterPaddingY?: number;
  currentSubtitleIndex?: number;
  currentVocabulary?: VocabularyItem[];
  isAnalyzing?: boolean;
}

export default function SubtitlePanel({
  currentTime,
  bgColor,
  textColor,
  fontSize,
  subtitles,
  loading,
  error,
  timingConfig = DEFAULT_TIMING,
  textBold = false,
  textShadowStrength = 0,
  highlighterColor = 'transparent',
  highlighterPaddingX = 0,
  highlighterPaddingY = 0,
  currentSubtitleIndex = -1,
  currentVocabulary = [],
  isAnalyzing = false
}: SubtitlePanelProps) {
  const [currentSubtitle, setCurrentSubtitle] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (subtitles.length === 0) {
      setCurrentSubtitle('');
      return;
    }

    // Apply timing calibration to find current subtitle
    const subtitle = findSubtitleAtTime(subtitles, currentTime, timingConfig);
    setCurrentSubtitle(subtitle);
  }, [currentTime, subtitles, timingConfig]);

  // 顯示內容優先級：錯誤 > 加載中 > 字幕內容 > 默認提示
  let displayText = '';
  let displayColor = textColor;

  if (error) {
    displayText = `錯誤: ${error}`;
    displayColor = '#ef4444'; // red-500
  } else if (loading) {
    displayText = '正在載入字幕...';
    displayColor = '#a3a3a3'; // neutral-400
  } else if (currentSubtitle) {
    displayText = currentSubtitle;
  } else if (subtitles.length > 0) {
    displayText = '等待字幕...';
    displayColor = '#737373'; // neutral-500
  } else {
    displayText = '輸入YouTube鏈接開始';
    displayColor = '#525252'; // neutral-600
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative"
      style={isFullscreen ? {
        width: '100vw',
        height: '100vh',
        position: 'relative'
      } : {}}
    >
      {/* 左上角：難字顯示區 - 在全螢幕元素內部，確保全螢幕時可見 */}
      <div
        className="absolute px-5 py-4 rounded-xl border shadow-2xl min-w-[200px]"
        style={{
          top: '24px',
          left: '24px',
          zIndex: 9999,
          backgroundColor: 'rgba(23, 23, 23, 0.98)',
          borderColor: '#404040',
          backdropFilter: 'blur(8px)'
        }}
      >
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

      {/* 全屏按鈕 */}
      <button
        onClick={toggleFullscreen}
        className="absolute top-4 right-4 z-10 p-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
        title={isFullscreen ? '退出全屏' : '全屏'}
      >
        {isFullscreen ? (
          <svg className="w-5 h-5 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-5 h-5 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        )}
      </button>

      <div
        className="h-full rounded-lg flex flex-col items-center justify-center transition-all duration-300 shadow-2xl"
        style={{
          backgroundColor: bgColor,
        }}
      >
        {loading && (
          <div className="mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-400"></div>
          </div>
        )}

        <p
          className="text-center leading-relaxed transition-all duration-300"
          style={{
            color: displayColor,
            fontSize: `${fontSize}px`,
            fontWeight: textBold ? 700 : 400,
            textShadow: textShadowStrength > 0 ? `${textShadowStrength * 0.5}px ${textShadowStrength * 0.5}px ${textShadowStrength}px rgba(0,0,0,0.8)` : 'none',
          }}
        >
          {highlighterColor !== 'transparent' ? (
            <span style={{
              backgroundColor: highlighterColor,
              paddingLeft: `${highlighterPaddingX}px`,
              paddingRight: `${highlighterPaddingX}px`,
              paddingTop: `${highlighterPaddingY}px`,
              paddingBottom: `${highlighterPaddingY}px`,
            }}>
              {displayText}
            </span>
          ) : (
            displayText
          )}
        </p>
      </div>
    </div>
  );
}
