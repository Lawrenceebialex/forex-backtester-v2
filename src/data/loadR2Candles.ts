import type { Candle } from '@/domain/market';
import { REPAIR_START_UTC, TF_SECONDS, r2Url, type R2Pair, type R2Timeframe } from './r2Config';

interface RawCandle {
  time?: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

function isBrokenTimestamps(rows: RawCandle[]): boolean {
  if (rows.length === 0) return true;
  const sample = rows.slice(0, Math.min(50, rows.length)).map((r) => r.time ?? 0);
  const unique = new Set(sample);
  const max = Math.max(...sample);
  // All identical, or not looking like Unix seconds for 2020+
  return unique.size <= 1 || max < 1_000_000_000;
}

/** Assign sequential open times when the uploaded file has corrupt `time` fields. */
function repairTimes(rows: RawCandle[], tf: R2Timeframe): Candle[] {
  const step = TF_SECONDS[tf];
  return rows.map((row, i) => ({
    time: REPAIR_START_UTC + i * step,
    open: row.open,
    high: row.high,
    low: row.low,
    close: row.close,
    volume: row.volume ?? 0,
  }));
}

function normalize(rows: RawCandle[], tf: R2Timeframe): Candle[] {
  if (isBrokenTimestamps(rows)) {
    console.warn(`[data] Repairing broken timestamps for ${tf} (${rows.length} bars)`);
    return repairTimes(rows, tf);
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
    .sort((a, b) => a.time - b.time);
}

/**
 * Expand higher-timeframe bars into synthetic 1-minute bars so the existing
 * playback / trading engine (which expects M1) keeps working without a re-upload of 1m data.
 * OHLC is held flat within each parent bar (honest about resolution).
 */
export function expandToM1(bars: Candle[], parentSeconds: number): Candle[] {
  if (parentSeconds <= 60) return bars;
  const out: Candle[] = [];
  const steps = Math.floor(parentSeconds / 60);
  for (const bar of bars) {
    for (let i = 0; i < steps; i++) {
      out.push({
        time: bar.time + i * 60,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: (bar.volume ?? 0) / steps,
      });
    }
  }
  return out;
}

export async function loadR2Candles(pair: R2Pair, tf: R2Timeframe = '1h'): Promise<Candle[]> {
  const url = r2Url(pair, tf);
  const res = await fetch(url, { mode: 'cors' });
  if (!res.ok) {
    throw new Error(`Failed to load ${url}: ${res.status} ${res.statusText}`);
  }
  const raw = (await res.json()) as RawCandle[];
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error(`Empty or invalid data from ${url}`);
  }
  return normalize(raw, tf);
}
