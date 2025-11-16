'use client';

interface TextStyleControlProps {
  textBold: boolean;
  textShadowStrength: number;
  highlighterColor: string;
  highlighterPadding: number;
  onTextBoldChange: (value: boolean) => void;
  onTextShadowStrengthChange: (value: number) => void;
  onHighlighterColorChange: (value: string) => void;
  onHighlighterPaddingChange: (value: number) => void;
}

export default function TextStyleControl({
  textBold,
  textShadowStrength,
  highlighterColor,
  highlighterPadding,
  onTextBoldChange,
  onTextShadowStrengthChange,
  onHighlighterColorChange,
  onHighlighterPaddingChange,
}: TextStyleControlProps) {
  return (
    <div className="p-6 bg-neutral-900 space-y-6">
      <h3 className="text-sm font-medium text-neutral-400 mb-4">文字效果</h3>

      {/* 粗體 - 簡單複選框 */}
      <div className="flex items-center gap-3">
        <label className="text-xs text-neutral-400 cursor-pointer select-none min-w-12">
          粗體
        </label>
        <input
          type="checkbox"
          checked={textBold}
          onChange={(e) => onTextBoldChange(e.target.checked)}
          className="w-4 h-4 rounded cursor-pointer accent-neutral-500"
        />
      </div>

      {/* 陰影強度 - 滑塊 0-10 */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-xs text-neutral-400">陰影強度</label>
          <span className="text-xs text-neutral-500">{textShadowStrength}</span>
        </div>
        <input
          type="range"
          min="0"
          max="10"
          step="1"
          value={textShadowStrength}
          onChange={(e) => onTextShadowStrengthChange(parseInt(e.target.value))}
          className="w-full h-1 bg-neutral-700 rounded cursor-pointer accent-neutral-500"
        />
      </div>

      {/* 螢光筆顏色 - 顏色選擇器 */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-xs text-neutral-400">螢光筆顏色</label>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={highlighterColor === 'transparent' ? '#ffff00' : highlighterColor}
            onChange={(e) => onHighlighterColorChange(e.target.value)}
            className="w-12 h-8 rounded cursor-pointer"
          />
          <label className="text-xs text-neutral-400 cursor-pointer flex items-center gap-2">
            <input
              type="checkbox"
              checked={highlighterColor === 'transparent'}
              onChange={(e) => onHighlighterColorChange(e.target.checked ? 'transparent' : '#ffff00')}
              className="w-4 h-4 rounded cursor-pointer accent-neutral-500"
            />
            無
          </label>
        </div>
      </div>

      {/* 螢光筆範圍 - 滑塊 0-20px */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-xs text-neutral-400">螢光筆範圍</label>
          <span className="text-xs text-neutral-500">{highlighterPadding}px</span>
        </div>
        <input
          type="range"
          min="0"
          max="20"
          step="1"
          value={highlighterPadding}
          onChange={(e) => onHighlighterPaddingChange(parseInt(e.target.value))}
          className="w-full h-1 bg-neutral-700 rounded cursor-pointer accent-neutral-500"
        />
      </div>
    </div>
  );
}
