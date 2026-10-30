import { describe, expect, it } from 'vitest';
import type { Candle, SymbolInfo } from '@/domain/market';
import type { Position, Quote } from '@/domain/trading';
import {
  buildClosedTrade,
  closePrice,
  computeAccount,
  fillPrice,
  floatingResult,
  makeQuote,
  marginFor,
  pipValue,
  resolveStop,
  settleCandles,
  spreadPipsAt,
  validateOrder,
} from './trading';

const symbol: SymbolInfo = { symbol: 'EURUSD', description: 'Euro / US Dollar', pricePrecision: 5, pipSize: 0.0001, contractSize: 100_000 };
const quote = (bid: number, spread = 1): Quote => makeQuote(bid, spread, symbol);

const position = (overrides: Partial<Position> = {}): Position => ({
  id: 'p1', number: 1, side: 'buy', lots: 1, entryPrice: 1.085, entryTime: 0, stopLoss: null, takeProfit: null, strategyId: 's1', ...overrides,
});

const candle = (time: number, low: number, high: number): Candle => ({ time, open: low, high, low, close: high, volume: 1 });

describe('quotes and fills', () => {
  it('ask is bid plus spread; buys fill at ask, sells at bid', () => {
    const q = quote(1.085, 1.2);
    expect(q.ask).toBe(1.08512);
    expect(fillPrice('buy', q)).toBe(1.08512);
    expect(fillPrice('sell', q)).toBe(1.085);
    expect(closePrice('buy', q)).toBe(1.085);
    expect(closePrice('sell', q)).toBe(1.08512);
  });

  it('opening and instantly closing costs exactly the spread', () => {
    const q = quote(1.085, 1);
    const buy = position({ side: 'buy', entryPrice: fillPrice('buy', q) });
    const sell = position({ side: 'sell', entryPrice: fillPrice('sell', q) });
    expect(floatingResult(buy, q, symbol).pips).toBeCloseTo(-1, 6);
    expect(floatingResult(sell, q, symbol).pips).toBeCloseTo(-1, 6);
    expect(floatingResult(buy, q, symbol).pnl).toBeCloseTo(-10, 6); // 1 lot = $10 / pip
  });
});

describe('spread simulation', () => {
  it('is fixed when variable spread is off', () => {
    expect(spreadPipsAt(1_700_000_000, 1.5, false)).toBe(1.5);
  });

  it('stays around 0.8–1.2 pips in the London / New York day for a 1.0 base', () => {
    const day = Date.UTC(2026, 7, 5) / 1000;
    for (let minute = 7 * 60; minute < 21 * 60; minute += 7) {
      const spread = spreadPipsAt(day + minute * 60, 1, true);
      expect(spread).toBeGreaterThanOrEqual(0.8);
      expect(spread).toBeLessThanOrEqual(1.2);
    }
  });

  it('widens at rollover and is deterministic', () => {
    const day = Date.UTC(2026, 7, 5) / 1000;
    const rollover = spreadPipsAt(day + 22 * 3600, 1, true);
    expect(rollover).toBeGreaterThanOrEqual(1.4);
    expect(spreadPipsAt(day + 22 * 3600, 1, true)).toBe(rollover);
  });
});

describe('money', () => {
  it('computes P&L, pip value and margin', () => {
    const q = quote(1.086, 0);
    expect(floatingResult(position({ side: 'buy', entryPrice: 1.085, lots: 1 }), q, symbol).pnl).toBeCloseTo(100, 6);
    expect(floatingResult(position({ side: 'sell', entryPrice: 1.087, lots: 0.5 }), q, symbol).pips).toBeCloseTo(10, 6);
    expect(pipValue(0.1, symbol)).toBeCloseTo(1, 9);
    expect(marginFor(0.1, 1.085, symbol, 100)).toBeCloseTo(108.5, 6);
  });

  it('builds the account snapshot', () => {
    const q = quote(1.086, 0);
    const positions = [position({ entryPrice: 1.085, lots: 1 }), position({ id: 'p2', side: 'sell', entryPrice: 1.0865, lots: 0.5 })];
    const account = computeAccount(10_000, positions, q, symbol, 100);
    expect(account.floatingPnl).toBe(125); // +100, +25
    expect(account.equity).toBe(10_125);
    expect(account.usedMargin).toBeCloseTo(1085 + 543.25, 6);
    expect(account.freeMargin).toBeCloseTo(10_125 - 1628.25, 6);
  });
});

describe('stops', () => {
  it('resolves pips relative to the fill price for each side', () => {
    expect(resolveStop('buy', 'stop-loss', { unit: 'pips', value: 20 }, 1.085, symbol)).toBe(1.083);
    expect(resolveStop('buy', 'take-profit', { unit: 'pips', value: 20 }, 1.085, symbol)).toBe(1.087);
    expect(resolveStop('sell', 'stop-loss', { unit: 'pips', value: 20 }, 1.085, symbol)).toBe(1.087);
    expect(resolveStop('sell', 'take-profit', { unit: 'pips', value: 20 }, 1.085, symbol)).toBe(1.083);
    expect(resolveStop('buy', 'stop-loss', { unit: 'price', value: 1.0812 }, 1.085, symbol)).toBe(1.0812);
  });
});

