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

const VIDEO_ID_STORAGE_KEY = 'dubtitle_video_id';
const TIMING_STORAGE_KEY = 'dubtitle_timing_config';
const TEXT_STYLE_STORAGE_KEY = 'dubtitle_text_style';
const BROADCAST_CHANNEL_NAME = 'dubtitle-video';

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
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

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

      setSubtitles(data.subtitles || []);
    } catch (err: any) {
      console.error('Subtitle loading error:', err);
      setError(err.message || 'Failed to load subtitles');
      setSubtitles([]);
    } finally {
      setLoading(false);
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

  return (
    <main className="h-screen flex flex-col bg-neutral-950 relative">
      {/* Debug Info */}
      <div className="absolute top-4 left-4 z-50 text-xs text-neutral-400 bg-neutral-900 px-3 py-1 rounded">
        時間: {currentTime.toFixed(1)}s | 字幕數: {subtitles.length}
      </div>

      {/* Full-screen subtitle panel */}
      <div className="flex-1 flex flex-col">
        {/* Subtitle display area */}
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
