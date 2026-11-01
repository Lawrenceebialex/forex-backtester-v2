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

export let SYMBOL: SymbolInfo = SYMBOLS.EURUSD;
export let ACTIVE_PAIR: PairId = 'EURUSD';
export let BASE_SECONDS = 3600;

/**
 * TradingView-style: open on a small file (1h ≈ 1.4 MB), not full 1m (~94 MB).
 * 1h times are repaired to span the real 1m range (2024 → Oct 2026).
 */
const BOOT_TF: R2Timeframe = '1h';
const BOOT_SECONDS = 3600;

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
  // Start ~25% in so the chart already shows a useful stretch of history.
  REPLAY_START_INDEX = Math.min(
    Math.max(100, Math.floor(LAST_INDEX * 0.25)),
    Math.max(0, LAST_INDEX - 50),
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

export async function bootstrapMarketData(pair: PairId = 'EURUSD'): Promise<void> {
  loading = true;
  dataError = null;
  notify();
  try {
    const bars = await loadR2Candles(pair, BOOT_TF);
    applyCandles(bars, pair, BOOT_SECONDS);
    const from = new Date(bars[0].time * 1000).toISOString().slice(0, 10);
    const to = new Date(bars[bars.length - 1].time * 1000).toISOString().slice(0, 10);
    console.info(`[data] Boot ${pair} ${BOOT_TF}: ${bars.length} bars ${from} → ${to}`);
  } catch (err) {
    dataError = err instanceof Error ? err.message : String(err);
    console.error('[data] R2 load failed, keeping mock', err);
    loading = false;
    dataReady = candles.length > 0;
    notify();
  }
}

/**
 * Optional: load full 1m when user explicitly needs minute resolution.
 * ~90 MB — call only on demand, not on first open.
 */
export async function loadFullM1(pair: PairId = ACTIVE_PAIR): Promise<void> {
  loading = true;
  notify();
  try {
    const bars = await loadR2Candles(pair, '1m');
    applyCandles(bars, pair, 60);
    console.info(`[data] Full 1m ${pair}: ${bars.length} bars`);
  } catch (err) {
    dataError = err instanceof Error ? err.message : String(err);
    console.error('[data] Full 1m failed', err);
    loading = false;
    notify();
  }
}

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
