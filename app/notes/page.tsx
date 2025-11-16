'use client';

import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Subtitle {
  start: number;
  end: number;
  text: string;
}

export default function NotesPage() {
  const [videoId, setVideoId] = useState<string>('');
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [currentSubtitle, setCurrentSubtitle] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isPreview, setIsPreview] = useState<boolean>(false);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 初始化 BroadcastChannel
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        broadcastChannelRef.current = new BroadcastChannel('dubtitle-video');
      } catch (error) {
        console.log('BroadcastChannel not supported');
      }
    }
  }, []);

  // 監聽來自 player 頁面的訊息
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type, data } = event.data || {};

      // 接收影片 ID
      if (event.data && event.data.videoId !== undefined) {
        setVideoId(event.data.videoId);
      }

      // 接收當前時間
      if (type === 'TIME_UPDATED' && typeof data?.currentTime === 'number') {
        setCurrentTime(data.currentTime);
      }
    };

    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.addEventListener('message', handleMessage);
      return () => {
        broadcastChannelRef.current?.removeEventListener('message', handleMessage);
      };
    }
  }, []);

  // 從 localStorage 載入 videoId
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedVideoId = localStorage.getItem('dubtitle_video_id');
      if (savedVideoId) {
        setVideoId(savedVideoId);
      }
    }
  }, []);

  // 載入字幕
  useEffect(() => {
    if (!videoId) return;

    const fetchSubtitles = async () => {
      try {
        const response = await fetch('/api/subtitles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoId }),
        });

        const data = await response.json();
        if (data.success) {
          setSubtitles(data.subtitles || []);
        }
      } catch (error) {
        console.error('載入字幕失敗:', error);
      }
    };

    fetchSubtitles();
  }, [videoId]);

  // 更新當前字幕
  useEffect(() => {
    if (subtitles.length === 0) return;

    const subtitle = subtitles.find(
      (sub) => currentTime >= sub.start && currentTime <= sub.end
    );

    setCurrentSubtitle(subtitle?.text || '');
  }, [currentTime, subtitles]);

  // 載入筆記
  useEffect(() => {
    if (!videoId) return;

    const savedNotes = localStorage.getItem(`dubtitle_notes_${videoId}`);
    if (savedNotes) {
      setNotes(savedNotes);
    } else {
      setNotes(`# ${videoId} 學習筆記\n\n## 📝 筆記區\n\n`);
    }
  }, [videoId]);

  // 自動保存筆記
  useEffect(() => {
    if (!videoId || !notes) return;

    const timer = setTimeout(() => {
      localStorage.setItem(`dubtitle_notes_${videoId}`, notes);
    }, 1000);

    return () => clearTimeout(timer);
  }, [notes, videoId]);

  // 插入時間戳
  const insertTimestamp = () => {
    const timestamp = `[${formatTime(currentTime)}]`;
    const textarea = textareaRef.current;

    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newNotes =
        notes.substring(0, start) +
        timestamp +
        (currentSubtitle ? ` ${currentSubtitle}` : '') +
        '\n' +
        notes.substring(end);

      setNotes(newNotes);

      // 將光標移到新插入的文本後面
      setTimeout(() => {
        textarea.focus();
        const newPosition = start + timestamp.length + (currentSubtitle ? currentSubtitle.length + 1 : 0) + 1;
        textarea.setSelectionRange(newPosition, newPosition);
      }, 0);
    }
  };

  // 格式化時間
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // 清空筆記
  const clearNotes = () => {
    if (confirm('確定要清空筆記嗎？此操作無法復原。')) {
      setNotes(`# ${videoId} 學習筆記\n\n## 📝 筆記區\n\n`);
    }
  };

  // 匯出筆記
  const exportNotes = () => {
    const blob = new Blob([notes], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${videoId}_notes.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="h-screen flex flex-col bg-neutral-950">
      {/* 頂部資訊欄 */}
      <div className="border-b border-neutral-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-neutral-100">講義模式</h1>
            <p className="text-sm text-neutral-500 mt-1">
              影片 ID: {videoId || '未載入'} | 時間: {formatTime(currentTime)}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsPreview(!isPreview)}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-100 rounded-lg transition text-sm"
            >
              {isPreview ? '📝 編輯' : '👁️ 預覽'}
            </button>
            <button
              onClick={exportNotes}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm"
            >
              📥 匯出
            </button>
            <button
              onClick={clearNotes}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition text-sm"
            >
              🗑️ 清空
            </button>
          </div>
        </div>
      </div>

      {/* 主要內容區 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左側：當前字幕 */}
        <div className="w-2/5 border-r border-neutral-800 flex flex-col">
          <div className="border-b border-neutral-800 px-4 py-3 bg-neutral-900">
            <h2 className="text-sm font-medium text-neutral-400">當前字幕</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            {currentSubtitle ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <span className="text-xs text-neutral-500 font-mono mt-1">
                    {formatTime(currentTime)}
                  </span>
                  <p className="text-lg text-neutral-100 leading-relaxed">
                    {currentSubtitle}
                  </p>
                </div>
                <button
                  onClick={insertTimestamp}
                  className="w-full px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg transition text-sm flex items-center justify-center gap-2"
                >
                  ⏱️ 插入時間戳 + 字幕
                </button>
              </div>
            ) : (
              <p className="text-neutral-500 text-sm">等待字幕...</p>
            )}

            {/* 最近字幕列表 */}
            <div className="mt-8">
              <h3 className="text-xs font-medium text-neutral-500 mb-3">最近字幕</h3>
              <div className="space-y-2">
                {subtitles
                  .filter((sub) => sub.start <= currentTime && sub.start >= currentTime - 30)
                  .reverse()
                  .slice(0, 5)
                  .map((sub, index) => (
                    <div
                      key={index}
                      className="p-2 bg-neutral-900 rounded text-xs text-neutral-400 border border-neutral-800"
                    >
                      <span className="text-neutral-600 font-mono">
                        {formatTime(sub.start)}
                      </span>{' '}
                      {sub.text}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>

        {/* 右側：筆記編輯 */}
        <div className="flex-1 flex flex-col">
          <div className="border-b border-neutral-800 px-4 py-3 bg-neutral-900">
            <h2 className="text-sm font-medium text-neutral-400">
              {isPreview ? 'Markdown 預覽' : 'Markdown 編輯器'}
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isPreview ? (
              <div className="p-6 prose prose-invert prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {notes}
                </ReactMarkdown>
              </div>
            ) : (
              <textarea
                ref={textareaRef}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full h-full p-6 bg-neutral-950 text-neutral-100 font-mono text-sm resize-none focus:outline-none"
                placeholder="在這裡輸入你的學習筆記..."
              />
            )}
          </div>
        </div>
      </div>

      {/* 底部提示 */}
      <div className="border-t border-neutral-800 px-6 py-3 bg-neutral-900">
        <p className="text-xs text-neutral-500">
          💡 提示: 點擊「插入時間戳」自動記錄當前播放時間與字幕 | 筆記自動保存至瀏覽器本地
        </p>
      </div>
    </main>
  );
}
