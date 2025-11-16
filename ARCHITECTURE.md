# Subtitle Timing Calibration - System Architecture

## Component Hierarchy

```
Home (page.tsx)
├── timingConfig: TimingConfig [state]
├── handleTimingChange(): void [handler]
│
├── YouTubePlayer
│   └── currentTime (out)
│
├── SubtitlePanel
│   ├── currentTime (in)
│   ├── subtitles (in)
│   ├── timingConfig (in) ← NEW
│   └── Uses: findSubtitleAtTime(subtitles, currentTime, timingConfig)
│
├── TimingCalibration ← NEW COMPONENT
│   ├── subtitles (in)
│   ├── currentTime (in)
│   ├── onTimingChange (callback out)
│   ├── Uses: detectTimingIssues() for smart recommendations
│   └── State: config, smartDetection, showAdvanced, autoSuggestion
│
└── StyleControl
    └── (unchanged)
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      YouTube Video                          │
│                    (currentTime, subtitles)                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
         ┌─────────────┴─────────────┐
         │                           │
         ▼                           ▼
   ┌──────────────┐           ┌──────────────────┐
   │ YouTubePlayer│           │ Subtitle Extractor
   │ (unchanged)  │           │    API Route
   └──────┬───────┘           └──────────────────┘
          │ currentTime
          │ (updated ~60fps)
          │
          ▼
    ┌──────────────────────────────────────┐
    │          Home Component              │
    │  ┌──────────────────────────────┐   │
    │  │ timingConfig: TimingConfig   │   │
    │  │   - offset: number           │   │
    │  │   - preRoll: number          │   │
    │  │   - postRoll: number         │   │
    │  └──────────────────────────────┘   │
    │  ┌──────────────────────────────┐   │
    │  │ localStorage sync (auto)     │   │
    │  │ Key: dubtitle_timing_config  │   │
    │  └──────────────────────────────┘   │
    └─────────────┬────────────────────────┘
                  │
       ┌──────────┴──────────┬──────────────┐
       │                     │              │
       ▼                     ▼              ▼
   ┌─────────────────┐ ┌──────────────┐ ┌─────────────────┐
   │ SubtitlePanel   │ │ Timing       │ │ StyleControl
   │                 │ │ Calibration  │ │ (unchanged)
   │ findSubtitleAt  │ │              │ │
   │ Time()          │ │ - Offset     │ │
   │   ↓             │ │ - Pre-Roll   │ │
   │ Display with    │ │ - Post-Roll  │ │
   │ timing applied  │ │              │ │
   │                 │ │ Smart Detect │ │
   │                 │ │   Suggestions│ │
   │                 │ │              │ │
   │                 │ │ Advanced UI  │ │
   └─────────────────┘ └──────────────┘ └─────────────────┘
         │                   ▲
         │                   │
         │            onTimingChange()
         │            (handleTimingChange)
         │                   │
         └───────────────────┘
```

## Timing Logic Flow

```
┌─────────────────────────────────────────────────────────────┐
│             Subtitle Timing Calculation                     │
└─────────────────────────────────────────────────────────────┘

1. USER ADJUSTMENT
   ┌──────────────────────────────┐
   │ TimingCalibration slider move│
   │  onOffsetChange(value)       │
   │  onPreRollChange(value)      │
   │  onPostRollChange(value)     │
   └──────────────┬───────────────┘
                  │
2. STATE UPDATE
   ┌──────────────────────────────┐
   │ config = { offset, preRoll,  │
   │           postRoll }         │
   │ onTimingChange(config)       │
   └──────────────┬───────────────┘
                  │
3. PERSISTENCE
   ┌──────────────────────────────┐
   │ localStorage.setItem(        │
   │   'dubtitle_timing_config',  │
   │   JSON.stringify(config)     │
   │ )                            │
   └──────────────┬───────────────┘
                  │
4. SUBTITLE DISPLAY
   ┌──────────────────────────────┐
   │ findSubtitleAtTime(          │
   │   subtitles,                 │
   │   currentTime,               │
   │   config                     │
   │ )                            │
   └──────────────┬───────────────┘
                  │
5. TIMING ADJUSTMENT
   ┌──────────────────────────────┐
   │ applyTimingCalibration(      │
   │   start, end, config         │
   │ )                            │
   │ adjustedStart =              │
   │   start +offset -preRoll/1000│
   │ adjustedEnd =                │
   │   end + offset + postRoll/1000
   └──────────────┬───────────────┘
                  │
6. VISIBILITY CHECK
   ┌──────────────────────────────┐
   │ isSubtitleVisible(           │
   │   subtitle,                  │
   │   currentTime,               │
   │   config                     │
   │ )                            │
   │ if (currentTime >=           │
   │     adjustedStart &&         │
   │     currentTime <=           │
   │     adjustedEnd)             │
   │   return true                │
   └──────────────┬───────────────┘
                  │
7. DISPLAY
   ┌──────────────────────────────┐
   │ Subtitle shown to user       │
   │ with timing adjustment       │
   │ applied                      │
   └──────────────────────────────┘
```

