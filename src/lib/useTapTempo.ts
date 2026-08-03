import { useState, useEffect, useRef } from 'react';

/** Taps further apart than this start a fresh measurement. */
const TAP_TIMEOUT_MS = 2000;
/** Rolling window — averaging more than this makes the reading sluggish. */
const MAX_TAPS = 8;

export const MIN_BPM = 40;
export const MAX_BPM = 240;

interface UseTapTempoOptions {
  /** Called with each newly detected tempo, clamped to the plausible range. */
  onBpmDetected?: (bpm: number) => void;
}

/**
 * Tap-to-tempo measurement shared by the metronome pad and the sequencer button.
 * Averages the intervals between recent taps.
 */
export function useTapTempo({ onBpmDetected }: UseTapTempoOptions = {}) {
  const [bpm, setBpm] = useState<number | null>(null);
  const [taps, setTaps] = useState<number[]>([]);

  // Held in a ref so the effect doesn't re-run when a parent re-renders
  const onBpmDetectedRef = useRef(onBpmDetected);
  useEffect(() => { onBpmDetectedRef.current = onBpmDetected; }, [onBpmDetected]);

  useEffect(() => {
    if (taps.length < 2) return;

    const intervals = [];
    for (let i = 1; i < taps.length; i++) intervals.push(taps[i] - taps[i - 1]);
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const detected = Math.round(60000 / avgInterval);

    setBpm(detected);
    // A stray double-tap shouldn't fling the tempo to 900 BPM
    if (detected >= MIN_BPM && detected <= MAX_BPM) onBpmDetectedRef.current?.(detected);
  }, [taps]);

  const tap = () => {
    const now = Date.now();
    setTaps((prev) => {
      if (prev.length > 0 && now - prev[prev.length - 1] > TAP_TIMEOUT_MS) {
        setBpm(null); // stale run — start counting again from scratch
        return [now];
      }
      return [...prev, now].slice(-MAX_TAPS);
    });
  };

  const reset = () => {
    setTaps([]);
    setBpm(null);
  };

  return { bpm, tap, reset, tapCount: taps.length };
}
