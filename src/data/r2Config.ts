export const R2_BASE = 'https://pub-bae06cc5db21418c9699a28c5de315d1.r2.dev';

export type R2Pair = 'EURUSD' | 'USDJPY';
export type R2Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

export function r2Url(pair: R2Pair, tf: R2Timeframe): string {
  return `${R2_BASE}/${pair}/${tf}.json`;
}

export function r2ProxyUrl(pair: R2Pair, tf: R2Timeframe): string {
  return `/api/ohlc/${pair}/${tf}`;
}
