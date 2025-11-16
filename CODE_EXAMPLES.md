# Code Examples - Subtitle Timing Calibration

## 1. Core Timing Logic Usage

### Basic Timing Adjustment

```typescript
import {
  applyTimingCalibration,
  TimingConfig
} from '@/lib/timingUtils';

// Define a timing configuration
const config: TimingConfig = {
  offset: -0.5,      // Shift 0.5s earlier
  preRoll: 200,      // Show 200ms early
  postRoll: 300      // Keep visible 300ms longer
};

// Apply to a subtitle
const [adjustedStart, adjustedEnd] = applyTimingCalibration(
  10.0,  // original start
  15.0,  // original end
  config
);

console.log(`Original: 10.0-15.0`);
console.log(`Adjusted: ${adjustedStart}-${adjustedEnd}`);
// Output: Adjusted: 9.3-14.8
```

### Finding Subtitle at Current Time

```typescript
import { findSubtitleAtTime, TimingConfig } from '@/lib/timingUtils';

const subtitles = [
  { start: 0, end: 3, text: "Hello" },
  { start: 3, end: 6, text: "World" },
  { start: 6, end: 9, text: "!" }
];

const config: TimingConfig = {
  offset: 0,
  preRoll: 0,
  postRoll: 0
};

const text = findSubtitleAtTime(subtitles, 4.5, config);
console.log(text);  // Output: "World"

// With timing adjustment
const config2: TimingConfig = {
  offset: -1.0,  // 1 second earlier
  preRoll: 0,
  postRoll: 0
};

const text2 = findSubtitleAtTime(subtitles, 4.5, config2);
console.log(text2);  // Output: "Hello"
```

## 2. Smart Detection Examples

### Detect Large Gaps

```typescript
import { detectTimingIssues } from '@/lib/timingUtils';

const subtitles = [
  { start: 0, end: 2, text: "First" },
  { start: 2, end: 4, text: "Second" },
  { start: 10, end: 12, text: "Big gap!" },  // 6 second gap
  { start: 12, end: 14, text: "After gap" }
];

const result = detectTimingIssues(subtitles, 0);

if (result.detected) {
  console.log('Issue detected:', result.analysis);
  console.log('Recommendation:', result.recommendation);
  console.log('Confidence:', result.confidence + '%');
  // Output:
  // Issue detected: Large gaps detected (6.00s avg).
  // Recommendation: { offset: 0, preRoll: 200, postRoll: 0 }
  // Confidence: 70%
}
```

### Detect Fast Speech

```typescript
const fastSpeechSubtitles = [
  { start: 0, end: 0.8, text: "One" },
  { start: 0.8, end: 1.5, text: "Two" },
  { start: 1.5, end: 2.2, text: "Three" },
  { start: 2.2, end: 2.8, text: "Four" }
];

const result = detectTimingIssues(fastSpeechSubtitles, 0);

console.log(result.analysis);
// Output: "Short subtitle durations (0.88s avg).
//          Consider post-roll for readability."
console.log(result.recommendation);
// Output: { offset: 0, preRoll: 0, postRoll: 500 }
```

## 3. Component Integration

### Using TimingCalibration Component

```typescript
'use client';

import { useState } from 'react';
import TimingCalibration from '@/components/TimingCalibration';
import { TimingConfig, DEFAULT_TIMING } from '@/lib/timingUtils';

export function MySubtitleApp() {
  const [timingConfig, setTimingConfig] =
    useState<TimingConfig>(DEFAULT_TIMING);

  const subtitles = [
    { start: 0, end: 3, text: "First" },
    { start: 3, end: 6, text: "Second" }
  ];

  return (
    <div>
      <h2>Subtitle Timing Control</h2>

      <TimingCalibration
        subtitles={subtitles}
        currentTime={2.5}
        onTimingChange={setTimingConfig}
        initialConfig={timingConfig}
      />

      <p>Current config: {JSON.stringify(timingConfig)}</p>
    </div>
  );
}
```