## Smart Detection Algorithm Flow

```
┌──────────────────────────────────────────┐
│     Subtitles Loaded (first time)        │
└──────────────────────────────┬───────────┘
                               │
                               ▼
                 ┌─────────────────────────┐
                 │ detectTimingIssues()    │
                 │ (triggered in useEffect)│
                 └────────────┬────────────┘
                              │
                              ▼
              ┌───────────────────────────┐
              │ Sample first 20 subtitles │
              │ Calculate gaps & durations│
              └────────────┬──────────────┘
                           │
                ┌──────────┴──────────┐
                │                     │
                ▼                     ▼
        ┌──────────────┐      ┌──────────────┐
        │ Gap Analysis │      │Duration Test │
        │              │      │              │
        │ avg > 3s?    │      │ avg < 1.5s?  │
        │ ✓ YES        │      │ ✓ YES        │
        │ → Pre-Roll   │      │ → Post-Roll  │
        │   200ms      │      │   500ms      │
        │   confidence │      │ confidence   │
        │   70%        │      │ 65%          │
        └──────────┬───┘      └────────┬─────┘
                   │                   │
                   └─────────┬─────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │ Return Result:       │
                  │ - recommendation     │
                  │ - confidence (0-100) │
                  │ - analysis text      │
                  │ - detected: boolean  │
                  └──────────┬───────────┘
                             │
                   ┌─────────┴────────┐
                   │                  │
                   ▼                  ▼
              ┌────────┐         ┌──────────┐
              │detected│         │confidence│
              │  true? │         │  > 70%?  │
              └────┬───┘         └─────┬────┘
                   │                   │
           ┌───────┴────┐          ┌───┴─────────┐
           ▼            ▼          ▼             ▼
     ┌───────────┐  ┌────────┐ ┌────────────┐ ┌────────┐
     │Show Suggestion
     │ (blue box) │  │NoUI    │ │Auto-suggest│ │Manual  │
     │            │  │shown   │ │ if enabled │ │adjust  │
     └───────────┘  └────────┘ └────────────┘ └────────┘
```

## Module Dependencies

```
app/page.tsx
├── react (hooks)
├── components/
│   ├── YouTubePlayer
│   ├── SubtitlePanel
│   │   └── lib/timingUtils
│   │       ├── findSubtitleAtTime()
│   │       └── isSubtitleVisible()
│   ├── TimingCalibration ← NEW
│   │   └── lib/timingUtils
│   │       └── detectTimingIssues()
│   └── StyleControl
│
└── lib/timingUtils.ts ← NEW
    ├── TimingConfig (interface)
    ├── DEFAULT_TIMING (constant)
    ├── applyTimingCalibration()
    ├── detectTimingIssues()
    ├── isSubtitleVisible()
    ├── findSubtitleAtTime()
    ├── validateTimingConfig()
    ├── serializeTimingConfig()
    └── deserializeTimingConfig()

External Dependencies: None added
(Uses built-in: React, TypeScript, localStorage)
```

## State Management

```
┌─────────────────────────────────────────────┐
│            Home Component State             │
├─────────────────────────────────────────────┤
│                                             │
│ videoId: string                             │
│ currentTime: number                         │
│ bgColor: string                             │
│ textColor: string                           │
│ fontSize: number                            │
│ subtitles: Subtitle[]                       │
│ loading: boolean                            │
│ error: string                               │
│ timingConfig: TimingConfig ← NEW            │
│   ├── offset: number                        │
│   ├── preRoll: number                       │
│   └── postRoll: number                      │
│                                             │
└─────────────────────────────────────────────┘
         │         │           │
         ▼         ▼           ▼
    SubtitlePanel│ TimingCalibration│StyleControl
                 │                 │
            Reads:Reads + writes   │
            - timingConfig         │
            - currentTime          │
            - subtitles            │
```

