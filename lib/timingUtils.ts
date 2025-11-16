/**
 * Subtitle Timing Calibration Utilities
 * Handles time offset, pre-roll, post-roll, and smart detection
 */

export interface TimingConfig {
  offset: number; // seconds, can be negative or positive
  preRoll: number; // milliseconds, show subtitle early
  postRoll: number; // milliseconds, keep subtitle longer
}

// Base offset applied to all subtitles (internal calibration)
export const BASE_OFFSET = -1.5;

export const DEFAULT_TIMING: TimingConfig = {
  offset: BASE_OFFSET,
  preRoll: 0,
  postRoll: 0,
};

/**
 * Apply timing calibration to subtitle times
 * @param start - Original start time in seconds
 * @param end - Original end time in seconds
 * @param config - Timing configuration
 * @returns Adjusted [start, end] in seconds
 */
export function applyTimingCalibration(
  start: number,
  end: number,
  config: TimingConfig
): [number, number] {
  // Apply offset first (convert to seconds)
  const offsetSeconds = config.offset;
  const preRollSeconds = config.preRoll / 1000;
  const postRollSeconds = config.postRoll / 1000;

  const adjustedStart = start + offsetSeconds - preRollSeconds;
  const adjustedEnd = end + offsetSeconds + postRollSeconds;

  // Prevent negative times
  return [Math.max(0, adjustedStart), Math.max(0, adjustedEnd)];
}

/**
 * Smart detection: Analyze subtitle timing patterns
 * Returns adjustment recommendation if timing seems off
 */
export interface SmartDetectionResult {
  recommendation: TimingConfig;
  confidence: number; // 0-100
  analysis: string;
  detected: boolean;
}

export function detectTimingIssues(
  subtitles: Array<{ start: number; end: number; text: string }>,
  currentTime: number,
  expectedNextSubtitleTime?: number
): SmartDetectionResult {
  if (subtitles.length < 2) {
    return {
      recommendation: DEFAULT_TIMING,
      confidence: 0,
      analysis: "Not enough subtitles to analyze",
      detected: false,
    };
  }

  // Calculate average gap between subtitles
  const gaps: number[] = [];
  for (let i = 1; i < Math.min(subtitles.length, 20); i++) {
    const gap = subtitles[i].start - subtitles[i - 1].end;
    if (gap >= 0) gaps.push(gap);
  }

  if (gaps.length === 0) {
    return {
      recommendation: DEFAULT_TIMING,
      confidence: 0,
      analysis: "Cannot analyze overlapping subtitles",
      detected: false,
    };
  }

  const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const stdDev = Math.sqrt(
    gaps.reduce((sq, n) => sq + Math.pow(n - avgGap, 2), 0) / gaps.length
  );

  // Detect unusually large or small average gaps
  // Normal gaps should be 0.5-2 seconds
  if (avgGap > 3) {
    return {
      recommendation: { ...DEFAULT_TIMING, preRoll: 200 },
      confidence: 70,
      analysis: `Large gaps detected (${avgGap.toFixed(2)}s avg). Consider pre-roll to show subtitles earlier.`,
      detected: true,
    };
  }

  if (avgGap < 0.1 && stdDev > 0.5) {
    return {
      recommendation: { ...DEFAULT_TIMING, postRoll: 300 },
      confidence: 60,
      analysis: `Inconsistent spacing detected. Consider post-roll for better readability.`,
      detected: true,
    };
  }

  // Check for rapid subtitle changes (too fast)
  const durations = subtitles
    .slice(0, 20)
    .map((s) => s.end - s.start)
    .filter((d) => d > 0);

  if (durations.length > 0) {
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    if (avgDuration < 1.5) {
      return {
        recommendation: { ...DEFAULT_TIMING, postRoll: 500 },
        confidence: 65,
        analysis: `Short subtitle durations (${avgDuration.toFixed(2)}s avg). Consider post-roll for readability.`,
        detected: true,
      };
    }
  }

  return {
    recommendation: DEFAULT_TIMING,
    confidence: 0,
    analysis: "Subtitle timing appears normal",
    detected: false,
  };
}

/**
 * Check if subtitle should be displayed at current time
 * @param subtitle - Subtitle object
 * @param currentTime - Current playback time in seconds
 * @param config - Timing configuration
 * @returns true if subtitle should be shown
 */
export function isSubtitleVisible(
  subtitle: { start: number; end: number },
  currentTime: number,
  config: TimingConfig
): boolean {
  const [adjustedStart, adjustedEnd] = applyTimingCalibration(
    subtitle.start,
    subtitle.end,
    config
  );
  return currentTime >= adjustedStart && currentTime <= adjustedEnd;
}

/**
 * Find subtitle at current time with timing calibration
 */
export function findSubtitleAtTime(
  subtitles: Array<{ start: number; end: number; text: string }>,
  currentTime: number,
  config: TimingConfig
): string {
  const subtitle = subtitles.find((sub) =>
    isSubtitleVisible(sub, currentTime, config)
  );
  return subtitle?.text || "";
}

/**
 * Validate timing configuration
 */
export function validateTimingConfig(config: Partial<TimingConfig>): boolean {
  if (config.offset !== undefined && typeof config.offset !== "number") return false;
  if (config.preRoll !== undefined && (typeof config.preRoll !== "number" || config.preRoll < 0)) return false;
  if (config.postRoll !== undefined && (typeof config.postRoll !== "number" || config.postRoll < 0)) return false;
  return true;
}

/**
 * Convert timing config to localStorage string
 */
export function serializeTimingConfig(config: TimingConfig): string {
  return JSON.stringify(config);
}

/**
 * Parse timing config from localStorage
 */
export function deserializeTimingConfig(json: string): TimingConfig {
  try {
    const config = JSON.parse(json);
    if (validateTimingConfig(config)) {
      return { ...DEFAULT_TIMING, ...config };
    }
  } catch (e) {
    console.warn("Failed to parse timing config");
  }
  return DEFAULT_TIMING;
}