### SubtitlePanel with Timing

```typescript
'use client';

import { useState, useEffect } from 'react';
import { findSubtitleAtTime, TimingConfig, DEFAULT_TIMING } from '@/lib/timingUtils';

interface SubtitlePanelProps {
  currentTime: number;
  subtitles: Array<{ start: number; end: number; text: string }>;
  timingConfig?: TimingConfig;
}

export function SubtitleDisplay({
  currentTime,
  subtitles,
  timingConfig = DEFAULT_TIMING
}: SubtitlePanelProps) {
  const [displayText, setDisplayText] = useState('');

  useEffect(() => {
    const text = findSubtitleAtTime(subtitles, currentTime, timingConfig);
    setDisplayText(text);
  }, [currentTime, subtitles, timingConfig]);

  return (
    <div style={{ fontSize: '32px', textAlign: 'center' }}>
      {displayText || 'No subtitle'}
    </div>
  );
}
```

## 4. localStorage Persistence

### Save Configuration

```typescript
import {
  TimingConfig,
  serializeTimingConfig
} from '@/lib/timingUtils';

function saveTimingConfig(config: TimingConfig) {
  const serialized = serializeTimingConfig(config);
  localStorage.setItem('dubtitle_timing_config', serialized);
}

// Usage
const config: TimingConfig = {
  offset: 1.5,
  preRoll: 300,
  postRoll: 200
};

saveTimingConfig(config);
// localStorage now contains:
// {"offset":1.5,"preRoll":300,"postRoll":200}
```

### Load Configuration

```typescript
import {
  TimingConfig,
  deserializeTimingConfig,
  DEFAULT_TIMING
} from '@/lib/timingUtils';

function loadTimingConfig(): TimingConfig {
  const stored = localStorage.getItem('dubtitle_timing_config');

  if (!stored) {
    return DEFAULT_TIMING;
  }

  return deserializeTimingConfig(stored);
}

// Usage
const config = loadTimingConfig();
console.log(config);
// Output: { offset: 1.5, preRoll: 300, postRoll: 200 }
```

### Auto-Load in useEffect

```typescript
import { useState, useEffect } from 'react';
import { TimingConfig, DEFAULT_TIMING, deserializeTimingConfig } from '@/lib/timingUtils';

export function App() {
  const [timingConfig, setTimingConfig] =
    useState<TimingConfig>(DEFAULT_TIMING);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('dubtitle_timing_config');
    if (stored) {
      const config = deserializeTimingConfig(stored);
      setTimingConfig(config);
    }
  }, []);

  // Save to localStorage when config changes
  useEffect(() => {
    localStorage.setItem(
      'dubtitle_timing_config',
      JSON.stringify(timingConfig)
    );
  }, [timingConfig]);

  return (
    // Your app here
  );
}
```

## 5. Real-World Scenarios

### Scenario 1: YouTube Auto-Generated Captions (Usually Late)

```typescript
// Detect issue
const result = detectTimingIssues(subtitles, currentTime);

// Recommended fix
const config: TimingConfig = {
  offset: -0.5,      // Move all captions 0.5s earlier
  preRoll: 0,        // No additional early display
  postRoll: 0        // No extra delay
};

// Apply
const text = findSubtitleAtTime(subtitles, currentTime, config);
```

### Scenario 2: Rapid Dialogue (Hard to Read)

```typescript
const result = detectTimingIssues(subtitles, currentTime);

// If smart detection suggests:
if (result.recommendation.postRoll > 0) {
  // Apply post-roll to give viewers more time
  const config = result.recommendation;

  // User sees suggestion in UI
  // Confidence: 65% -> User can apply with confidence
}
```

### Scenario 3: Fine-Tuning Synchronization

