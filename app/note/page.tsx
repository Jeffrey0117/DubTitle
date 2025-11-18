'use client';

import { useState, useEffect } from 'react';

interface Paragraph {
  id: number;
  english: string;
  chinese: string;
}

type DisplayMode = 'side-by-side' | 'english-only' | 'alternating';
type LineSpacing = 1.5 | 1.8 | 2.2;

const STORAGE_KEYS = {
  MODE: 'dubtitle_note_mode',
  FONT_SIZE: 'dubtitle_note_font_size',
  LINE_SPACING: 'dubtitle_note_line_spacing',
  PARAGRAPHS_CACHE: 'dubtitle_note_paragraphs_cache',
};

export default function NotePage() {
  // State management
  const [displayMode, setDisplayMode] = useState<DisplayMode>('side-by-side');
  const [fontSize, setFontSize] = useState<number>(16);
  const [lineSpacing, setLineSpacing] = useState<LineSpacing>(1.8);
  const [paragraphs, setParagraphs] = useState<Paragraph[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Load user preferences from localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem(STORAGE_KEYS.MODE) as DisplayMode;
    const savedFontSize = localStorage.getItem(STORAGE_KEYS.FONT_SIZE);
    const savedLineSpacing = localStorage.getItem(STORAGE_KEYS.LINE_SPACING);

    if (savedMode) setDisplayMode(savedMode);
    if (savedFontSize) setFontSize(parseInt(savedFontSize));
    if (savedLineSpacing) setLineSpacing(parseFloat(savedLineSpacing) as LineSpacing);
  }, []);

  // Fetch paragraphs from API or cache
  useEffect(() => {
    const fetchParagraphs = async () => {
      setLoading(true);
      setError('');

      try {
        // 從 player 頁面的 localStorage 自動載入 videoId
        const savedVideoId = localStorage.getItem('dubtitle_video_id');
        if (!savedVideoId) {
          throw new Error('請先在播放器頁面載入影片');
        }

        console.log('[Note] 從 localStorage 載入 videoId:', savedVideoId);

        // 檢查快取（使用 videoId 作為 key）
        const cacheKey = `dubtitle_note_${savedVideoId}`;
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
          const cached = JSON.parse(cachedData);
          setParagraphs(cached);
          setLoading(false);
          console.log('[Note] 從快取載入段落:', cached.length);
          return;
        }

        // ✅ Agent 1: 優先從 localStorage 讀取字幕（共用機制）
        console.log('[Note] 步驟 1/2: 獲取字幕...');
        const subtitlesCacheKey = `dubtitle_subtitles_${savedVideoId}`;
        let subtitles = [];

        const cachedSubtitles = localStorage.getItem(subtitlesCacheKey);
        if (cachedSubtitles) {
          subtitles = JSON.parse(cachedSubtitles);
          console.log('[Note] ✅ 從 localStorage 讀取字幕（共用）:', subtitles.length);
        } else {
          // 如果沒有快取，才調用 API
          const subtitleResponse = await fetch('/api/subtitles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoId: savedVideoId }),
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
        console.log('[Note] 字幕條數:', transcript.length);

        // 步驟 2: 生成段落
        console.log('[Note] 步驟 2/2: 生成段落...');
        const response = await fetch('/api/note/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            videoId: savedVideoId,
            transcript: transcript,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch paragraphs');
        }

        const data = await response.json();
        const loadedParagraphs = data.paragraphs || [];

        setParagraphs(loadedParagraphs);

        // Cache the response (使用 videoId 作為 key)
        localStorage.setItem(cacheKey, JSON.stringify(loadedParagraphs));
        console.log('[Note] 成功生成', loadedParagraphs.length, '個段落');
      } catch (err: any) {
        console.error('[Note] Error fetching paragraphs:', err);

        // Use demo data if API is not available
        const demoData: Paragraph[] = [
          {
            id: 1,
            english: "The journey of a thousand miles begins with a single step. This ancient wisdom reminds us that even the most ambitious goals start with simple, decisive action.",
            chinese: "千里之行，始於足下。這句古老的智慧提醒我們，即使是最雄心勃勃的目標，也要從簡單而果斷的行動開始。"
          },
          {
            id: 2,
            english: "In the realm of technology, innovation happens at the intersection of creativity and constraint. The most elegant solutions often emerge when we embrace limitations.",
            chinese: "在科技領域，創新發生在創造力與限制的交匯處。最優雅的解決方案往往在我們擁抱限制時出現。"
          },
          {
            id: 3,
            english: "Learning a new language opens doors to different cultures and perspectives. It's not just about words and grammar, but about understanding how others see the world.",
            chinese: "學習新語言為不同的文化和觀點打開了大門。這不僅僅是關於詞彙和語法，更是關於理解他人如何看待世界。"
          },
          {
            id: 4,
            english: "The beauty of open-source software lies in collaboration. When developers worldwide contribute their expertise, everyone benefits from collective knowledge.",
            chinese: "開源軟體的美妙之處在於協作。當全世界的開發者貢獻他們的專業知識時，每個人都能從集體智慧中受益。"
          },
          {
            id: 5,
            english: "Artificial intelligence is not about replacing human intelligence, but augmenting it. The goal is to create tools that enhance our capabilities and help us solve complex problems.",
            chinese: "人工智慧不是要取代人類智慧，而是增強它。目標是創造能夠增強我們能力並幫助我們解決複雜問題的工具。"
          }
        ];

        setParagraphs(demoData);
        setError('Using demo data (API not available)');
      } finally {
        setLoading(false);
      }
    };

    fetchParagraphs();
  }, []);

  // Save preferences to localStorage
  const handleModeChange = (mode: DisplayMode) => {
    setDisplayMode(mode);
    localStorage.setItem(STORAGE_KEYS.MODE, mode);
  };

  const handleFontSizeChange = (delta: number) => {
    const newSize = Math.max(12, Math.min(24, fontSize + delta));
    setFontSize(newSize);
    localStorage.setItem(STORAGE_KEYS.FONT_SIZE, newSize.toString());
  };

  const handleLineSpacingChange = (spacing: LineSpacing) => {
    setLineSpacing(spacing);
    localStorage.setItem(STORAGE_KEYS.LINE_SPACING, spacing.toString());
  };

  // Render loading state
  if (loading) {
    return (
      <main className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 border-4 border-blue-400/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <div className="space-y-2">
            <p className="text-neutral-200 text-lg font-medium">Loading paragraphs...</p>
            <p className="text-neutral-500 text-sm">Preparing your reading material</p>
          </div>
        </div>
      </main>
    );
  }

  // Render error state (but still show demo data)
  const hasError = error && !paragraphs.length;

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* Sticky Control Panel */}
      <div className="sticky top-0 z-50 bg-neutral-900/95 backdrop-blur-sm border-b border-neutral-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-blue-400">閱讀模式</h1>
            <div className="text-xs text-neutral-500">
              {paragraphs.length} 個段落
            </div>
          </div>

          {/* Display Mode Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-400">顯示模式：</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleModeChange('side-by-side')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  displayMode === 'side-by-side'
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                    : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-300'
                }`}
              >
                左右對照
              </button>
              <button
                onClick={() => handleModeChange('english-only')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  displayMode === 'english-only'
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                    : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-300'
                }`}
              >
                純英文
              </button>
              <button
                onClick={() => handleModeChange('alternating')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  displayMode === 'alternating'
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                    : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-300'
                }`}
              >
                交替顯示
              </button>
            </div>
          </div>

          {/* Style Controls */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-2 border-t border-neutral-800">
            {/* Font Size Control */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-neutral-400 hidden sm:inline">字體大小：</label>
              <label className="text-sm text-neutral-400 sm:hidden">大小：</label>
              <button
                onClick={() => handleFontSizeChange(-2)}
                className={`w-9 h-9 rounded-lg text-neutral-300 font-bold transition-all ${
                  fontSize <= 12
                    ? 'bg-neutral-800 text-neutral-600 cursor-not-allowed'
                    : 'bg-neutral-800 hover:bg-neutral-700 hover:text-white'
                }`}
                disabled={fontSize <= 12}
              >
                A-
              </button>
              <span className="text-sm font-mono text-blue-400 min-w-[3rem] text-center">
                {fontSize}px
              </span>
              <button
                onClick={() => handleFontSizeChange(2)}
                className={`w-9 h-9 rounded-lg text-neutral-300 font-bold transition-all ${
                  fontSize >= 24
                    ? 'bg-neutral-800 text-neutral-600 cursor-not-allowed'
                    : 'bg-neutral-800 hover:bg-neutral-700 hover:text-white'
                }`}
                disabled={fontSize >= 24}
              >
                A+
              </button>
            </div>

            {/* Line Spacing Control */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-neutral-400 hidden sm:inline">行距：</label>
              <label className="text-sm text-neutral-400 sm:hidden">行距：</label>
              <button
                onClick={() => handleLineSpacingChange(1.5)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                  lineSpacing === 1.5
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                    : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-300'
                }`}
              >
                緊密
              </button>
              <button
                onClick={() => handleLineSpacingChange(1.8)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                  lineSpacing === 1.8
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                    : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-300'
                }`}
              >
                標準
              </button>
              <button
                onClick={() => handleLineSpacingChange(2.2)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                  lineSpacing === 2.2
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                    : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-300'
                }`}
              >
                寬鬆
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 text-yellow-400 text-sm bg-yellow-950/30 px-3 py-2 rounded-lg border border-yellow-800/30">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>

      {/* Content Area */}
      {hasError ? (
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <p className="text-red-400 text-lg">Failed to load content. Please try again later.</p>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Side-by-Side Mode */}
          {displayMode === 'side-by-side' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12">
              {/* English Column */}
              <div className="space-y-6">
                <div className="sticky top-[180px] lg:top-[200px] bg-neutral-950/95 backdrop-blur-sm py-3 border-b border-blue-500/30 z-10">
                  <h2 className="text-xl font-bold text-blue-400">English</h2>
                </div>
                {paragraphs.map((para, index) => (
                  <div
                    key={`en-${para.id}`}
                    className="group relative p-4 rounded-lg hover:bg-neutral-900/50 transition-colors"
                  >
                    <div className="absolute left-0 top-4 text-xs font-mono text-neutral-600">
                      {index + 1}
                    </div>
                    <p
                      className="text-neutral-200 pl-6"
                      style={{
                        fontSize: `${fontSize}px`,
                        lineHeight: lineSpacing,
                      }}
                    >
                      {para.english}
                    </p>
                  </div>
                ))}
              </div>

              {/* Chinese Column */}
              <div className="space-y-6">
                <div className="sticky top-[180px] lg:top-[200px] bg-neutral-950/95 backdrop-blur-sm py-3 border-b border-blue-500/30 z-10">
                  <h2 className="text-xl font-bold text-blue-400">中文</h2>
                </div>
                {paragraphs.map((para, index) => (
                  <div
                    key={`zh-${para.id}`}
                    className="group relative p-4 rounded-lg hover:bg-neutral-900/50 transition-colors"
                  >
                    <div className="absolute left-0 top-4 text-xs font-mono text-neutral-600">
                      {index + 1}
                    </div>
                    <p
                      className="text-neutral-200 pl-6"
                      style={{
                        fontSize: `${fontSize}px`,
                        lineHeight: lineSpacing,
                      }}
                    >
                      {para.chinese}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* English Only Mode */}
          {displayMode === 'english-only' && (
            <div className="max-w-4xl mx-auto space-y-6">
              {paragraphs.map((para, index) => (
                <div
                  key={`en-only-${para.id}`}
                  className="group relative p-6 rounded-lg hover:bg-neutral-900/50 transition-colors border border-transparent hover:border-neutral-800"
                >
                  <div className="absolute left-2 top-6 text-xs font-mono text-neutral-600 group-hover:text-blue-500 transition-colors">
                    {index + 1}
                  </div>
                  <p
                    className="text-neutral-200 pl-6"
                    style={{
                      fontSize: `${fontSize}px`,
                      lineHeight: lineSpacing,
                    }}
                  >
                    {para.english}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Alternating Mode */}
          {displayMode === 'alternating' && (
            <div className="max-w-4xl mx-auto space-y-8">
              {paragraphs.map((para, index) => (
                <div
                  key={`alt-${para.id}`}
                  className="group relative p-6 rounded-lg hover:bg-neutral-900/50 transition-colors border border-neutral-800/50"
                >
                  <div className="absolute left-2 top-6 text-xs font-mono text-neutral-600 group-hover:text-blue-500 transition-colors">
                    {index + 1}
                  </div>
                  <div className="space-y-4 pl-6">
                    <p
                      className="text-neutral-200"
                      style={{
                        fontSize: `${fontSize}px`,
                        lineHeight: lineSpacing,
                      }}
                    >
                      {para.english}
                    </p>
                    <div className="relative pl-4 border-l-2 border-blue-500/30">
                      <p
                        className="text-neutral-400 italic"
                        style={{
                          fontSize: `${fontSize * 0.9}px`,
                          lineHeight: lineSpacing,
                        }}
                      >
                        {para.chinese}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
