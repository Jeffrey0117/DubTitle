'use client';

interface StyleControlProps {
  bgColor: string;
  textColor: string;
  fontSize: number;
  onBgColorChange: (color: string) => void;
  onTextColorChange: (color: string) => void;
  onFontSizeChange: (size: number) => void;
}

export default function StyleControl({
  bgColor,
  textColor,
  fontSize,
  onBgColorChange,
  onTextColorChange,
  onFontSizeChange,
}: StyleControlProps) {
  return (
    <div className="p-4 bg-neutral-900 space-y-3">
      <h3 className="text-xs font-medium text-neutral-400 mb-2">字幕樣式</h3>

      <div className="grid grid-cols-3 gap-3">
        {/* 背景顏色 */}
        <div className="space-y-1">
          <label className="text-xs text-neutral-500">背景色</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={bgColor}
              onChange={(e) => onBgColorChange(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer bg-transparent border border-neutral-700"
            />
            <input
              type="text"
              value={bgColor}
              onChange={(e) => onBgColorChange(e.target.value)}
              className="flex-1 px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-xs text-neutral-300 focus:outline-none focus:border-neutral-600"
            />
          </div>
        </div>

        {/* 字幕顏色 */}
        <div className="space-y-1">
          <label className="text-xs text-neutral-500">字幕色</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={textColor}
              onChange={(e) => onTextColorChange(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer bg-transparent border border-neutral-700"
            />
            <input
              type="text"
              value={textColor}
              onChange={(e) => onTextColorChange(e.target.value)}
              className="flex-1 px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-xs text-neutral-300 focus:outline-none focus:border-neutral-600"
            />
          </div>
        </div>

        {/* 字體大小 */}
        <div className="space-y-1">
          <label className="text-xs text-neutral-500">字體大小</label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="60"
              max="200"
              step="5"
              value={fontSize}
              onChange={(e) => onFontSizeChange(Number(e.target.value))}
              className="flex-1"
            />
            <span className="text-xs text-neutral-400 w-12 text-right">{fontSize}px</span>
          </div>
        </div>
      </div>
    </div>
  );
}
