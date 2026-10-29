/** Seconds since the Unix epoch (UTC). All market time in the app uses this unit. */
export type UnixSeconds = number;

export interface Candle {
  /** Open time of the candle. */
  time: UnixSeconds;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TimeRange {
  from: UnixSeconds;
  to: UnixSeconds;
}

export type Timeframe = '1m' | '5m' | '15m' | '1H' | '4H' | 'D';

export const TIMEFRAMES: readonly Timeframe[] = ['1m', '5m', '15m', '1H', '4H', 'D'];

export const TIMEFRAME_SECONDS: Record<Timeframe, number> = {
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '1H': 3_600,
  '4H': 14_400,
  D: 86_400,
};

export type PlaybackSpeed = 0.5 | 1 | 2 | 5 | 10 | 'max';

export const PLAYBACK_SPEEDS: readonly PlaybackSpeed[] = [0.5, 1, 2, 5, 10, 'max'];

export interface SymbolInfo {
  symbol: string;
  description: string;
  pricePrecision: number;
  /** Price distance of one pip. */
  pipSize: number;
}
