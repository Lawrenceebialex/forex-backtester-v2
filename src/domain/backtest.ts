import type { PairId } from '@/data/marketData';
import type { Timeframe } from '@/domain/market';

export type BacktestStatus = 'draft' | 'in_progress' | 'completed';

export interface BacktestConfig {
  name: string;
  instrument: PairId;
  timeframe: Timeframe;
  rangeFrom: string | number | null;
  rangeTo: string | number | null;
  initialBalance: number;
  currency: 'USD' | 'NGN';
  riskPerTradePercent: number;
  leverage: number;
  spreadPips: number;
  commissionPerLot: number;
  /** Optional — trades can run without a named strategy */
  strategyId: string;
}

export interface BacktestSession {
  id: string;
  config: BacktestConfig;
  status: BacktestStatus;
  createdAt: number;
  updatedAt: number;
  tradeCount: number;
  netPnl: number;
}

export function createSessionId(): string {
  return `bt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
