# Timing Calibration - Quick Reference

## UI Controls Layout

```
┌─────────────────────────────────────────────────────────────┐
│ 字幕时间校准                                        [显示/隐藏]高级 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  时间偏移 (秒)          提前显示 (ms)      延迟隐藏 (ms)     │
│  [-]0.0[+]             [-]  0 [+]          [-]  0 [+]      │
│  ━━━━━━━━━━            ━━━━━━━━━━         ━━━━━━━━━━       │
│  -0.5s +0.5s           -100 +100           -100 +100       │
│                                                              │
│  [蓝框] 智能检测建议（如果有问题检测到）                      │
│  Description of issue & confidence %                        │
│  [应用建议] (if confidence >70%)                             │
│                                                              │
│  📋 偏移:调整所有字幕时间|提前显示:字幕更早出现|延迟隐藏:停留更久 │
└─────────────────────────────────────────────────────────────┘
```

## Three Core Parameters

| Parameter | Range | Unit | Effect | Use When |
|-----------|-------|------|--------|----------|
| **Offset** | -10 to +10 | seconds | Shifts ALL subtitles equally | Audio sync is consistently early/late |
| **Pre-Roll** | 0 to 1000 | ms | Shows subtitle earlier | Subtitles appear 1-2 frames too late |
| **Post-Roll** | 0 to 1000 | ms | Keeps subtitle visible longer | Too fast to read, need more time |

## Quick Adjustment Guide

### "Subtitles appear too late"
1. **Quick fix**: Pre-Roll 200-300ms
2. **Persistent issue**: Offset -0.5 to -2.0 seconds

### "Subtitles disappear too fast"
1. **Quick fix**: Post-Roll 300-500ms
2. **Extreme cases**: Post-Roll up to 1000ms

### "Consistently off throughout video"
1. Use **Offset** slider
2. Adjust by ±0.5s increments
3. Find sweet spot where most subtitles sync properly

### "Occasional desync"
1. Check Smart Detection recommendation
2. Try Pre-Roll 100-200ms first
3. If not enough, use Offset

## Smart Detection Triggers

### Scenario 1: Large Gaps (>3 seconds)
- **Auto-Recommends**: Pre-Roll 200ms
- **Reason**: Users may miss timing cue in long silence
- **Confidence**: 70%

### Scenario 2: Inconsistent Timing
- **Auto-Recommends**: Post-Roll 300ms
- **Reason**: Variable pacing needs readability help
- **Confidence**: 60%

### Scenario 3: Very Fast Speech (<1.5s per subtitle)
- **Auto-Recommends**: Post-Roll 500ms
- **Reason**: Need more time to read rapid dialogue
- **Confidence**: 65%

## Keyboard-Free Workflow

1. Load video → subtitles extract
2. Watch first few subtitles
3. If Smart Detection triggers → Review suggestion → Apply or dismiss
4. Manually adjust sliders if needed
5. Use ±0.5s buttons for fine-tuning
6. Changes save automatically

## Storage & Persistence

- **Auto-saved**: Yes (localStorage)
- **Survives page refresh**: Yes
- **Survives browser close**: Yes
- **Cleared with**: Browser cache clear or localStorage reset
- **Storage key**: `dubtitle_timing_config`

## Default Starting Values

```json
{
  "offset": 0,
  "preRoll": 0,
  "postRoll": 0
}
```

## Typical Adjustment Ranges

### Conservative (YouTube auto-generated)
- Offset: 0 to -0.5s
- Pre-Roll: 0-100ms
- Post-Roll: 200ms

### Moderate (Most content)
- Offset: -0.5 to +0.5s
- Pre-Roll: 100-300ms
- Post-Roll: 300-500ms

### Aggressive (Poorly synced)
- Offset: ±1.0 to ±2.0s
- Pre-Roll: 400-800ms
- Post-Roll: 600-1000ms

## Math Behind the Scenes

```
Adjusted Start = Original Start + Offset - (Pre-Roll / 1000)
Adjusted End   = Original End + Offset + (Post-Roll / 1000)

Example:
  Original: Start=10.0s, End=15.0s
  Config: Offset=-0.5s, Pre-Roll=200ms, Post-Roll=300ms

  New Start = 10.0 - 0.5 - 0.2 = 9.3s ← Appears 0.7s earlier
  New End   = 15.0 - 0.5 + 0.3 = 14.8s ← Disappears 0.2s earlier
```

## Advanced Mode (Hidden by Default)

Shows:
- Raw JSON config (read-only)
- Auto-suggestion toggle
- Reset button

**Why hidden?** Less overwhelming UI for basic use.
**When to show?**
- Debugging timing issues
- Saving/loading precise configs
- Developer testing

## Troubleshooting Checklist

- [ ] Did you wait for subtitles to fully load?
- [ ] Are you in the subtitle region when adjusting?
- [ ] Try a moderate adjustment first (±0.5s)
- [ ] Reset to defaults if uncertain
- [ ] Check console (F12) for errors
- [ ] Refresh page if changes aren't applying

## Files Modified/Created

| File | Status | Purpose |
|------|--------|---------|
| `lib/timingUtils.ts` | NEW | Core timing logic & smart detection |
| `components/TimingCalibration.tsx` | NEW | UI component for controls |
| `components/SubtitlePanel.tsx` | UPDATED | Use timing config |
| `app/page.tsx` | UPDATED | Integrate TimingCalibration + localStorage |

## Performance Impact

- **CPU**: Negligible (simple arithmetic)
- **Memory**: <1KB per config
- **Network**: None
- **Latency**: <1ms calculation time

## Browser Support

- Chrome/Edge: ✓ Full support
- Firefox: ✓ Full support
- Safari: ✓ Full support (iOS 14+)
- IE 11: ✗ Not supported (needs ES6)

---

**Still need help?** Check `TIMING_CALIBRATION.md` for detailed documentation.
