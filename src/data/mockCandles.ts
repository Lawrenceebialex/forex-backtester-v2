import type { Candle, UnixSeconds } from '@/domain/market';

export interface MockM1Options {
  /** Midnight UTC of a Monday. Weekends are skipped, as in the real FX market. */
  startTime: UnixSeconds;
  tradingDays: number;
  startPrice: number;
  seed: number;
}

const MINUTES_PER_DAY = 1440;
/** One-minute return standard deviation at "normal" volatility: 0.5 pip. */
const BASE_SIGMA = 0.00005;

/** Deterministic PRNG (mulberry32): the mock market is identical on every load. */
function createRandom(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Rough intraday volatility profile by UTC hour (Asia quiet, London/New York busy). */
function sessionVolatility(hour: number): number {
  if (hour < 7) return 0.55;
  if (hour < 12) return 1.15;
  if (hour < 16) return 1.5;
  if (hour < 21) return 0.95;
  return 0.5;
}

const round5 = (value: number) => Math.round(value * 1e5) / 1e5;

/**
 * Generates plausible EURUSD M1 candles: session-based volatility, volatility clustering,
 * slow trending drift and the occasional news-style spike.
 *
 * Swap this for a real data source later — see `data/marketData.ts`.
 */
export function generateMockM1(options: MockM1Options): Candle[] {
  const random = createRandom(options.seed);
  const gaussian = () => {
    const u = Math.max(random(), 1e-9);
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * random());
  };

  const candles: Candle[] = [];
  let price = options.startPrice;
  let drift = 0;
  let volatilityRegime = 1;
  let day = options.startTime;
  let tradingDaysDone = 0;

  while (tradingDaysDone < options.tradingDays) {
    const weekday = new Date(day * 1000).getUTCDay();
    if (weekday !== 0 && weekday !== 6) {
      for (let minute = 0; minute < MINUTES_PER_DAY; minute++) {
        const session = sessionVolatility(Math.floor(minute / 60));
        if (minute % 90 === 0) drift = gaussian() * 0.000003;
        volatilityRegime = Math.min(
          2.2,
          Math.max(0.6, volatilityRegime + (1 - volatilityRegime) * 0.05 + gaussian() * 0.04),
        );

        let sigma = BASE_SIGMA * session * volatilityRegime;
        if (random() < 0.002) sigma *= 3;

        const open = price;
        const close = round5(open + drift + gaussian() * sigma);
        const high = round5(Math.max(open, close) + Math.abs(gaussian()) * sigma * 0.55);
        const low = round5(Math.min(open, close) - Math.abs(gaussian()) * sigma * 0.55);

        candles.push({
          time: day + minute * 60,
          open,
          high,
          low,
          close,
          volume: Math.round((40 + random() * 120) * session * volatilityRegime),
        });
        price = close;
      }
      tradingDaysDone++;
    }
    day += 86_400;
  }

  return candles;
}
