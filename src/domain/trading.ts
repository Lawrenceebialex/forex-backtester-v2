import type { UnixSeconds } from './market';

export type Side = 'buy' | 'sell';

/** Market fills now; limit/stop wait for price. */
export type OrderType = 'market' | 'limit' | 'stop';

/** A stop-loss / take-profit entered either as an absolute price or as a distance in pips. */
export type StopUnit = 'price' | 'pips';
export interface StopInput {
  unit: StopUnit;
  value: number;
}

export interface OrderRequest {
  side: Side;
  lots: number;
  stopLoss: StopInput | null;
  takeProfit: StopInput | null;
  /** Defaults to market. */
  orderType?: OrderType;
  /** Required for limit / stop. Absolute price. */
  limitPrice?: number | null;
}

export type OrderResult =
  | { ok: true; position: Position }
  | { ok: true; pending: PendingOrder }
  | { ok: false; error: string };

export interface Position {
  id: string;
  /** Human-friendly sequence number within the session (#1, #2 …). */
  number: number;
  side: Side;
  lots: number;
  entryPrice: number;
  entryTime: UnixSeconds;
  stopLoss: number | null;
  takeProfit: number | null;
  /** The strategy that was active when the trade was opened. */
  strategyId: string;
}

/** Working order that has not filled yet (MT5 pending). */
export interface PendingOrder {
  id: string;
  number: number;
  side: Side;
  /** limit = fill when price is favourable; stop = fill when price breaks through. */
  orderType: 'limit' | 'stop';
  lots: number;
  /** Trigger / limit price. */
  price: number;
  stopLoss: number | null;
  takeProfit: number | null;
  createdAt: UnixSeconds;
  strategyId: string;
}

export type CloseReason = 'manual' | 'stop-loss' | 'take-profit';

export interface ClosedTrade extends Position {
  exitPrice: number;
  exitTime: UnixSeconds;
  reason: CloseReason;
  pips: number;
  /** Realised profit / loss in account currency (USD). */
  pnl: number;
}

/** Charts show BID prices; the ask is the bid plus the spread. */
export interface Quote {
  bid: number;
  ask: number;
  spreadPips: number;
}

export interface AccountSnapshot {
  equity: number;
  floatingPnl: number;
  usedMargin: number;
  freeMargin: number;
}

export interface TradingSettings {
  /** Base spread in pips. */
  spreadPips: number;
  /** Widen the spread in Asian hours and at rollover, with small per-minute variation. */
  variableSpread: boolean;
  /** Balance the account starts from (applied on "Reset account"). */
  initialBalance: number;
  /** Leverage as N in 1:N. */
  leverage: number;
  /** Patience training: P&L and equity numbers glide to their new values instead of jumping. */
  gradualOutcome: boolean;
  /** How long the glide takes. */
  gradualSeconds: number;
}

export const DEFAULT_TRADING_SETTINGS: TradingSettings = {
  spreadPips: 1.0,
  variableSpread: true,
  initialBalance: 10_000,
  leverage: 100,
  gradualOutcome: false,
  gradualSeconds: 6,
};

export const GRADUAL_SECONDS_OPTIONS = [3, 6, 10, 15] as const;

export const SPREAD_LIMITS = { min: 0, max: 10, step: 0.1 } as const;
export const LOT_LIMITS = { min: 0.01, max: 100, step: 0.01 } as const;

export const BALANCE_LIMITS = { min: 100, max: 10_000_000, step: 1_000 } as const;
export const LEVERAGE_OPTIONS = [10, 20, 30, 50, 100, 200, 500] as const;

const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const isLevel = (value: unknown): value is number | null => value === null || isNumber(value);

/** Runtime checks used when restoring saved data, so a corrupted save can't crash the app. */
export function isPosition(value: unknown): value is Position {
  const v = value as Partial<Position> | null;
  return (
    typeof v === 'object' && v !== null &&
    typeof v.id === 'string' && isNumber(v.number) && (v.side === 'buy' || v.side === 'sell') &&
    isNumber(v.lots) && isNumber(v.entryPrice) && isNumber(v.entryTime) &&
    isLevel(v.stopLoss) && isLevel(v.takeProfit) && typeof v.strategyId === 'string'
  );
}

export function isPendingOrder(value: unknown): value is PendingOrder {
  const v = value as Partial<PendingOrder> | null;
  return (
    typeof v === 'object' && v !== null &&
    typeof v.id === 'string' && isNumber(v.number) && (v.side === 'buy' || v.side === 'sell') &&
    (v.orderType === 'limit' || v.orderType === 'stop') &&
    isNumber(v.lots) && isNumber(v.price) && isNumber(v.createdAt) &&
    isLevel(v.stopLoss) && isLevel(v.takeProfit) && typeof v.strategyId === 'string'
  );
}

export function isClosedTrade(value: unknown): value is ClosedTrade {
  const v = value as Partial<ClosedTrade> | null;
  return (
    isPosition(value) && v !== null &&
    isNumber(v.exitPrice) && isNumber(v.exitTime) && isNumber(v.pips) && isNumber(v.pnl) &&
    (v.reason === 'manual' || v.reason === 'stop-loss' || v.reason === 'take-profit')
  );
}
