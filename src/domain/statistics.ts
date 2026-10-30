import type { UnixSeconds } from './market';
import type { ClosedTrade } from './trading';

export interface CurvePoint {
  time: UnixSeconds;
  value: number;
}

export interface DrawdownPoint {
  time: UnixSeconds;
  /** Peak-to-current fall in account currency (≥ 0). */
  amount: number;
  /** The same fall as a percentage of the peak (≥ 0). */
  percent: number;
}

/** Everything is derived from closed trades only (open positions are not counted). */
export interface Statistics {
  trades: number;
  wins: number;
  losses: number;
  breakeven: number;
  netProfit: number;
  grossProfit: number;
  /** Negative number. */
  grossLoss: number;
  returnPercent: number;
  /** Percentage of trades that closed in profit, or null with no trades. */
  winRate: number | null;
  /** Gross profit ÷ gross loss. Infinity when there are no losses; null with no profit and no loss. */
  profitFactor: number | null;
  averageWin: number | null;
  /** Negative number. */
  averageLoss: number | null;
  /** Average profit per trade. */
  expectancy: number | null;
  /** Average profit expressed in units of the initial risk (distance to stop loss). */
  averageR: number | null;
  /** Number of trades that had a stop loss and so have an R-multiple. */
  ratedTrades: number;
  longestWinStreak: number;
  longestLossStreak: number;
  averageDurationSeconds: number | null;
  bestTrade: ClosedTrade | null;
  worstTrade: ClosedTrade | null;
  /** Largest fall of the closed-trade balance from a peak, in currency. */
  maxDrawdown: number;
  /** Largest fall as a percentage of the peak. */
  maxDrawdownPercent: number;
  equityCurve: CurvePoint[];
  drawdownCurve: DrawdownPoint[];
}
