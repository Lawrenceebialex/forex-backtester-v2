import type { Candle, SymbolInfo, TimeRange, UnixSeconds } from '@/domain/market';
import { generateMockM1 } from './mockCandles';
import { expandToM1, loadR2Candles } from './loadR2Candles';

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

const mock = generateMockM1({
  startTime: Date.UTC(2026, 7, 3) / 1000,
  tradingDays: 20,
  startPrice: 1.085,
  seed: 20260803,
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
export let REPLAY_START_INDEX = Math.min(10 * 1440 + 7 * 60, LAST_INDEX);
export let DEFAULT_START_TIME: UnixSeconds = M1_CANDLES[REPLAY_START_INDEX]?.time ?? M1_CANDLES[0].time;
export let REPLAY_RANGE: TimeRange = {
  from: M1_CANDLES[0].time,
  to: M1_CANDLES[LAST_INDEX].time,
};

function applyCandles(next: Candle[], pair: PairId) {
  candles = next;
  M1_CANDLES = candles;
  LAST_INDEX = candles.length - 1;
  REPLAY_START_INDEX =
    LAST_INDEX > 20_000 ? 10 * 1440 + 7 * 60 : Math.min(500, Math.floor(LAST_INDEX * 0.05));
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
 * Load real history from R2. Uses 1h files (fast) and expands to synthetic M1.
 * Broken timestamps from the original upload are repaired in the browser.
 */
export async function bootstrapMarketData(pair: PairId = 'EURUSD'): Promise<void> {
  loading = true;
  dataReady = false;
  notify();
  try {
    const hourly = await loadR2Candles(pair, '1h');
    const m1 = expandToM1(hourly, 3600);
    applyCandles(m1, pair);
    console.info(`[data] Loaded ${pair}: ${hourly.length} hourly → ${m1.length} synthetic M1 bars`);
  } catch (err) {
    dataError = err instanceof Error ? err.message : String(err);
    console.error('[data] R2 load failed, keeping current candles', err);
    loading = false;
    dataReady = candles.length > 0;
    notify();
  }
}

/** Switch pair and reload from R2 (same repair path). */
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
