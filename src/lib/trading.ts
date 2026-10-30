import type { Candle, SymbolInfo, UnixSeconds } from '@/domain/market';
import {
  LOT_LIMITS,
  type AccountSnapshot,
  type ClosedTrade,
  type CloseReason,
  type Position,
  type Quote,
  type Side,
  type StopInput,
} from '@/domain/trading';
import { formatMoney } from './format';
import { roundTo } from './math';

/**
 * Trading maths
 * ─────────────
 * Chart candles are BID prices. Buys fill at the ask, sells at the bid; a buy closes at the
 * bid and a sell closes at the ask, so every round trip costs the spread.
 * Money figures are in USD and assume a USD-quoted pair (EURUSD); other pairs need a
 * quote→USD conversion, which is isolated in `moneyFromMove`.
 */

export const roundMoney = (value: number) => roundTo(value, 2);
export const normalizeLots = (lots: number) => roundTo(lots, 2);

/**
 * Deterministic "realistic" spread for a given minute: wider in the Asian session and at
 * rollover, with ±20% variation. With a 1.0 pip base this gives ~0.8–1.2 pips in the
 * London / New York day. The same minute always yields the same spread.
 */
export function spreadPipsAt(time: UnixSeconds, basePips: number, variable: boolean): number {
  if (!variable) return basePips;
  const hour = Math.floor((time % 86_400) / 3_600);
  const session = hour >= 21 ? 1.8 : hour < 7 ? 1.25 : 1;
  const hash = Math.imul(Math.floor(time / 60) | 0, 2654435761) >>> 0;
  const jitter = ((hash >>> 8) % 1000) / 500 - 1; // -1 … 1
  return roundTo(Math.max(0, basePips * session * (1 + 0.2 * jitter)), 1);
}

export function makeQuote(bid: number, spreadPips: number, symbol: SymbolInfo): Quote {
  return { bid, ask: roundTo(bid + spreadPips * symbol.pipSize, symbol.pricePrecision), spreadPips };
}

export const fillPrice = (side: Side, quote: Quote) => (side === 'buy' ? quote.ask : quote.bid);
export const closePrice = (side: Side, quote: Quote) => (side === 'buy' ? quote.bid : quote.ask);

/** Price move in the trade's favour (positive = profit). */
export const favourableMove = (side: Side, entry: number, exit: number) =>
  side === 'buy' ? exit - entry : entry - exit;

export const toPips = (move: number, symbol: SymbolInfo) => move / symbol.pipSize;
export const moneyFromMove = (move: number, lots: number, symbol: SymbolInfo) =>
  move * lots * symbol.contractSize;
export const pipValue = (lots: number, symbol: SymbolInfo) => lots * symbol.contractSize * symbol.pipSize;
export const marginFor = (lots: number, price: number, symbol: SymbolInfo, leverage: number) =>
  (lots * symbol.contractSize * price) / leverage;

export function floatingResult(position: Position, quote: Quote, symbol: SymbolInfo) {
  const move = favourableMove(position.side, position.entryPrice, closePrice(position.side, quote));
  return { pips: toPips(move, symbol), pnl: moneyFromMove(move, position.lots, symbol) };
}

export function computeAccount(
  balance: number,
  positions: readonly Position[],
  quote: Quote,
  symbol: SymbolInfo,
  leverage: number,
): AccountSnapshot {
  let floatingPnl = 0;
  let usedMargin = 0;
  for (const position of positions) {
    floatingPnl += floatingResult(position, quote, symbol).pnl;
    usedMargin += marginFor(position.lots, position.entryPrice, symbol, leverage);
  }
  const equity = balance + floatingPnl;
  return {
    equity: roundMoney(equity),
    floatingPnl: roundMoney(floatingPnl),
    usedMargin: roundMoney(usedMargin),
    freeMargin: roundMoney(equity - usedMargin),
  };
}

/** Turns a stop entered as price or pips into an absolute price for the given side. */
export function resolveStop(
  side: Side,
  kind: 'stop-loss' | 'take-profit',
  input: StopInput,
  entry: number,
  symbol: SymbolInfo,
): number {
  if (input.unit === 'price') return roundTo(input.value, symbol.pricePrecision);
  const distance = input.value * symbol.pipSize;
  // Buy: SL below / TP above. Sell: SL above / TP below.
  const below = (side === 'buy') === (kind === 'stop-loss');
  return roundTo(below ? entry - distance : entry + distance, symbol.pricePrecision);
}

