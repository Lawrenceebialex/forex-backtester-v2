/** Public R2 base URL. */
export const R2_BASE = 'https://pub-bae06cc5db21418c9699a28c5de315d1.r2.dev';

export type R2Pair = 'EURUSD' | 'USDJPY';
export type R2Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

/**
 * Prefer direct R2 (CORS must be enabled on the bucket).
 * Falls back path via Pages Function proxy if needed.
 */
export function r2Url(pair: R2Pair, tf: R2Timeframe): string {
  return `${R2_BASE}/${pair}/${tf}.json`;
}

/** Same-origin proxy (use if direct R2 CORS fails). */
export function r2ProxyUrl(pair: R2Pair, tf: R2Timeframe): string {
  return `/api/ohlc/${pair}/${tf}`;
}

/**
 * Fallback start when a file has broken timestamps (all `time: 1`).
 * Only used for higher-TF files that were uploaded without real times.
 * Prefer 1m files — those already have correct Unix timestamps through 2026.
 */
export const REPAIR_START_UTC = 1_704_153_600; // 2024-01-02

export const TF_SECONDS: Record<R2Timeframe, number> = {
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '1h': 3_600,
  '4h': 14_400,
  '1d': 86_400,
};
