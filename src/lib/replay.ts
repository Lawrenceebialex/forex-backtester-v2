import type { Candle, Timeframe, UnixSeconds } from '@/domain/market';
import { TIMEFRAME_SECONDS } from '@/domain/market';

/**
 * Replay model
 * ────────────
 * M1 candles are the single source of truth. The virtual clock is an index (the
 * "cursor") into that array. A higher-timeframe candle is built on demand from the
 * M1 candles up to the cursor, so the forming candle only ever contains information
 * that has already "happened". Nothing past the cursor is read — the future cannot leak.
 */

/** One higher-timeframe candle, expressed as an inclusive range of M1 indices. */
export interface Bucket {
  time: UnixSeconds;
  first: number;
  last: number;
}

export interface TimeframeIndex {
  timeframe: Timeframe;
  buckets: Bucket[];
}

export function buildTimeframeIndex(m1: readonly Candle[], timeframe: Timeframe): TimeframeIndex {
  const seconds = TIMEFRAME_SECONDS[timeframe];
  const buckets: Bucket[] = [];
  for (let i = 0; i < m1.length; i++) {
    const time = Math.floor(m1[i].time / seconds) * seconds;
    const previous = buckets[buckets.length - 1];
    if (previous && previous.time === time) previous.last = i;
    else buckets.push({ time, first: i, last: i });
  }
  return { timeframe, buckets };
}

/** Index of the bucket that contains the M1 candle at `cursor`. */
export function bucketIndexAt(index: TimeframeIndex, cursor: number): number {
  const { buckets } = index;
  let low = 0;
  let high = buckets.length - 1;
  while (low < high) {
    const mid = (low + high + 1) >> 1;
    if (buckets[mid].first <= cursor) low = mid;
    else high = mid - 1;
  }
  return low;
}

/** Builds a candle from the bucket's M1 candles, never reading beyond `cursor`. */
export function aggregate(m1: readonly Candle[], bucket: Bucket, cursor: number): Candle {
  const end = Math.min(bucket.last, cursor);
  const first = m1[bucket.first];
  let high = first.high;
  let low = first.low;
  let volume = 0;
  for (let i = bucket.first; i <= end; i++) {
    const candle = m1[i];
    if (candle.high > high) high = candle.high;
    if (candle.low < low) low = candle.low;
    volume += candle.volume;
  }
  return { time: bucket.time, open: first.open, high, low, close: m1[end].close, volume };
}

/** Every candle visible when the clock sits at `cursor`; the last one is still forming. */
export function visibleCandles(m1: readonly Candle[], index: TimeframeIndex, cursor: number): Candle[] {
  const lastBucket = bucketIndexAt(index, cursor);
  const result: Candle[] = new Array(lastBucket + 1);
  for (let i = 0; i <= lastBucket; i++) {
    result[i] = aggregate(m1, index.buckets[i], cursor);
  }
  return result;
}

/**
 * The candles a chart must (re)draw to move from `fromCursor` to `toCursor` (forward only).
 * Feed each to `series.update()` in order: the first replaces the forming candle, any
 * following ones are newly opened.
 */
export function candleUpdates(
  m1: readonly Candle[],
  index: TimeframeIndex,
  fromCursor: number,
  toCursor: number,
): Candle[] {
  const first = bucketIndexAt(index, fromCursor);
  const last = bucketIndexAt(index, toCursor);
  const updates: Candle[] = [];
  for (let i = first; i <= last; i++) {
    updates.push(aggregate(m1, index.buckets[i], toCursor));
  }
  return updates;
}

/** The forming candle at `cursor`. */
export function latestCandle(m1: readonly Candle[], index: TimeframeIndex, cursor: number): Candle {
  return aggregate(m1, index.buckets[bucketIndexAt(index, cursor)], cursor);
}
