'use client';

import { useState, useRef, useEffect } from 'react';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YouTubePlayerProps {
  videoId: string;
  onUrlSubmit: (url: string) => void;
  onTimeUpdate: (time: number) => void;
}

export default function YouTubePlayer({ videoId, onUrlSubmit, onTimeUpdate }: YouTubePlayerProps) {
  const [inputUrl, setInputUrl] = useState('');
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const onTimeUpdateRef = useRef(onTimeUpdate);

  // Keep onTimeUpdate ref up to date
  useEffect(() => {
    onTimeUpdateRef.current = onTimeUpdate;
  }, [onTimeUpdate]);

  // Load YouTube API only once
  useEffect(() => {
    if (window.YT && window.YT.Player) return;

    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Initialize player when videoId changes
  useEffect(() => {
    if (!videoId) return;

    const initPlayer = () => {
      if (!containerRef.current) return;

      // Destroy existing player if any
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        playerRef.current.destroy();
        playerRef.current = null;
      }

      // Clear existing interval
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current);
        timeUpdateIntervalRef.current = null;
      }

      // Create new player
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId: videoId,
        playerVars: {
          enablejsapi: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            console.log('YouTube player ready');
            timeUpdateIntervalRef.current = setInterval(() => {
              if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
                const time = playerRef.current.getCurrentTime();
                onTimeUpdateRef.current(time);
              }
            }, 100);
          },
          onError: (event: any) => {
            console.error('YouTube player error:', event.data);
          }
        },
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current);
        timeUpdateIntervalRef.current = null;
      }
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [videoId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputUrl.trim()) {
      onUrlSubmit(inputUrl);
    }
  };

  return (
    <div className="w-full max-w-3xl space-y-6">
      {/* URL輸入框 - 極簡設計 */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <input
          type="text"
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
          placeholder="輸入 YouTube 鏈接..."
          className="w-full px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-neutral-500 transition-colors"
        />
        <button
          type="submit"
          className="w-full px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-100 rounded-lg transition-colors text-sm font-medium"
        >
          載入視頻
        </button>
      </form>

      {/* YouTube播放器 */}
      {videoId && (
        <div
          ref={containerRef}
          className="relative aspect-video bg-neutral-900 rounded-lg overflow-hidden shadow-2xl"
        />
      )}

      {!videoId && (
        <div className="aspect-video bg-neutral-900 rounded-lg flex items-center justify-center border border-dashed border-neutral-700">
          <p className="text-neutral-500 text-sm">等待載入視頻...</p>
        </div>
      )}
    </div>
  );
}
