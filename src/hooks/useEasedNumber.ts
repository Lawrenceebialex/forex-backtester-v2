import { useEffect, useRef, useState } from 'react';
import { useTradingStore } from '@/stores/tradingStore';

/**
 * Glides toward `target` instead of jumping (exponential ease, ~95% of the way after `seconds`).
 * With `enabled` false it simply returns the target.
 */
export function useEasedNumber(target: number, enabled: boolean, seconds: number): number {
  const [value, setValue] = useState(target);
  const current = useRef(target);

  useEffect(() => {
    if (!enabled) {
      current.current = target;
      setValue(target);
      return;
    }
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const elapsed = Math.min(now - last, 100);
      last = now;
      const remaining = target - current.current;
      if (Math.abs(remaining) < 0.005) {
        current.current = target;
        setValue(target);
        return;
      }
      current.current += remaining * (1 - Math.exp(-elapsed / ((seconds * 1000) / 3)));
      setValue(current.current);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, enabled, seconds]);

  return value;
}

/** Shorthand for numbers shown to the user: follows the "gradual outcome" setting. */
export function useGradual(target: number): number {
  const enabled = useTradingStore((state) => state.settings.gradualOutcome);
  const seconds = useTradingStore((state) => state.settings.gradualSeconds);
  return useEasedNumber(target, enabled, seconds);
}
