import type { Candle, SymbolInfo, UnixSeconds } from '@/domain/market';
import type { PendingOrder, Position, Quote, Side, StopInput } from '@/domain/trading';
import { resolveStop } from '@/lib/trading';

/** True when a pending order should fill on this quote. */
export function pendingShouldFill(order: PendingOrder, quote: Quote): boolean {
  const { side, orderType, price } = order;
  if (orderType === 'limit') {
    return side === 'buy' ? quote.ask <= price : quote.bid >= price;
  }
  return side === 'buy' ? quote.ask >= price : quote.bid <= price;
}

/** Candle-range fill check (replay may skip minutes). */
export function pendingTouchedByCandle(
  order: PendingOrder,
  candle: Candle,
  spreadPips: number,
  pipSize: number,
): boolean {
  const askHigh = candle.high + spreadPips * pipSize;
  const askLow = candle.low + spreadPips * pipSize;
  const { side, orderType, price } = order;
  if (orderType === 'limit') {
    if (side === 'buy') return askLow <= price;
    return candle.high >= price;
  }
  if (side === 'buy') return askHigh >= price;
  return candle.low <= price;
}

export function validatePendingPlacement(
  side: Side,
  orderType: 'limit' | 'stop',
  price: number,
  quote: Quote,
  symbol: SymbolInfo,
): string | null {
  if (!(price > 0) || !Number.isFinite(price)) return 'Enter a valid price.';
  const show = (p: number) => p.toFixed(symbol.pricePrecision);
  if (orderType === 'limit') {
    if (side === 'buy' && !(price < quote.ask)) {
      return `Buy limit must be below the ask (${show(quote.ask)}).`;
    }
    if (side === 'sell' && !(price > quote.bid)) {
      return `Sell limit must be above the bid (${show(quote.bid)}).`;
    }
  } else {
    if (side === 'buy' && !(price > quote.ask)) {
      return `Buy stop must be above the ask (${show(quote.ask)}).`;
    }
    if (side === 'sell' && !(price < quote.bid)) {
      return `Sell stop must be below the bid (${show(quote.bid)}).`;
    }
  }
  return null;
}

export function positionFromPending(order: PendingOrder, fill: number, time: UnixSeconds): Position {
  return {
    id: order.id.startsWith('o') ? `p${order.id.slice(1)}` : `p${order.id}`,
    number: order.number,
    side: order.side,
    lots: order.lots,
    entryPrice: fill,
    entryTime: time,
    stopLoss: order.stopLoss,
    takeProfit: order.takeProfit,
    strategyId: order.strategyId,
  };
}

export function resolveStopsAt(
  side: Side,
  entry: number,
  stopLoss: StopInput | null,
  takeProfit: StopInput | null,
  symbol: SymbolInfo,
): { stopLoss: number | null; takeProfit: number | null } {
  return {
    stopLoss: stopLoss ? resolveStop(side, 'stop-loss', stopLoss, entry, symbol) : null,
    takeProfit: takeProfit ? resolveStop(side, 'take-profit', takeProfit, entry, symbol) : null,
  };
}
