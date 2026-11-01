import type { Candle } from '@/domain/market';
import { TF_SECONDS, r2ProxyUrl, r2Url, type R2Pair, type R2Timeframe } from './r2Config';

interface RawCandle {
  time?: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

/**
 * Real endpoints taken from the 1m files on R2 (they have correct Unix times).
 * Higher-TF files still have time:1 — we spread their bars across this range
 * so the calendar reaches Oct 2026 without a re-upload.
 */
export const REAL_RANGE: Record<R2Pair, { from: number; to: number }> = {
  EURUSD: { from: 1_704_128_400, to: 1_792_774_680 }, // 2024-01-01 → 2026-10-23
  USDJPY: { from: 1_704_128_400, to: 1_792_774_680 },
};

function isBrokenTimestamps(rows: RawCandle[]): boolean {
  if (rows.length === 0) return true;
  const sample = rows.slice(0, Math.min(200, rows.length)).map((r) => Number(r.time ?? 0));
  const unique = new Set(sample);
  const max = Math.max(...sample);
  return unique.size <= 3 || max < 1_000_000_000;
}

/**
 * Broken higher-TF files: keep OHLC order, assign times evenly from real 1m start→end.
 * Not perfect for weekends, but the chart calendar reaches 2026 and matches your data span.
 */
function repairTimesSpread(rows: RawCandle[], pair: R2Pair): Candle[] {
  const { from, to } = REAL_RANGE[pair];
  const n = rows.length;
  if (n === 1) {
    return [{ time: from, open: rows[0].open, high: rows[0].high, low: rows[0].low, close: rows[0].close, volume: rows[0].volume ?? 0 }];
  }
  return rows.map((row, i) => ({
    time: Math.floor(from + (i / (n - 1)) * (to - from)),
    open: row.open,
    high: row.high,
    low: row.low,
    close: row.close,
    volume: row.volume ?? 0,
  }));
}

function normalize(rows: RawCandle[], tf: R2Timeframe, pair: R2Pair): Candle[] {
  if (isBrokenTimestamps(rows)) {
    console.warn(`[data] Spreading ${tf} timestamps across real ${pair} range (${rows.length} bars)`);
    return repairTimesSpread(rows, pair);
  }
  return rows
    .map((row) => ({
      time: Math.floor(Number(row.time)),
      open: row.open,
      high: row.high,
      low: row.low,
      close: row.close,
      volume: row.volume ?? 0,
    }))
    .filter((c) => Number.isFinite(c.time) && c.time > 1_000_000_000)
    .sort((a, b) => a.time - b.time);
}

async function fetchJson(url: string): Promise<RawCandle[]> {
  const res = await fetch(url, { mode: 'cors' });
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status} ${res.statusText}`);
  const raw = (await res.json()) as RawCandle[];
  if (!Array.isArray(raw) || raw.length === 0) throw new Error(`Empty or invalid data from ${url}`);
  return raw;
}

/** Load OHLC from R2 (direct, then proxy). */
export async function loadR2Candles(pair: R2Pair, tf: R2Timeframe): Promise<Candle[]> {
  let raw: RawCandle[];
  try {
    raw = await fetchJson(r2Url(pair, tf));
  } catch (directErr) {
    console.warn('[data] Direct R2 failed, trying proxy', directErr);
    raw = await fetchJson(r2ProxyUrl(pair, tf));
  }
  return normalize(raw, tf, pair);
}

export { TF_SECONDS };