## File Import/Export Structure

```
lib/timingUtils.ts
├── export interface TimingConfig
├── export const DEFAULT_TIMING
├── export function applyTimingCalibration()
├── export interface SmartDetectionResult
├── export function detectTimingIssues()
├── export function isSubtitleVisible()
├── export function findSubtitleAtTime()
├── export function validateTimingConfig()
├── export function serializeTimingConfig()
└── export function deserializeTimingConfig()

components/TimingCalibration.tsx
├── import { TimingConfig, DEFAULT_TIMING, ... } from lib
└── export default function TimingCalibration()

components/SubtitlePanel.tsx
├── import { TimingConfig, DEFAULT_TIMING, findSubtitleAtTime } from lib
└── export default function SubtitlePanel()

app/page.tsx
├── import TimingCalibration from components
├── import SubtitlePanel from components
├── import { TimingConfig, DEFAULT_TIMING, ... } from lib
└── export default function Home()
```

## Timing Adjustment Examples

```
SCENARIO 1: Global Offset
Original:  |----[Subtitle 10s-15s]-----|
           Time 0 ........... 10s ....... 15s

Config: offset = -1.0

Adjusted:  |--[Subtitle 9s-14s]---------|
           Time 0 ... 9s ........ 14s

SCENARIO 2: Pre-Roll Only
Original:  |----[Subtitle 10s-15s]-----|
Config: preRoll = 300ms (0.3s)

Adjusted:  |--[Subtitle 9.7s-15s]-------|
           Shows 0.3s EARLIER, ends same

SCENARIO 3: Post-Roll Only
Original:  |----[Subtitle 10s-15s]-----|
Config: postRoll = 500ms (0.5s)

Adjusted:  |----[Subtitle 10s-15.5s]----|
           Starts same, visible 0.5s LONGER

SCENARIO 4: Combined
Original:  |----[Subtitle 10s-15s]-----|
Config: offset = -0.5, preRoll = 200, postRoll = 300
         (all in milliseconds for pre/post)

Adjusted:  |--[Subtitle 9.3s-15.3s]-----|
           Start = 10 - 0.5 - 0.2 = 9.3s
           End = 15 - 0.5 + 0.3 = 14.8s
```

## Performance Considerations

```
┌────────────────────────────────────┐
│    Timing Calibration Performance  │
├────────────────────────────────────┤
│                                    │
│ Per-Frame Operations:              │
│ ├─ findSubtitleAtTime: O(n)       │
│ │  (linear search through subtitles)
│ ├─ isSubtitleVisible: O(1)        │
│ │  (simple math)                  │
│ └─ applyTimingCalibration: O(1)   │
│    (simple math)                  │
│                                    │
│ On Load Operations:                │
│ ├─ detectTimingIssues: O(20)      │
│ │  (analyzes first 20 subtitles)   │
│ ├─ localStorage.getItem: O(1)     │
│ └─ JSON.parse: O(config size)     │
│    (~50 bytes)                     │
│                                    │
│ On Change Operations:              │
│ ├─ setState: negligible           │
│ └─ localStorage.setItem: O(1)     │
│    (~50 bytes)                     │
│                                    │
│ No Memory Leaks:                   │
│ ├─ All effects properly cleaned    │
│ ├─ No circular references          │
│ └─ Config is immutable (replaced)  │
│                                    │
└────────────────────────────────────┘
```

## Error Handling

```
Try: Load subtitles
  ├─ Error: < 2 subtitles
  │  → Smart detection disabled
  ├─ Error: Invalid localStorage
  │  → Use DEFAULT_TIMING
  └─ Error: Bad config values
     → validateTimingConfig() → false
        → Use DEFAULT_TIMING

Try: Apply timing to subtitle
  ├─ Error: Negative time
  │  → Math.max(0, time)
  └─ Error: Invalid config
     → Skip adjustment, use original

Try: Save to localStorage
  ├─ Error: QuotaExceededError
  │  → Config lost (but in-memory copy saved)
  └─ Error: DOMException
     → Graceful degradation
```

---

**Diagram Format**: ASCII art
**Last Updated**: 2025-11-16
**Status**: Complete and integrated
