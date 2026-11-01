import type { Candle } from '@/domain/market';
import { r2ProxyUrl, r2Url, type R2Pair, type R2Timeframe } from './r2Config';

interface RawCandle {
  time?: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

function hasRealTimestamps(rows: RawCandle[]): boolean {
  if (rows.length < 2) return false;
  const sample = rows.slice(0, Math.min(50, rows.length)).map((r) => Number(r.time ?? 0));
  const max = Math.max(...sample);
  const min = Math.min(...sample);
  // Real forex history must look like Unix seconds in the 2020s+ and not all identical.
  return max > 1_600_000_000 && min > 1_600_000_000 && max !== min;
}

function normalizeReal(rows: RawCandle[]): Candle[] {
  return rows
    .map((row) => ({
      time: Math.floor(Number(row.time)),
      open: row.open,
      high: row.high,
      low: row.low,
      close: row.close,
      volume: row.volume ?? 0,
    }))
    .filter((c) => Number.isFinite(c.time) && c.time > 1_600_000_000)
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
 * Load OHLC from R2. Uses ONLY real timestamps written in the file.
 * Does not invent or spread dates. Files with broken time:1 are rejected
 * so the caller can fall back to 1m (which has correct times on your bucket).
 */
export async function loadR2Candles(pair: R2Pair, tf: R2Timeframe): Promise<Candle[]> {
  let raw: RawCandle[];
  try {
    raw = await fetchJson(r2Url(pair, tf));
  } catch (directErr) {
    console.warn('[data] Direct R2 failed, trying proxy', directErr);
    raw = await fetchJson(r2ProxyUrl(pair, tf));
  }

  if (!hasRealTimestamps(raw)) {
    throw new Error(
      `${pair}/${tf} has broken timestamps (no real candle dates). Use 1m files which have correct times.`,
    );
  }

  const candles = normalizeReal(raw);
  if (candles.length < 10) {
    throw new Error(`${pair}/${tf}: too few valid timed candles (${candles.length})`);
  }
  return candles;
}
