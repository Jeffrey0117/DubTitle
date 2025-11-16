# Subtitle Timing Calibration System

## Overview

A configurable subtitle timing calibration system that allows users to adjust subtitle synchronization in real-time with smart detection capabilities.

## Components

### 1. **Timing Utilities** (`lib/timingUtils.ts`)

Core logic for timing adjustments and smart detection.

#### Key Functions:

- **`applyTimingCalibration(start, end, config)`**
  - Applies offset, pre-roll, and post-roll adjustments
  - Returns adjusted [start, end] times in seconds
  - Prevents negative time values

- **`detectTimingIssues(subtitles, currentTime)`**
  - Analyzes subtitle timing patterns
  - Detects large gaps (>3s), rapid changes (<1.5s)
  - Returns confidence-scored recommendations
  - Returns `SmartDetectionResult` with analysis and suggested adjustments

- **`isSubtitleVisible(subtitle, currentTime, config)`**
  - Checks if subtitle should display at given time
  - Incorporates all timing adjustments

- **`findSubtitleAtTime(subtitles, currentTime, config)`**
  - Finds and returns subtitle text at current time
  - Primary function used by SubtitlePanel

#### Data Types:

```typescript
interface TimingConfig {
  offset: number;      // seconds, ±10 range
  preRoll: number;     // milliseconds, 0-1000
  postRoll: number;    // milliseconds, 0-1000
}

interface SmartDetectionResult {
  recommendation: TimingConfig;
  confidence: number;      // 0-100
  analysis: string;        // Human-readable explanation
  detected: boolean;       // Whether issue was detected
}
```

### 2. **TimingCalibration Component** (`components/TimingCalibration.tsx`)

User interface for timing adjustments.

#### Features:

- **Offset Slider**: ±10 second range
  - Quick buttons: ±0.5s increments
  - Real-time display of current value

- **Pre-Roll Control**: 0-1000ms
  - Makes subtitles appear earlier
  - Use case: Audio sync issues where subtitles lag

- **Post-Roll Control**: 0-1000ms
  - Keeps subtitles visible longer
  - Use case: Faster speech or readability needs

- **Smart Detection Panel**
  - Shows analysis and recommendations
  - Auto-apply option (when confidence >70%)
  - "Apply Suggestion" button for manual acceptance

- **Advanced Settings**
  - JSON config display (read-only)
  - Auto-suggestion toggle
  - Reset to defaults button

#### Integration:

```typescript
<TimingCalibration
  subtitles={subtitles}
  currentTime={currentTime}
  onTimingChange={handleTimingChange}
  initialConfig={timingConfig}
/>
```

### 3. **Updated SubtitlePanel** (`components/SubtitlePanel.tsx`)

Enhanced to use timing calibration.

**Changes:**
- Added `timingConfig` prop (optional, defaults to `DEFAULT_TIMING`)
- Uses `findSubtitleAtTime()` instead of simple time comparison
- Fully respects offset, pre-roll, and post-roll settings

### 4. **Main Page Integration** (`app/page.tsx`)

**Features:**
- Timing config stored in localStorage (key: `dubtitle_timing_config`)
- Config persists across sessions
- Loaded on component mount
- Updated whenever user adjusts calibration

## Default Recommended Values

```typescript
const DEFAULT_TIMING: TimingConfig = {
  offset: 0,      // No offset by default
  preRoll: 0,     // No early display
  postRoll: 0,    // No delay
};
```

### Smart Detection Recommendations:

| Issue Detected | Recommendation | Confidence |
|---|---|---|
| Large gaps (>3s between subs) | `preRoll: 200ms` | 70% |
| Inconsistent spacing (high variance) | `postRoll: 300ms` | 60% |
| Very short durations (<1.5s avg) | `postRoll: 500ms` | 65% |
| Normal timing | No adjustment | 0% |

## Usage Flow

### User Flow:

1. Load YouTube video and extract subtitles
2. Timing calibration panel appears automatically
3. If smart detection triggers:
   - Blue suggestion box shows analysis
   - User can click "Apply Suggestion" or manually adjust
4. User adjusts via sliders or increment buttons
5. Changes apply in real-time to subtitle display
6. Config auto-saves to localStorage

### Manual Adjustment Examples:

