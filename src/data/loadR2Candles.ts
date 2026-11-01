import type { Candle } from '@/domain/market';
import { REPAIR_START_UTC, TF_SECONDS, r2ProxyUrl, r2Url, type R2Pair, type R2Timeframe } from './r2Config';

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
  const sample = rows.slice(0, Math.min(200, rows.length)).map((r) => Number(r.time ?? 0));
  const unique = new Set(sample);
  const max = Math.max(...sample);
  // All identical, or not looking like Unix seconds for 2020+
  return unique.size <= 3 || max < 1_000_000_000;
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

/**
 * Load OHLC from R2. Tries direct public URL first (needs CORS), then Pages proxy.
 */
export async function loadR2Candles(pair: R2Pair, tf: R2Timeframe = '1m'): Promise<Candle[]> {
  let raw: RawCandle[];
  try {
    raw = await fetchJson(r2Url(pair, tf));
  } catch (directErr) {
    console.warn('[data] Direct R2 failed, trying proxy', directErr);
    raw = await fetchJson(r2ProxyUrl(pair, tf));
  }
  return normalize(raw, tf);
}
