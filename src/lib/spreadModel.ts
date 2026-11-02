import type { UnixSeconds } from '@/domain/market';
import { roundTo } from '@/lib/math';

/**
 * Research-backed typical retail spreads (pips) for major pairs.
 * Tighter in London–NY overlap, wider in Asia and at rollover.
 */

export type SpreadMode = 'off' | 'fixed' | 'simulated';

const BASE: Record<string, number> = {
  EURUSD: 0.2,
  USDJPY: 0.3,
};

function sessionMultiplier(hourUtc: number): number {
  if (hourUtc === 21 || hourUtc === 22) return 3.5;
  if (hourUtc >= 0 && hourUtc < 7) return 1.6;
  if (hourUtc >= 7 && hourUtc < 12) return 1.0;
  if (hourUtc >= 12 && hourUtc < 16) return 0.75;
  if (hourUtc >= 16 && hourUtc < 21) return 1.1;
  return 1.4;
}

export function simulatedSpreadPips(
  time: UnixSeconds,
  symbol: string,
  newsWiden = false,
): number {
  const base = BASE[symbol] ?? 0.3;
  const hour = Math.floor(((time % 86_400) + 86_400) % 86_400 / 3_600);
  const mult = sessionMultiplier(hour) * (newsWiden ? 2.5 : 1);
  const hash = Math.imul(Math.floor(time / 60) | 0, 2654435761) >>> 0;
  const jitter = ((hash >>> 8) % 1000) / 500 - 1;
  return roundTo(Math.max(0.1, base * mult * (1 + 0.15 * jitter)), 1);
}

export function resolveSpreadPips(
  mode: SpreadMode,
  time: UnixSeconds,
  symbol: string,
  fixedPips: number,
  nearNews = false,
): number {
  if (mode === 'off') return 0;
  if (mode === 'fixed') return Math.max(0, fixedPips);
  return simulatedSpreadPips(time, symbol, nearNews);
}
