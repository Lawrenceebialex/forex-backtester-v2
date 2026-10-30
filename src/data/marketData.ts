import type { Candle, SymbolInfo, TimeRange, UnixSeconds } from '@/domain/market';
import { generateMockM1 } from './mockCandles';

export const SYMBOL: SymbolInfo = {
  symbol: 'EURUSD',
  description: 'Euro / US Dollar',
  pricePrecision: 5,
  pipSize: 0.0001,
  contractSize: 100_000,
};

/**
 * ── DATA SOURCE ────────────────────────────────────────────────────────────
 * The whole app reads market data through this module. To use real history,
 * replace `M1_CANDLES` with candles loaded from your API / files (sorted by
 * time, ascending, UTC seconds). Nothing else needs to change.
 * ───────────────────────────────────────────────────────────────────────────
 */
export const M1_CANDLES: readonly Candle[] = generateMockM1({
  startTime: Date.UTC(2026, 7, 3) / 1000, // Monday 3 Aug 2026, 00:00 UTC
  tradingDays: 20,
  startPrice: 1.085,
  seed: 20260803,
});

export const LAST_INDEX = M1_CANDLES.length - 1;

/** Replay begins on the Monday of week 3 at 07:00 UTC (London open) with 10 days of history behind it. */
export const REPLAY_START_INDEX = 10 * 1440 + 7 * 60;

/** First time a new session opens at. */
export const DEFAULT_START_TIME: UnixSeconds = M1_CANDLES[REPLAY_START_INDEX].time;

/** The whole dataset is navigable: users can jump to any candle. */
export const REPLAY_RANGE: TimeRange = {
  from: M1_CANDLES[0].time,
  to: M1_CANDLES[LAST_INDEX].time,
};

/** Index of the last M1 candle opening at or before `time` (clamped to the data). */
export function indexAtOrBefore(time: UnixSeconds): number {
  let low = 0;
  let high = LAST_INDEX;
  while (low < high) {
    const mid = (low + high + 1) >> 1;
    if (M1_CANDLES[mid].time <= time) low = mid;
    else high = mid - 1;
  }
  return low;
}

/** Time of the candle the clock lands on for any requested time (clamped to the data). */
export function snapToCandleTime(time: UnixSeconds): UnixSeconds {
  return M1_CANDLES[indexAtOrBefore(time)].time;
}

/** 0 → first candle, 1 → last candle. Index-based so weekend gaps don't skew it. */
export function replayProgress(time: UnixSeconds): number {
  return LAST_INDEX <= 0 ? 1 : indexAtOrBefore(time) / LAST_INDEX;
}