**Scenario: Subtitles appear too late**
- Use `offset: -1.0` (move all subtitles 1 second earlier)
- Or use `preRoll: 300` (show each subtitle 300ms early)

**Scenario: Subtitles disappear too fast**
- Use `postRoll: 500` (keep each subtitle 500ms longer)

**Scenario: Fine-tuning synchronization**
- Use offset ±0.5 second increments
- Combined with pre/post-roll for regional adjustments

## Technical Details

### Timing Calculation:

```
adjustedStart = start + offset - (preRoll / 1000)
adjustedEnd = end + offset + (postRoll / 1000)
```

### Smart Detection Algorithm:

1. Sample first 20 subtitles (prevent analysis of entire long subtitle list)
2. Calculate gaps between consecutive subtitles
3. Compute mean and standard deviation
4. Evaluate against thresholds:
   - **Large gaps**: avgGap > 3 seconds
   - **Short durations**: avgDuration < 1.5 seconds
   - **High variance**: stdDev > 0.5 (irregular spacing)

5. Return confidence-scored recommendation

### Storage:

- **Key**: `dubtitle_timing_config`
- **Format**: JSON string
- **Validation**: Uses `validateTimingConfig()` before parsing
- **Fallback**: Returns `DEFAULT_TIMING` if invalid

## API Reference

### `lib/timingUtils.ts`

#### Exported Functions:

```typescript
// Main calculation
applyTimingCalibration(start: number, end: number, config: TimingConfig): [number, number]

// Detection
detectTimingIssues(subtitles: Array<{...}>, currentTime: number): SmartDetectionResult

// Display logic
isSubtitleVisible(subtitle: {...}, currentTime: number, config: TimingConfig): boolean
findSubtitleAtTime(subtitles: Array<{...}>, currentTime: number, config: TimingConfig): string

// Validation & Storage
validateTimingConfig(config: Partial<TimingConfig>): boolean
serializeTimingConfig(config: TimingConfig): string
deserializeTimingConfig(json: string): TimingConfig
```

## Future Enhancements

1. **Preset Profiles**: Common offsets for platform-specific delays
2. **Per-Video Configs**: Save different offsets for different videos
3. **Visual Timeline**: Show adjusted subtitle timing on a timeline
4. **A/B Comparison**: Toggle between original and adjusted timing
5. **Batch Operations**: Apply same offset to multiple subtitle ranges
6. **Export**: Save calibrated subtitles as VTT/SRT with adjustments baked in

## Performance Considerations

- Smart detection runs on subtitle load (not real-time)
- Time calculations are O(n) but only for finding current subtitle (linear search)
- localStorage operations are synchronous but negligible overhead
- No memory leaks: all effects properly cleaned up

## Browser Compatibility

- Requires: ES6+ JavaScript support
- localStorage: Supported in all modern browsers
- Tested: Chrome, Firefox, Safari, Edge (v18+)

## Troubleshooting

| Issue | Solution |
|---|---|
| Settings not persisting | Check browser localStorage enabled |
| Smart detection not triggering | Need ≥2 subtitles; check console for errors |
| Subtitle still appears late/early | Try larger offset ±1-2 seconds |
| All subtitles disappear | Check post-roll isn't excessive (>duration) |
| Recommendation confidence too low | May need manual adjustment instead |

## Examples

### Programmatic Usage:

```typescript
import {
  applyTimingCalibration,
  findSubtitleAtTime,
  TimingConfig
} from '@/lib/timingUtils';

const config: TimingConfig = {
  offset: 0.5,
  preRoll: 200,
  postRoll: 300
};

// Adjust specific subtitle times
const [newStart, newEnd] = applyTimingCalibration(10, 15, config);

// Find subtitle at current time
const text = findSubtitleAtTime(subtitles, 12.5, config);
```

### Component Usage:

```typescript
import { useState } from 'react';
import TimingCalibration from '@/components/TimingCalibration';
import { TimingConfig } from '@/lib/timingUtils';

const [config, setConfig] = useState<TimingConfig>({ /* ... */ });

return (
  <TimingCalibration
    subtitles={subtitles}
    currentTime={currentTime}
    onTimingChange={setConfig}
    initialConfig={config}
  />
);
```
