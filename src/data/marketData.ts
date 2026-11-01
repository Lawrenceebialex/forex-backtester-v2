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

const mock = generateMockM1({
  startTime: Date.UTC(2024, 0, 2) / 1000,
  tradingDays: 10,
  startPrice: 1.104,
  seed: 20240102,
});

let candles: Candle[] = [...mock];
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
export let LAST_INDEX = Math.max(0, M1_CANDLES.length - 1);
export let REPLAY_START_INDEX = 0;
export let DEFAULT_START_TIME: UnixSeconds = M1_CANDLES[0]?.time ?? 0;
export let REPLAY_RANGE: TimeRange = {
  from: M1_CANDLES[0]?.time ?? 0,
  to: M1_CANDLES[LAST_INDEX]?.time ?? 0,
};
export let MARKET_DATA_STATUS: 'loading' | 'ready' | 'error' = 'loading';
export let WEEKEND_GAP_TIMES: readonly UnixSeconds[] = [];

function recomputeWeekendGaps() {
  WEEKEND_GAP_TIMES = M1_CANDLES.flatMap((candle, i) =>
    i < LAST_INDEX && M1_CANDLES[i + 1].time - candle.time > 6 * 3600 ? [candle.time] : [],
  );
}

function applyCandles(next: Candle[], pair: PairId, baseSeconds: number) {
  candles = next;
  M1_CANDLES = candles;
  LAST_INDEX = Math.max(0, candles.length - 1);
  BASE_SECONDS = baseSeconds;
  REPLAY_START_INDEX = Math.min(
    Math.max(50, Math.floor(LAST_INDEX * 0.2)),
    Math.max(0, LAST_INDEX - 20),
  );
  DEFAULT_START_TIME = candles[REPLAY_START_INDEX]?.time ?? candles[0].time;
  REPLAY_RANGE = { from: candles[0].time, to: candles[LAST_INDEX].time };
  ACTIVE_PAIR = pair;
  SYMBOL = SYMBOLS[pair];
  recomputeWeekendGaps();
  dataReady = true;
  dataError = null;
  loading = false;
  MARKET_DATA_STATUS = 'ready';
  notify();
}

const BOOT_ORDER: { tf: R2Timeframe; seconds: number }[] = [
  { tf: '1h', seconds: 3600 },
  { tf: '15m', seconds: 900 },
  { tf: '1m', seconds: 60 },
];

export async function bootstrapMarketData(pair: PairId = 'EURUSD'): Promise<void> {
  loading = true;
  dataError = null;
  MARKET_DATA_STATUS = 'loading';
  notify();

  let lastErr: unknown;
  for (const { tf, seconds } of BOOT_ORDER) {
    try {
      const bars = await loadR2Candles(pair, tf);
      applyCandles(bars, pair, seconds);
      const from = new Date(bars[0].time * 1000).toISOString().slice(0, 10);
      const to = new Date(bars[bars.length - 1].time * 1000).toISOString().slice(0, 10);
      console.info(`[data] ${pair} ${tf}: ${bars.length} bars ${from} → ${to}`);
      return;
    } catch (err) {
      lastErr = err;
      console.warn(`[data] ${pair}/${tf} failed`, err);
    }
  }

  dataError = lastErr instanceof Error ? lastErr.message : String(lastErr);
  console.error('[data] R2 load failed, using mock', lastErr);
  applyCandles([...mock], pair, 60);
  MARKET_DATA_STATUS = 'error';
  loading = false;
  notify();
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