```typescript
// User manually adjusts with slider
function handleOffsetChange(newOffset: number) {
  const config: TimingConfig = {
    offset: newOffset,      // e.g., -0.25
    preRoll: 100,          // Fine tuning with pre-roll
    postRoll: 200          // And post-roll
  };

  // Apply and save
  setTimingConfig(config);
  localStorage.setItem('dubtitle_timing_config', JSON.stringify(config));
}
```

### Scenario 4: Different Videos, Same Config

```typescript
// User sets config for one video
const config1: TimingConfig = {
  offset: -1.0,
  preRoll: 200,
  postRoll: 300
};

localStorage.setItem('dubtitle_timing_config', JSON.stringify(config1));

// User loads different video
// Config is automatically applied to new video!
const text = findSubtitleAtTime(newSubtitles, currentTime, config1);
```

## 6. Validation Examples

### Valid Configurations

```typescript
import { validateTimingConfig } from '@/lib/timingUtils';

// All valid
const config1 = { offset: 0, preRoll: 0, postRoll: 0 };
const config2 = { offset: -5.5, preRoll: 500, postRoll: 1000 };
const config3 = { offset: 10, preRoll: 0, postRoll: 0 };

console.log(validateTimingConfig(config1));  // true
console.log(validateTimingConfig(config2));  // true
console.log(validateTimingConfig(config3));  // true
```

### Invalid Configurations

```typescript
// Invalid - negative pre/post roll
console.log(validateTimingConfig({
  offset: 0,
  preRoll: -100,  // ❌ Cannot be negative
  postRoll: 0
}));  // false

// Invalid - non-number offset
console.log(validateTimingConfig({
  offset: "two",  // ❌ Must be number
  preRoll: 0,
  postRoll: 0
}));  // false

// Partial config - still valid
console.log(validateTimingConfig({
  offset: 1.5  // ✓ Can have partial config
}));  // true
```

## 7. Type-Safe Usage

### Proper TypeScript Typing

```typescript
import { TimingConfig, SmartDetectionResult } from '@/lib/timingUtils';

// Type-safe component props
interface SubtitleControlsProps {
  subtitles: Array<{ start: number; end: number; text: string }>;
  currentTime: number;
  config: TimingConfig;  // ✓ Type-safe
  onConfigChange: (config: TimingConfig) => void;
}

// Type-safe callback
function handleAdjustment(newConfig: TimingConfig): void {
  if (newConfig.offset > 10 || newConfig.offset < -10) {
    console.warn('Offset out of range');
    return;
  }

  localStorage.setItem(
    'timing_config',
    JSON.stringify(newConfig)
  );
}

// Type-safe detection result
const detection: SmartDetectionResult = {
  recommendation: { offset: -0.5, preRoll: 200, postRoll: 0 },
  confidence: 75,
  analysis: "Large gaps detected",
  detected: true
};

// Type guards
if (detection.detected && detection.confidence > 70) {
  console.log('High confidence recommendation');
}
```

## 8. Testing Examples

### Unit Test Examples

```typescript
import { applyTimingCalibration, isSubtitleVisible } from '@/lib/timingUtils';

describe('Timing Calibration', () => {
  test('applyTimingCalibration calculates correctly', () => {
    const [start, end] = applyTimingCalibration(
      10, 15,
      { offset: -0.5, preRoll: 200, postRoll: 300 }
    );

    expect(start).toBe(9.3);  // 10 - 0.5 - 0.2
    expect(end).toBe(14.8);   // 15 - 0.5 + 0.3
  });

  test('isSubtitleVisible respects timing config', () => {
    const subtitle = { start: 10, end: 15, text: 'Test' };
    const config = { offset: 0, preRoll: 0, postRoll: 0 };

    expect(isSubtitleVisible(subtitle, 9.9, config)).toBe(false);
    expect(isSubtitleVisible(subtitle, 10, config)).toBe(true);
    expect(isSubtitleVisible(subtitle, 15, config)).toBe(true);
    expect(isSubtitleVisible(subtitle, 15.1, config)).toBe(false);
  });
});
```

---

**Last Updated**: 2025-11-16
**Status**: Production Ready
