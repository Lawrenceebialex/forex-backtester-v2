/** Public R2 base URL for historical OHLC JSON. */
export const R2_BASE = 'https://pub-bae06cc5db21418c9699a28c5de315d1.r2.dev';

export type R2Pair = 'EURUSD' | 'USDJPY';
export type R2Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

export function r2Url(pair: R2Pair, tf: R2Timeframe): string {
  return `${R2_BASE}/${pair}/${tf}.json`;
}

/**
 * Fallback start when the uploaded JSON has broken timestamps (all `time: 1`).
 * 2024-01-02 00:00 UTC — sequential bars are assigned from here.
 */
export const REPAIR_START_UTC = 1_704_153_600;

export const TF_SECONDS: Record<R2Timeframe, number> = {
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '1h': 3_600,
  '4h': 14_400,
  '1d': 86_400,
};
