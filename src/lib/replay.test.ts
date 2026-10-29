import { describe, expect, it } from 'vitest';
import { generateMockM1 } from '@/data/mockCandles';
import { TIMEFRAMES, TIMEFRAME_SECONDS, type Candle } from '@/domain/market';
import {
  aggregate,
  bucketIndexAt,
  buildTimeframeIndex,
  candleUpdates,
  latestCandle,
  visibleCandles,
} from './replay';

const options = { startTime: Date.UTC(2026, 7, 3) / 1000, tradingDays: 6, startPrice: 1.085, seed: 7 };
const m1 = generateMockM1(options);

describe('mock M1 data', () => {
  it('is deterministic', () => {
    expect(generateMockM1(options)).toEqual(m1);
  });

  it('has one candle per minute on trading days and none on weekends', () => {
    expect(m1).toHaveLength(6 * 1440);
    for (const c of m1) {
      const day = new Date(c.time * 1000).getUTCDay();
      expect(day === 0 || day === 6).toBe(false);
    }
  });

  it('produces valid, continuous OHLC', () => {
    m1.forEach((c, i) => {
      expect(c.high).toBeGreaterThanOrEqual(Math.max(c.open, c.close));
      expect(c.low).toBeLessThanOrEqual(Math.min(c.open, c.close));
      if (i > 0) expect(c.open).toBe(m1[i - 1].close);
    });
  });
});

describe('replay', () => {
  const cursors = [0, 1, 59, 60, 61, 899, 1440, 3000, 4321, m1.length - 1];

  it('buckets partition the M1 data exactly once', () => {
    for (const tf of TIMEFRAMES) {
      const { buckets } = buildTimeframeIndex(m1, tf);
      expect(buckets[0].first).toBe(0);
      expect(buckets[buckets.length - 1].last).toBe(m1.length - 1);
      for (let i = 1; i < buckets.length; i++) expect(buckets[i].first).toBe(buckets[i - 1].last + 1);
    }
  });

  it('never exposes the future in any timeframe', () => {
    for (const tf of TIMEFRAMES) {
      const index = buildTimeframeIndex(m1, tf);
      for (const cursor of cursors) {
        const visible = visibleCandles(m1, index, cursor);
        const last = visible[visible.length - 1];
        const seen = m1.slice(0, cursor + 1);

        // Brute force: the forming candle may only contain M1 candles at or before the cursor.
        const bucket = index.buckets[bucketIndexAt(index, cursor)];
        const inBucket = seen.filter((c) => c.time >= bucket.time && c.time < bucket.time + TIMEFRAME_SECONDS[tf]);
        expect(last.time).toBe(bucket.time);
        expect(last.close).toBe(inBucket[inBucket.length - 1].close);
        expect(last.high).toBe(Math.max(...inBucket.map((c) => c.high)));
        expect(last.low).toBe(Math.min(...inBucket.map((c) => c.low)));

        // Nothing drawn can exceed what has actually been seen so far.
        expect(Math.max(...visible.map((c) => c.high))).toBeLessThanOrEqual(Math.max(...seen.map((c) => c.high)));
        expect(last.time).toBeLessThanOrEqual(m1[cursor].time);
      }
    }
  });

  it('a forming candle only grows as the clock advances', () => {
    const index = buildTimeframeIndex(m1, '1H');
    const before = latestCandle(m1, index, 90);
    const after = latestCandle(m1, index, 100);
    expect(after.time).toBe(before.time);
    expect(after.open).toBe(before.open);
    expect(after.high).toBeGreaterThanOrEqual(before.high);
    expect(after.low).toBeLessThanOrEqual(before.low);
  });

  it('incremental updates equal a full rebuild', () => {
    const jumps: Array<[number, number]> = [[100, 101], [100, 130], [59, 61], [1000, 2500], [0, 4000]];
    for (const tf of TIMEFRAMES) {
      const index = buildTimeframeIndex(m1, tf);
      for (const [from, to] of jumps) {
        const state: Candle[] = visibleCandles(m1, index, from);
        for (const update of candleUpdates(m1, index, from, to)) {
          const last = state[state.length - 1];
          if (last.time === update.time) state[state.length - 1] = update;
          else state.push(update);
        }
        expect(state).toEqual(visibleCandles(m1, index, to));
      }
    }
  });

  it('aggregating a full bucket yields the bucket extremes', () => {
    const index = buildTimeframeIndex(m1, '15m');
    const bucket = index.buckets[10];
    const candle = aggregate(m1, bucket, m1.length - 1);
    const slice = m1.slice(bucket.first, bucket.last + 1);
    expect(candle.open).toBe(slice[0].open);
    expect(candle.close).toBe(slice[slice.length - 1].close);
    expect(candle.high).toBe(Math.max(...slice.map((c) => c.high)));
    expect(candle.low).toBe(Math.min(...slice.map((c) => c.low)));
  });
});