describe('order validation', () => {
  const context = { quote: quote(1.085, 1), freeMargin: 10_000, symbol, leverage: 100 };
  const order = { side: 'buy' as const, lots: 0.1, stopLoss: null, takeProfit: null };

  it('accepts a valid order', () => {
    expect(validateOrder({ ...order, stopLoss: 1.083, takeProfit: 1.088 }, context)).toBeNull();
  });

  it('rejects bad lot sizes', () => {
    expect(validateOrder({ ...order, lots: 0 }, context)).not.toBeNull();
    expect(validateOrder({ ...order, lots: 500 }, context)).not.toBeNull();
  });

  it('rejects stops on the wrong side of the market', () => {
    expect(validateOrder({ ...order, stopLoss: 1.09 }, context)).toContain('Stop loss');
    expect(validateOrder({ ...order, takeProfit: 1.08 }, context)).toContain('Take profit');
    expect(validateOrder({ ...order, side: 'sell', stopLoss: 1.08 }, context)).toContain('Stop loss');
    expect(validateOrder({ ...order, side: 'sell', takeProfit: 1.09 }, context)).toContain('Take profit');
  });

  it('rejects orders that need more margin than is free', () => {
    expect(validateOrder({ ...order, lots: 5 }, { ...context, freeMargin: 1000 })).toContain('free margin');
  });
});

describe('settling stops against revealed candles', () => {
  const spread = () => 1;

  it('closes a buy at its stop-loss and at its take-profit', () => {
    const sl = settleCandles([position({ stopLoss: 1.083 })], [candle(60, 1.0829, 1.0851)], symbol, spread);
    expect(sl.open).toHaveLength(0);
    expect(sl.closed[0].reason).toBe('stop-loss');
    expect(sl.closed[0].exitPrice).toBe(1.083);
    expect(sl.closed[0].pnl).toBe(-200);

    const tp = settleCandles([position({ takeProfit: 1.087 })], [candle(60, 1.0851, 1.0872)], symbol, spread);
    expect(tp.closed[0].reason).toBe('take-profit');
    expect(tp.closed[0].pnl).toBe(200);
    expect(tp.closed[0].pips).toBe(20);
  });

  it('assumes the stop-loss when one candle touches both levels', () => {
    const result = settleCandles([position({ stopLoss: 1.083, takeProfit: 1.087 })], [candle(60, 1.0825, 1.0875)], symbol, spread);
    expect(result.closed[0].reason).toBe('stop-loss');
  });

  it('closes sells against the ask, so the spread counts', () => {
    // Bid high is 1.0869 — below the 1.0870 stop — but the ask (bid + 1 pip) reaches it.
    const sell = position({ side: 'sell', entryPrice: 1.085, stopLoss: 1.087 });
    const result = settleCandles([sell], [candle(60, 1.0851, 1.0869)], symbol, spread);
    expect(result.closed[0].reason).toBe('stop-loss');
    expect(settleCandles([sell], [candle(60, 1.0851, 1.0869)], symbol, () => 0).open).toHaveLength(1);
  });

  it('leaves untouched positions open and processes candles in order', () => {
    const quiet = settleCandles([position({ stopLoss: 1.08, takeProfit: 1.09 })], [candle(60, 1.0849, 1.0855)], symbol, spread);
    expect(quiet.open).toHaveLength(1);
    expect(quiet.closed).toHaveLength(0);

    const ordered = settleCandles(
      [position({ stopLoss: 1.083, takeProfit: 1.087 })],
      [candle(60, 1.0851, 1.0872), candle(120, 1.0825, 1.0852)],
      symbol,
      spread,
    );
    expect(ordered.closed).toHaveLength(1);
    expect(ordered.closed[0].reason).toBe('take-profit');
    expect(ordered.closed[0].exitTime).toBe(60);
  });

  it('ignores candles from before the position was opened', () => {
    const late = position({ entryTime: 1000, stopLoss: 1.083 });
    expect(settleCandles([late], [candle(60, 1.08, 1.0851)], symbol, spread).open).toHaveLength(1);
    expect(settleCandles([late], [candle(1060, 1.08, 1.0851)], symbol, spread).closed).toHaveLength(1);
  });

  it('records manual closes with the right numbers', () => {
    const trade = buildClosedTrade(position({ side: 'sell', entryPrice: 1.085, lots: 0.2 }), 1.084, 99, 'manual', symbol);
    expect(trade.pips).toBe(10);
    expect(trade.pnl).toBe(20);
    expect(trade.exitTime).toBe(99);
  });
});
