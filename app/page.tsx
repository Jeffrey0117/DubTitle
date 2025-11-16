'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-neutral-950 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl">
        {/* 標題區 */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold tracking-tight bg-gradient-to-br from-neutral-100 via-neutral-300 to-neutral-500 bg-clip-text text-transparent mb-4">
            Dubtitle
          </h1>
          <p className="text-xl text-neutral-400">
            AI 驅動的雙語字幕學習平台
          </p>
        </div>

        {/* 功能卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* 播放器頁面 */}
          <Link href="/player">
            <div className="group p-8 bg-neutral-900 hover:bg-neutral-800 rounded-xl border border-neutral-800 hover:border-neutral-600 transition-all cursor-pointer">
              <div className="text-4xl mb-4">🎬</div>
              <h2 className="text-xl font-bold text-neutral-100 mb-2">
                播放器模式
              </h2>
              <p className="text-sm text-neutral-500 mb-4">
                YouTube 影片播放與字幕時間校準
              </p>
              <div className="text-blue-500 text-sm group-hover:text-blue-400 flex items-center gap-1">
                開始使用
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </div>
          </Link>

          {/* 字幕頁面 + 講義模式 */}
          <Link href="/subtitle">
            <div className="group p-8 bg-gradient-to-br from-blue-900/20 to-purple-900/20 hover:from-blue-900/30 hover:to-purple-900/30 rounded-xl border border-blue-800/50 hover:border-blue-600/50 transition-all cursor-pointer">
              <div className="text-4xl mb-4">📺</div>
              <h2 className="text-xl font-bold text-neutral-100 mb-2">
                字幕模式
                <span className="ml-2 px-2 py-0.5 bg-blue-600 text-white text-xs rounded">講義</span>
              </h2>
              <p className="text-sm text-neutral-400 mb-4">
                全螢幕雙語字幕顯示 + AI 難字分析
              </p>
              <div className="text-blue-400 text-sm group-hover:text-blue-300 flex items-center gap-1">
                開始使用
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </div>
          </Link>
        </div>

        {/* 功能說明 */}
        <div className="mt-12 p-6 bg-neutral-900 rounded-xl border border-neutral-800">
          <h3 className="text-sm font-medium text-neutral-400 mb-4">使用說明</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-neutral-500">
            <div>
              <span className="text-neutral-400 font-medium">步驟 1:</span> 在播放器頁面輸入 YouTube 連結
            </div>
            <div>
              <span className="text-neutral-400 font-medium">步驟 2:</span> 開啟字幕頁面進行全螢幕學習 + AI 難字分析
            </div>
          </div>
        </div>

        {/* 版本資訊 */}
        <div className="mt-6 text-center text-xs text-neutral-600">
          Dubtitle Beta v0.2 | 零成本啟動 | 完全開源
        </div>
      </div>
    </main>
  );
}
