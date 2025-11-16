'use client';

import { useState, useEffect } from 'react';
import YouTubePlayer from '@/components/YouTubePlayer';
import SubtitlePanel from '@/components/SubtitlePanel';
import StyleControl from '@/components/StyleControl';
import { TimingConfig, DEFAULT_TIMING, deserializeTimingConfig } from '@/lib/timingUtils';

interface Subtitle {
  start: number;
  end: number;
  text: string;
}

const TIMING_STORAGE_KEY = 'dubtitle_timing_config';

export default function Home() {
  const [videoId, setVideoId] = useState<string>('');
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [bgColor, setBgColor] = useState<string>('#000000');
  const [textColor, setTextColor] = useState<string>('#ffffff');
  const [fontSize, setFontSize] = useState<number>(32);
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [timingConfig, setTimingConfig] = useState<TimingConfig>(DEFAULT_TIMING);

  // Load timing config from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(TIMING_STORAGE_KEY);
    if (stored) {
      const config = deserializeTimingConfig(stored);
      setTimingConfig(config);
    }
  }, []);


  const extractVideoId = (url: string): string => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : '';
  };

  const handleUrlSubmit = async (url: string) => {
    const id = extractVideoId(url);
    if (id) {
      setVideoId(id);
      setError('');
      setLoading(true);

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
          throw new Error(data.error || '字幕加载失败');
        }

        setSubtitles(data.subtitles || []);
      } catch (err: any) {
        console.error('字幕加载错误:', err);
        setError(err.message || '字幕加载失败');
        setSubtitles([]);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <main className="h-screen flex flex-col bg-neutral-950">
      {/* 双视窗布局 */}
      <div className="flex-1 flex">
        {/* 左侧：YouTube播放器 */}
        <div className="w-1/2 flex items-center justify-center p-8 border-r border-neutral-800">
          <YouTubePlayer
            videoId={videoId}
            onUrlSubmit={handleUrlSubmit}
            onTimeUpdate={setCurrentTime}
          />
        </div>

        {/* 右侧：字幕面板 */}
        <div className="w-1/2 flex flex-col">
          <div className="flex-1 flex items-center justify-center p-8">
            <SubtitlePanel
              currentTime={currentTime}
              bgColor={bgColor}
              textColor={textColor}
              fontSize={fontSize}
              subtitles={subtitles}
              loading={loading}
              error={error}
              timingConfig={timingConfig}
            />
          </div>

          {/* 样式控制面板 */}
          <div className="border-t border-neutral-800">
            <StyleControl
              bgColor={bgColor}
              textColor={textColor}
              fontSize={fontSize}
              onBgColorChange={setBgColor}
              onTextColorChange={setTextColor}
              onFontSizeChange={setFontSize}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