export interface ResolvedOrder {
  side: Side;
  lots: number;
  stopLoss: number | null;
  takeProfit: number | null;
}

export interface OrderContext {
  quote: Quote;
  freeMargin: number;
  symbol: SymbolInfo;
  leverage: number;
}

/** Returns a user-facing message when the order must be rejected, otherwise null. */
export function validateOrder(order: ResolvedOrder, context: OrderContext): string | null {
  const { side, lots, stopLoss, takeProfit } = order;
  const { quote, symbol } = context;
  const show = (price: number) => price.toFixed(symbol.pricePrecision);

  if (!Number.isFinite(lots) || lots < LOT_LIMITS.min || lots > LOT_LIMITS.max) {
    return `Lot size must be between ${LOT_LIMITS.min.toFixed(2)} and ${LOT_LIMITS.max}.`;
  }

  // A position's stops are measured against the price it would close at.
  const reference = closePrice(side, quote);
  const referenceName = side === 'buy' ? 'bid' : 'ask';

  if (stopLoss !== null) {
    if (!(stopLoss > 0)) return 'Stop loss must be a positive price.';
    const valid = side === 'buy' ? stopLoss < reference : stopLoss > reference;
    if (!valid) {
      return `Stop loss must be ${side === 'buy' ? 'below' : 'above'} the current ${referenceName} (${show(reference)}).`;
    }
  }
  if (takeProfit !== null) {
    if (!(takeProfit > 0)) return 'Take profit must be a positive price.';
    const valid = side === 'buy' ? takeProfit > reference : takeProfit < reference;
    if (!valid) {
      return `Take profit must be ${side === 'buy' ? 'above' : 'below'} the current ${referenceName} (${show(reference)}).`;
    }
  }

  const required = marginFor(lots, fillPrice(side, quote), symbol, context.leverage);
  if (required > context.freeMargin) {
    return `Not enough free margin: this order needs ${formatMoney(required)}, you have ${formatMoney(Math.max(0, context.freeMargin))}.`;
  }
  return null;
}

export function buildClosedTrade(
  position: Position,
  exitPrice: number,
  exitTime: UnixSeconds,
  reason: CloseReason,
  symbol: SymbolInfo,
): ClosedTrade {
  const move = favourableMove(position.side, position.entryPrice, exitPrice);
  return {
    ...position,
    exitPrice,
    exitTime,
    reason,
    pips: roundTo(toPips(move, symbol), 1),
    pnl: roundMoney(moneyFromMove(move, position.lots, symbol)),
  };
}

/**
 * Did this candle touch the position's stop-loss or take-profit?
 * Sells exit at the ask, so their prices are the candle's bid range shifted up by the spread.
 * If one candle touches both levels we cannot know the order, so the stop-loss wins (pessimistic).
 */
function stopTouched(position: Position, candle: Candle, askOffset: number) {
  const isBuy = position.side === 'buy';
  const low = isBuy ? candle.low : candle.low + askOffset;
  const high = isBuy ? candle.high : candle.high + askOffset;
  const { stopLoss, takeProfit } = position;

  if (stopLoss !== null && (isBuy ? low <= stopLoss : high >= stopLoss)) {
    return { price: stopLoss, reason: 'stop-loss' as const };
  }
  if (takeProfit !== null && (isBuy ? high >= takeProfit : low <= takeProfit)) {
    return { price: takeProfit, reason: 'take-profit' as const };
  }
  return null;
}

/**
 * Replays newly revealed M1 candles, in order, against the open positions.
 * Stops fill at their level (no slippage or gap modelling).
 */
export function settleCandles(
  positions: readonly Position[],
  candles: readonly Candle[],
  symbol: SymbolInfo,
  spreadPipsFor: (candle: Candle) => number,
): { open: Position[]; closed: ClosedTrade[] } {
  let open = [...positions];
  const closed: ClosedTrade[] = [];

  for (const candle of candles) {
    if (open.length === 0) break;
    const askOffset = spreadPipsFor(candle) * symbol.pipSize;
    open = open.filter((position) => {
      // Candles at or before the entry happened before this trade existed (e.g. after rewinding).
      if (candle.time <= position.entryTime) return true;
      const hit = stopTouched(position, candle, askOffset);
      if (!hit) return true;
      closed.push(buildClosedTrade(position, hit.price, candle.time, hit.reason, symbol));
      return false;
    });
  }
  return { open, closed };
}
