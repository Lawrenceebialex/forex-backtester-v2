import type { Candle, SymbolInfo, TimeRange, UnixSeconds } from '@/domain/market';
import { generateMockM1 } from './mockCandles';
import { loadR2Candles } from './loadR2Candles';

export type PairId = 'EURUSD' | 'USDJPY';

export const SYMBOLS: Record<PairId, SymbolInfo> = {
  EURUSD: {
    symbol: 'EURUSD',
    description: 'Euro / US Dollar',
    pricePrecision: 5,
    pipSize: 0.0001,
    contractSize: 100_000,
  },
  USDJPY: {
    symbol: 'USDJPY',
    description: 'US Dollar / Japanese Yen',
    pricePrecision: 3,
    pipSize: 0.01,
    contractSize: 100_000,
  },
};

/** Active symbol — updated when the user switches pair. */
export let SYMBOL: SymbolInfo = SYMBOLS.EURUSD;
export let ACTIVE_PAIR: PairId = 'EURUSD';

/** Base resolution of the loaded series (R2 1h until true 1m is fixed). */
export let BASE_SECONDS = 60;

const mock = generateMockM1({
  startTime: Date.UTC(2024, 0, 2) / 1000,
  tradingDays: 30,
  startPrice: 1.085,
  seed: 20240102,
});

let candles: Candle[] = mock;
let dataReady = false;
let dataError: string | null = null;
let loading = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

export function subscribeMarketData(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function isMarketDataReady(): boolean {
  return dataReady;
}

export function isMarketDataLoading(): boolean {
  return loading;
}

export function getMarketDataError(): string | null {
  return dataError;
}

export function getM1Candles(): readonly Candle[] {
  return candles;
}

export let M1_CANDLES: readonly Candle[] = candles;
export let LAST_INDEX = M1_CANDLES.length - 1;
export let REPLAY_START_INDEX = 0;
export let DEFAULT_START_TIME: UnixSeconds = M1_CANDLES[0].time;
export let REPLAY_RANGE: TimeRange = {
  from: M1_CANDLES[0].time,
  to: M1_CANDLES[LAST_INDEX].time,
};

function applyCandles(next: Candle[], pair: PairId, baseSeconds: number) {
  candles = next;
  M1_CANDLES = candles;
  LAST_INDEX = Math.max(0, candles.length - 1);
  BASE_SECONDS = baseSeconds;
  // Start near the beginning so the full history is reachable via play / jump.
  REPLAY_START_INDEX = Math.min(24, Math.floor(LAST_INDEX * 0.02));
  DEFAULT_START_TIME = candles[REPLAY_START_INDEX].time;
  REPLAY_RANGE = { from: candles[0].time, to: candles[LAST_INDEX].time };
  ACTIVE_PAIR = pair;
  SYMBOL = SYMBOLS[pair];
  dataReady = true;
  dataError = null;
  loading = false;
  notify();
}

/**
 * Load real history from R2.
 * Uses 1h files only (small, fast). Does NOT expand to synthetic 1m — that froze phones.
 * Broken timestamps are repaired in loadR2Candles.
 */
export async function bootstrapMarketData(pair: PairId = 'EURUSD'): Promise<void> {
  loading = true;
  notify();
  try {
    const hourly = await loadR2Candles(pair, '1h');
    applyCandles(hourly, pair, 3600);
    console.info(`[data] Loaded ${pair}: ${hourly.length} hourly bars from R2`);
  } catch (err) {
    dataError = err instanceof Error ? err.message : String(err);
    console.error('[data] R2 load failed, keeping current candles', err);
    loading = false;
    dataReady = candles.length > 0;
    notify();
  }
}

/** Switch pair and reload from R2. */
export async function switchPair(pair: PairId): Promise<void> {
  if (pair === ACTIVE_PAIR && dataReady) return;
  await bootstrapMarketData(pair);
}

export function indexAtOrBefore(time: UnixSeconds): number {
  let low = 0;
  let high = LAST_INDEX;
  while (low < high) {
    const mid = (low + high + 1) >> 1;
    if (M1_CANDLES[mid].time <= time) low = mid;
    else high = mid - 1;
  }
  return low;
}

export function snapToCandleTime(time: UnixSeconds): UnixSeconds {
  return M1_CANDLES[indexAtOrBefore(time)].time;
}

export function replayProgress(time: UnixSeconds): number {
  return LAST_INDEX <= 0 ? 1 : indexAtOrBefore(time) / LAST_INDEX;
}
