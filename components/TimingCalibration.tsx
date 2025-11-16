'use client';

import { useState, useEffect } from 'react';
import {
  TimingConfig,
  DEFAULT_TIMING,
  BASE_OFFSET,
  detectTimingIssues,
  SmartDetectionResult,
} from '@/lib/timingUtils';

interface TimingCalibrationProps {
  subtitles: Array<{ start: number; end: number; text: string }>;
  currentTime: number;
  onTimingChange: (config: TimingConfig) => void;
  initialConfig?: TimingConfig;
}

export default function TimingCalibration({
  subtitles,
  currentTime,
  onTimingChange,
  initialConfig = DEFAULT_TIMING,
}: TimingCalibrationProps) {
  const [config, setConfig] = useState<TimingConfig>(initialConfig);
  const [smartDetection, setSmartDetection] = useState<SmartDetectionResult | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [autoSuggestion, setAutoSuggestion] = useState(false);

  // Smart detection on subtitle load
  useEffect(() => {
    if (subtitles.length > 1) {
      const detection = detectTimingIssues(subtitles, currentTime);
      setSmartDetection(detection);

      // Auto-apply suggestion if confident
      if (autoSuggestion && detection.detected && detection.confidence > 70) {
        const newConfig = detection.recommendation;
        setConfig(newConfig);
        onTimingChange(newConfig);
      }
    }
  }, [subtitles, autoSuggestion, currentTime, onTimingChange]);

  const handleOffsetChange = (userOffset: number) => {
    // User sees relative offset (0-centered), but we store absolute offset
    const newConfig = { ...config, offset: BASE_OFFSET + userOffset };
    setConfig(newConfig);
    onTimingChange(newConfig);
  };

  const handlePreRollChange = (value: number) => {
    const newConfig = { ...config, preRoll: value };
    setConfig(newConfig);
    onTimingChange(newConfig);
  };

  const handlePostRollChange = (value: number) => {
    const newConfig = { ...config, postRoll: value };
    setConfig(newConfig);
    onTimingChange(newConfig);
  };

  const handleReset = () => {
    setConfig(DEFAULT_TIMING);
    onTimingChange(DEFAULT_TIMING);
  };

  const handleApplySuggestion = () => {
    if (smartDetection?.detected) {
      const newConfig = smartDetection.recommendation;
      setConfig(newConfig);
      onTimingChange(newConfig);
    }
  };

  return (
    <div className="p-6 bg-neutral-900 space-y-4 border-t border-neutral-800">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-neutral-400">字幕時間校準</h3>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs text-neutral-500 hover:text-neutral-300 transition"
        >
          {showAdvanced ? '隱藏' : '顯示'}高級
        </button>
      </div>

      {/* Quick Controls Row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Offset Control */}
        <div className="space-y-2">
          <label className="text-xs text-neutral-500">
            時間偏移 (秒)
            <span className="ml-2 text-neutral-600">
              {(() => {
                const userOffset = config.offset - BASE_OFFSET;
                return (userOffset > 0 ? '+' : '') + userOffset.toFixed(1);
              })()}
            </span>
          </label>
          <input
            type="range"
            min="-10"
            max="10"
            step="0.1"
            value={config.offset - BASE_OFFSET}
            onChange={(e) => handleOffsetChange(parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="flex gap-1 text-xs">
            <button
              onClick={() => handleOffsetChange((config.offset - BASE_OFFSET) - 0.1)}
              className="flex-1 px-2 py-1 bg-neutral-800 hover:bg-neutral-700 rounded text-neutral-300 transition"
            >
              -0.1s
            </button>
            <button
              onClick={() => handleOffsetChange((config.offset - BASE_OFFSET) + 0.1)}
              className="flex-1 px-2 py-1 bg-neutral-800 hover:bg-neutral-700 rounded text-neutral-300 transition"
            >
              +0.1s
            </button>
          </div>
        </div>

        {/* Pre-Roll Control */}
        <div className="space-y-2">
          <label className="text-xs text-neutral-500">
            提前顯示 (ms)
            <span className="ml-2 text-neutral-600">{config.preRoll}</span>
          </label>
          <input
            type="range"
            min="0"
            max="1000"
            step="50"
            value={config.preRoll}
            onChange={(e) => handlePreRollChange(parseInt(e.target.value))}
            className="w-full"
          />
          <div className="flex gap-1 text-xs">
            <button
              onClick={() => handlePreRollChange(Math.max(0, config.preRoll - 100))}
              className="flex-1 px-2 py-1 bg-neutral-800 hover:bg-neutral-700 rounded text-neutral-300 transition"
            >
              -100
            </button>
            <button
              onClick={() => handlePreRollChange(config.preRoll + 100)}
              className="flex-1 px-2 py-1 bg-neutral-800 hover:bg-neutral-700 rounded text-neutral-300 transition"
            >
              +100
            </button>
          </div>
        </div>

        {/* Post-Roll Control */}
        <div className="space-y-2">
          <label className="text-xs text-neutral-500">
            延遲隱藏 (ms)
            <span className="ml-2 text-neutral-600">{config.postRoll}</span>
          </label>
          <input
            type="range"
            min="0"
            max="1000"
            step="50"
            value={config.postRoll}
            onChange={(e) => handlePostRollChange(parseInt(e.target.value))}
            className="w-full"
          />
          <div className="flex gap-1 text-xs">
            <button
              onClick={() => handlePostRollChange(Math.max(0, config.postRoll - 100))}
              className="flex-1 px-2 py-1 bg-neutral-800 hover:bg-neutral-700 rounded text-neutral-300 transition"
            >
              -100
            </button>
            <button
              onClick={() => handlePostRollChange(config.postRoll + 100)}
              className="flex-1 px-2 py-1 bg-neutral-800 hover:bg-neutral-700 rounded text-neutral-300 transition"
            >
              +100
            </button>
          </div>
        </div>
      </div>

      {/* Smart Detection Suggestion */}
      {smartDetection?.detected && (
        <div className="p-4 bg-blue-950 border border-blue-800 rounded space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-blue-300 font-medium">智能檢測建議</p>
              <p className="text-xs text-blue-200 mt-1">{smartDetection.analysis}</p>
              <p className="text-xs text-blue-400 mt-2">
                置信度: {smartDetection.confidence}%
              </p>
            </div>
            {smartDetection.confidence > 70 && (
              <button
                onClick={handleApplySuggestion}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition whitespace-nowrap ml-4"
              >
                應用建議
              </button>
            )}
          </div>
        </div>
      )}

      {/* Advanced Settings */}
      {showAdvanced && (
        <div className="p-4 bg-neutral-800 rounded space-y-4 border border-neutral-700">
          <div className="space-y-3">
            <div>
              <label className="text-xs text-neutral-400">當前配置 (JSON)</label>
              <textarea
                value={JSON.stringify(config, null, 2)}
                readOnly
                className="w-full mt-2 p-2 bg-neutral-900 border border-neutral-700 rounded text-xs text-neutral-300 font-mono"
                rows={4}
              />
            </div>

            <div className="flex gap-2">
              <label className="flex items-center gap-2 text-xs text-neutral-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSuggestion}
                  onChange={(e) => setAutoSuggestion(e.target.checked)}
                  className="rounded"
                />
                自動應用智能建議
              </label>
            </div>

            <button
              onClick={handleReset}
              className="w-full px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 text-sm rounded transition"
            >
              重置為預設值
            </button>
          </div>
        </div>
      )}

      {/* Info Text */}
      <p className="text-xs text-neutral-500">
        偏移: 調整所有字幕時間 | 提前顯示: 字幕更早出現 | 延遲隱藏: 字幕停留更久
      </p>
    </div>
  );
}
