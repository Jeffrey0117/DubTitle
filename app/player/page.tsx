'use client';

import { useState, useEffect, useRef } from 'react';
import YouTubePlayer from '@/components/YouTubePlayer';
import TimingCalibration from '@/components/TimingCalibration';
import { TimingConfig, DEFAULT_TIMING, deserializeTimingConfig, serializeTimingConfig } from '@/lib/timingUtils';

export default function PlayerPage() {
  const [videoId, setVideoId] = useState<string>('');
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [timingConfig, setTimingConfig] = useState<TimingConfig>(DEFAULT_TIMING);
  const [subtitles, setSubtitles] = useState<Array<{ start: number; end: number; text: string }>>([]);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const youtubePlayerRef = useRef<any>(null);

  // Initialize BroadcastChannel on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        broadcastChannelRef.current = new BroadcastChannel('dubtitle-video');
        console.log('[播放器页] ✅ BroadcastChannel 已连接');
      } catch (error) {
        console.log('[播放器页] ⚠️ BroadcastChannel 不支持，仅使用 localStorage');
      }
    }
  }, []);

  // Load videoId from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedVideoId = localStorage.getItem('dubtitle_video_id');
      if (savedVideoId) {
        setVideoId(savedVideoId);
      }
    }
  }, []);

  // Load timing config from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTimingConfig = localStorage.getItem('dubtitle_timing_config');
      if (savedTimingConfig) {
        const config = deserializeTimingConfig(savedTimingConfig);
        setTimingConfig(config);
      }
    }
  }, []);

  // Listen for messages from other tabs/windows
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type, data } = event.data || {};

      // Handle VIDEO_ID_CHANGED message (legacy format)
      if (event.data && event.data.videoId !== undefined) {
        setVideoId(event.data.videoId);
      }

      // Handle TIMING_CONFIG_CHANGED message
      if (type === 'TIMING_CONFIG_CHANGED' && data?.timingConfig) {
        setTimingConfig(data.timingConfig);
      }

      // Handle TEXT_STYLE_CHANGED message (for future features)
      if (type === 'TEXT_STYLE_CHANGED' && data) {
        // This message is received but no action needed on player page currently
        // Can be extended in the future for dynamic styling
        console.debug('TEXT_STYLE_CHANGED received on player:', data);
      }

      // Handle PLAYER_CONTROL messages from subtitle page
      if (type === 'PLAYER_CONTROL' && youtubePlayerRef.current) {
        const player = youtubePlayerRef.current;
        const { action, value } = data || {};

        console.log('[播放器控制] 收到命令:', action, value);

        try {
          switch (action) {
            case 'PLAY':
              if (typeof player.playVideo === 'function') {
                player.playVideo();
              }
              break;
            case 'PAUSE':
              if (typeof player.pauseVideo === 'function') {
                player.pauseVideo();
              }
              break;
            case 'TOGGLE_PLAY':
              if (typeof player.getPlayerState === 'function') {
                const state = player.getPlayerState();
                // 1 = playing, 2 = paused
                if (state === 1) {
                  player.pauseVideo();
                } else {
                  player.playVideo();
                }
              }
              break;
            case 'SEEK':
              if (typeof player.seekTo === 'function' && typeof value === 'number') {
                const currentTime = player.getCurrentTime();
                player.seekTo(currentTime + value, true);
              }
              break;
            case 'SEEK_TO':
              if (typeof player.seekTo === 'function' && typeof value === 'number') {
                player.seekTo(value, true);
              }
              break;
            case 'VOLUME_UP':
              if (typeof player.getVolume === 'function' && typeof player.setVolume === 'function') {
                const currentVolume = player.getVolume();
                player.setVolume(Math.min(100, currentVolume + 10));
              }
              break;
            case 'VOLUME_DOWN':
              if (typeof player.getVolume === 'function' && typeof player.setVolume === 'function') {
                const currentVolume = player.getVolume();
                player.setVolume(Math.max(0, currentVolume - 10));
              }
              break;
            case 'MUTE':
              if (typeof player.mute === 'function') {
                player.mute();
              }
              break;
            case 'UNMUTE':
              if (typeof player.unMute === 'function') {
                player.unMute();
              }
              break;
            case 'TOGGLE_MUTE':
              if (typeof player.isMuted === 'function') {
                if (player.isMuted()) {
                  player.unMute();
                } else {
                  player.mute();
                }
              }
              break;
            case 'PLAYBACK_RATE':
              if (typeof player.setPlaybackRate === 'function' && typeof value === 'number') {
                player.setPlaybackRate(value);
              }
              break;
            default:
              console.warn('Unknown player control action:', action);
          }
        } catch (error) {
          console.error('Error executing player control:', error);
        }
      }
    };

    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.addEventListener('message', handleMessage);
      return () => {
        broadcastChannelRef.current?.removeEventListener('message', handleMessage);
      };
    }
  }, []);

  // Extract video ID from YouTube URL
  const extractVideoId = (url: string): string | null => {
    let videoId = null;

    // Handle youtu.be format
    const match1 = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([^&\n?#]+)/);
    if (match1 && match1[1]) {
      videoId = match1[1];
    }

    // Handle youtube.com/embed format
    if (!videoId) {
      const match2 = url.match(/youtube\.com\/embed\/([^&\n?#]+)/);
      if (match2 && match2[1]) {
        videoId = match2[1];
      }
    }

    // If it's just the video ID itself
    if (!videoId && url.length === 11 && /^[a-zA-Z0-9_-]+$/.test(url)) {
      videoId = url;
    }

    return videoId;
  };

  const handleUrlSubmit = (url: string) => {
    const extracted = extractVideoId(url);
    if (extracted) {
      setVideoId(extracted);

      // Save to localStorage
      localStorage.setItem('dubtitle_video_id', extracted);

      // Broadcast to other tabs/windows
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage({ videoId: extracted });
      }
    } else {
      alert('Invalid YouTube URL or video ID. Please try again.');
    }
  };

  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time);
    // Broadcast time update to other tabs/windows
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({
        type: 'TIME_UPDATED',
        data: { currentTime: time }
      });
    }
  };

  const handleTimingConfigChange = (newConfig: TimingConfig) => {
    setTimingConfig(newConfig);

    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('dubtitle_timing_config', serializeTimingConfig(newConfig));
    }

    // Broadcast to other tabs/windows with correct message format
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({
        type: 'TIMING_CONFIG_CHANGED',
        data: {
          timingConfig: newConfig
        }
      });
    }
  };

  const handlePlayerReady = (player: any) => {
    youtubePlayerRef.current = player;
    console.log('YouTube player instance saved for remote control');
  };

  return (
    <div className="w-full min-h-screen flex flex-col bg-neutral-950">
      {/* Header with Title */}
      <div className="w-full border-b border-neutral-800/50">
        <div className="max-w-6xl mx-auto px-6 py-8 text-center">
          <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-br from-neutral-100 via-neutral-300 to-neutral-500 bg-clip-text text-transparent">
            Dubtitle
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            雙語字幕同步播放器
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center overflow-y-auto">
        <div className="w-full max-w-6xl mx-auto px-6 py-10 space-y-8">
          <YouTubePlayer
            videoId={videoId}
            onUrlSubmit={handleUrlSubmit}
            onTimeUpdate={handleTimeUpdate}
            onPlayerReady={handlePlayerReady}
          />

          {/* Timing Calibration Component */}
          <TimingCalibration
            subtitles={subtitles}
            currentTime={currentTime}
            onTimingChange={handleTimingConfigChange}
            initialConfig={timingConfig}
          />
        </div>
      </div>

      {/* Footer Description */}
      <div className="w-full border-t border-neutral-800/50">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <p className="text-xs text-neutral-600 leading-relaxed">
            dubtitle 是一款專為學習外語設計的雙語字幕播放工具。支援 YouTube 影片同步顯示原文與譯文字幕，並提供時間軸校準功能，讓您精確對齊字幕與影片，提升語言學習效率。
          </p>
        </div>
      </div>
    </div>
  );
}
