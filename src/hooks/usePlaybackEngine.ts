import { useEffect } from 'react';
import type { PlaybackSpeed } from '@/domain/market';
import { usePlaybackStore } from '@/stores/playbackStore';

/** How many M1 candles the virtual clock advances per real second. 1× = one candle per second. */
const M1_CANDLES_PER_SECOND: Record<PlaybackSpeed, number> = {
  0.5: 0.5,
  1: 1,
  2: 2,
  5: 5,
  10: 10,
  max: 600,
};

/** Longest frame we will account for, so a backgrounded tab doesn't fast-forward on return. */
const MAX_FRAME_MS = 250;

/**
 * Drives the virtual clock while playing. Mount once at the app root.
 * Uses requestAnimationFrame with a fractional carry so slow speeds (0.5×) stay accurate
 * and fast speeds advance several candles per frame.
 */
export function usePlaybackEngine(): void {
  const isPlaying = usePlaybackStore((state) => state.isPlaying);
  const speed = usePlaybackStore((state) => state.speed);

  useEffect(() => {
    if (!isPlaying) return;

    let frame = 0;
    let last = performance.now();
    let carry = 0;

    const tick = (now: number) => {
      const elapsed = Math.min(now - last, MAX_FRAME_MS) / 1000;
      last = now;
      carry += elapsed * M1_CANDLES_PER_SECOND[speed];
      const whole = Math.floor(carry);
      if (whole > 0) {
        carry -= whole;
        usePlaybackStore.getState().advance(whole);
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isPlaying, speed]);
}
