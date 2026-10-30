import { describe, expect, it } from 'vitest';
import type { SymbolInfo } from '@/domain/market';
import type { ClosedTrade } from '@/domain/trading';
import { generateInsights } from './advice';
import { computeStatistics, rMultiple } from './statistics';
import { niceTicks } from './ticks';
import { parseUtcDateTime, toDateInputValue, toTimeInputValue } from './dateJump';
import { formatDuration } from './format';

const symbol: SymbolInfo = { symbol: 'EURUSD', description: '', pricePrecision: 5, pipSize: 0.0001, contractSize: 100_000 };

let n = 0;
function trade(pnl: number, overrides: Partial<ClosedTrade> = {}): ClosedTrade {
  n++;
  return {
    id: `p${n}`, number: n, side: 'buy', lots: 1, entryPrice: 1.085, entryTime: n * 1000, stopLoss: null, takeProfit: null,
    strategyId: 's1', exitPrice: 1.085, exitTime: n * 1000 + 600, reason: 'manual', pips: pnl / 10, pnl, ...overrides,
  };
}
const run = (pnls: number[]) => pnls.map((pnl) => trade(pnl));

describe('computeStatistics', () => {
  it('handles no trades', () => {
    const stats = computeStatistics([], 10_000, symbol);
    expect(stats.trades).toBe(0);
    expect(stats.winRate).toBeNull();
    expect(stats.profitFactor).toBeNull();
    expect(stats.expectancy).toBeNull();
    expect(stats.equityCurve).toHaveLength(0);
  });

  it('computes the core metrics', () => {
    const stats = computeStatistics(run([100, -50, 200, -100, 50]), 10_000, symbol);
    expect(stats.trades).toBe(5);
    expect(stats.netProfit).toBe(200);
    expect(stats.wins).toBe(3);
    expect(stats.losses).toBe(2);
    expect(stats.winRate).toBe(60);
    expect(stats.grossProfit).toBe(350);
    expect(stats.grossLoss).toBe(-150);
    expect(stats.profitFactor).toBeCloseTo(350 / 150, 9);
    expect(stats.averageWin).toBeCloseTo(350 / 3, 9);
    expect(stats.averageLoss).toBe(-75);
    expect(stats.expectancy).toBe(40);
    expect(stats.returnPercent).toBe(2);
    expect(stats.bestTrade?.pnl).toBe(200);
    expect(stats.worstTrade?.pnl).toBe(-100);
  });

  it('finds the longest streaks, treating breakeven as a reset', () => {
    const stats = computeStatistics(run([10, 10, 10, -5, -5, 0, -5, -5, -5, -5, 10]), 10_000, symbol);
    expect(stats.longestWinStreak).toBe(3);
    expect(stats.longestLossStreak).toBe(4);
    expect(stats.breakeven).toBe(1);
  });

  it('measures drawdown from the running peak of the closed-trade balance', () => {
    // 10,000 → 10,500 (peak) → 9,975 → 10,200: fall of 525 = 5%
    const stats = computeStatistics(run([500, -250, -275, 225]), 10_000, symbol);
    expect(stats.maxDrawdown).toBe(525);
    expect(stats.maxDrawdownPercent).toBeCloseTo((525 / 10_500) * 100, 9);
    expect(stats.equityCurve.map((p) => p.value)).toEqual([10_000, 10_500, 10_250, 9_975, 10_200]);
    expect(stats.drawdownCurve[3].amount).toBe(525);
  });

  it('reports an infinite profit factor with no losses', () => {
    expect(computeStatistics(run([10, 20]), 10_000, symbol).profitFactor).toBe(Infinity);
  });

  it('averages duration and R-multiples (only trades with a stop loss)', () => {
    const risky = trade(200, { entryPrice: 1.085, stopLoss: 1.083, lots: 1 }); // risk = 20 pips = $200 → +1R
    const other = trade(-100, { entryPrice: 1.085, stopLoss: 1.084, lots: 1 }); // risk $100 → -1R
    const none = trade(50);
    expect(rMultiple(risky, symbol)).toBeCloseTo(1, 9);
    const stats = computeStatistics([risky, other, none], 10_000, symbol);
    expect(stats.ratedTrades).toBe(2);
    expect(stats.averageR).toBeCloseTo(0, 9);
    expect(stats.averageDurationSeconds).toBe(600);
  });
});

describe('generateInsights', () => {
  const insightIds = (pnls: number[], balance = 10_000) =>
    generateInsights(computeStatistics(run(pnls), balance, symbol)).map((i) => i.id);

  it('says nothing without trades and warns about tiny samples', () => {
    expect(generateInsights(computeStatistics([], 10_000, symbol))).toHaveLength(0);
    expect(insightIds([10, -5])).toContain('few-trades');
  });

  it('flags a deep drawdown and a drawdown larger than the return', () => {
    const ids = insightIds([-300, -300, -300, -300, -300, 400, 400, 400, 400, 400, 400, 400]);
    expect(ids).toContain('deep-drawdown');
    expect(ids).toContain('drawdown-vs-return');
  });

  it('flags average loss much larger than average win, and long losing streaks', () => {
    const ids = insightIds([20, 20, 20, 20, 20, 20, -100, -100, -100, -100, -100, -100]);
    expect(ids).toContain('loss-bigger-than-win');
    expect(ids).toContain('losing-streak');
    expect(ids).toContain('profit-factor-low');
  });

  it('sorts cautions first and always has an insight for a set of trades', () => {
    const all = generateInsights(computeStatistics(run([10, -5, 10, -5, 10, -5, 10, -5, 10, -5, 10, 10]), 10_000, symbol));
    expect(all.length).toBeGreaterThan(0);
    const tones = all.map((i) => i.tone);
    expect(tones).toEqual([...tones].sort((a, b) => ['caution', 'neutral', 'positive'].indexOf(a) - ['caution', 'neutral', 'positive'].indexOf(b)));
  });
});

describe('helpers', () => {
  it('produces nice ticks', () => {
    expect(niceTicks(0, 100, 5)).toEqual([0, 20, 40, 60, 80, 100]);
    expect(niceTicks(1.0842, 1.0861, 4).every((t) => t >= 1.0842 && t <= 1.0861)).toBe(true);
    expect(niceTicks(5, 5, 4)).toEqual([]);
  });

  it('round-trips UTC date and time input values', () => {
    const t = parseUtcDateTime('2026-08-17', '07:30');
    expect(t).toBe(Date.UTC(2026, 7, 17, 7, 30) / 1000);
    expect(toDateInputValue(t as number)).toBe('2026-08-17');
    expect(toTimeInputValue(t as number)).toBe('07:30');
    expect(parseUtcDateTime('nope', '07:30')).toBeNull();
    expect(parseUtcDateTime('2026-13-01', '07:30')).toBeNull();
  });

  it('formats durations', () => {
    expect(formatDuration(20)).toBe('<1m');
    expect(formatDuration(45 * 60)).toBe('45m');
    expect(formatDuration(3 * 3600 + 20 * 60)).toBe('3h 20m');
    expect(formatDuration(2 * 86400 + 4 * 3600)).toBe('2d 4h');
  });
});
