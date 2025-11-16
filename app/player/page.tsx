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

  // Initialize BroadcastChannel on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        broadcastChannelRef.current = new BroadcastChannel('dubtitle-video');
      } catch (error) {
        console.log('BroadcastChannel not supported, using localStorage only');
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

  return (
    <div className="w-full h-screen flex flex-col bg-neutral-950 overflow-hidden">
      {/* Full Screen Player */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-4xl space-y-6">
          <YouTubePlayer
            videoId={videoId}
            onUrlSubmit={handleUrlSubmit}
            onTimeUpdate={handleTimeUpdate}
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
    </div>
  );
}
