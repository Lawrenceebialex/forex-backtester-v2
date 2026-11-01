import type { Candle, SymbolInfo, TimeRange, UnixSeconds } from '@/domain/market';
import { generateMockM1 } from './mockCandles';
import { loadR2Candles } from './loadR2Candles';
import type { R2Timeframe } from './r2Config';

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

/** Base resolution of the loaded series (seconds). */
export let BASE_SECONDS = 60;

/**
 * Prefer true 1m files — they have real Unix timestamps through Oct 2026.
 * Higher TFs on R2 still have broken time:1 and only fake-repair into 2025.
 */
const PREFERRED_TF: R2Timeframe = '1m';

const mock = generateMockM1({
  startTime: Date.UTC(2024, 0, 2) / 1000,
  tradingDays: 5,
  startPrice: 1.104,
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
  // Start ~20% into history so many candles are already visible.
  REPLAY_START_INDEX = Math.min(
    Math.max(500, Math.floor(LAST_INDEX * 0.2)),
    Math.max(0, LAST_INDEX - 100),
  );
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
 * Uses 1m first (correct dates through Oct 2026). Falls back to 1h if 1m fails
 * (1h still has broken times — last resort only).
 */
export async function bootstrapMarketData(pair: PairId = 'EURUSD'): Promise<void> {
  loading = true;
  dataError = null;
  notify();
  try {
    let bars: Candle[];
    let seconds = 60;
    try {
      bars = await loadR2Candles(pair, PREFERRED_TF);
      seconds = 60;
    } catch (firstErr) {
      console.warn('[data] 1m failed, trying 1h', firstErr);
      bars = await loadR2Candles(pair, '1h');
      seconds = 3600;
    }
    applyCandles(bars, pair, seconds);
    const from = new Date(bars[0].time * 1000).toISOString().slice(0, 10);
    const to = new Date(bars[bars.length - 1].time * 1000).toISOString().slice(0, 10);
    console.info(`[data] Loaded ${pair}: ${bars.length} bars ${from} → ${to}`);
  } catch (err) {
    dataError = err instanceof Error ? err.message : String(err);
    console.error('[data] R2 load failed, keeping mock candles', err);
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
