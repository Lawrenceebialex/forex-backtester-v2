import type { Statistics } from '@/domain/statistics';
import { formatDuration, formatMoney, formatPercent, formatSignedMoney } from './format';

export type MetricTone = 'bull' | 'bear' | 'neutral';

export interface MetricDef {
  id: string;
  label: string;
  /** One-line explanation shown on the dashboard. */
  hint: string;
  format: (stats: Statistics) => string;
  tone?: (stats: Statistics) => MetricTone;
  /** Number used to find the best strategy in the comparison table (null = not comparable). */
  rank?: (stats: Statistics) => number | null;
  better?: 'higher' | 'lower';
}

const DASH = '—';
const sign = (value: number | null): MetricTone => (value === null || value === 0 ? 'neutral' : value > 0 ? 'bull' : 'bear');

export const NET_PROFIT: MetricDef = {
  id: 'netProfit',
  label: 'Net profit',
  hint: 'Total profit after all losses and costs',
  format: (s) => (s.trades === 0 ? DASH : formatSignedMoney(s.netProfit)),
  tone: (s) => (s.trades === 0 ? 'neutral' : sign(s.netProfit)),
  rank: (s) => (s.trades === 0 ? null : s.netProfit),
  better: 'higher',
};

export const WIN_RATE: MetricDef = {
  id: 'winRate',
  label: 'Win rate',
  hint: 'Share of trades that closed in profit',
  format: (s) => (s.winRate === null ? DASH : formatPercent(s.winRate)),
  rank: (s) => s.winRate,
  better: 'higher',
};

export const PROFIT_FACTOR: MetricDef = {
  id: 'profitFactor',
  label: 'Profit factor',
  hint: 'Gross profit divided by gross loss',
  format: (s) => (s.profitFactor === null ? DASH : s.profitFactor === Infinity ? '∞' : s.profitFactor.toFixed(2)),
  tone: (s) => (s.profitFactor === null ? 'neutral' : s.profitFactor >= 1 ? 'bull' : 'bear'),
  rank: (s) => s.profitFactor,
  better: 'higher',
};

export const MAX_DRAWDOWN: MetricDef = {
  id: 'maxDrawdown',
  label: 'Max drawdown',
  hint: 'Largest fall from a balance peak',
  format: (s) => (s.trades === 0 ? DASH : `${formatMoney(s.maxDrawdown)} · ${formatPercent(s.maxDrawdownPercent)}`),
  tone: (s) => (s.maxDrawdownPercent >= 20 ? 'bear' : 'neutral'),
  rank: (s) => (s.trades === 0 ? null : s.maxDrawdownPercent),
  better: 'lower',
};

export const DETAIL_METRICS: readonly MetricDef[] = [
  {
    id: 'averageWin',
    label: 'Average win',
    hint: 'Mean profit of winning trades',
    format: (s) => (s.averageWin === null ? DASH : formatMoney(s.averageWin)),
    rank: (s) => s.averageWin,
    better: 'higher',
  },
  {
    id: 'averageLoss',
    label: 'Average loss',
    hint: 'Mean loss of losing trades',
    format: (s) => (s.averageLoss === null ? DASH : formatMoney(s.averageLoss)),
    rank: (s) => s.averageLoss,
    better: 'higher',
  },
  {
    id: 'expectancy',
    label: 'Expectancy',
    hint: 'Average profit per trade',
    format: (s) => (s.expectancy === null ? DASH : formatSignedMoney(s.expectancy)),
    tone: (s) => sign(s.expectancy),
    rank: (s) => s.expectancy,
    better: 'higher',
  },
  {
    id: 'averageR',
    label: 'Average R-multiple',
    hint: 'Average profit in units of risk (needs a stop loss)',
    format: (s) => (s.averageR === null ? DASH : `${s.averageR >= 0 ? '+' : ''}${s.averageR.toFixed(2)}R`),
    tone: (s) => sign(s.averageR),
    rank: (s) => s.averageR,
    better: 'higher',
  },
  {
    id: 'trades',
    label: 'Trades',
    hint: 'Number of closed trades',
    format: (s) => String(s.trades),
  },
  {
    id: 'longestWinStreak',
    label: 'Longest win streak',
    hint: 'Most winning trades in a row',
    format: (s) => String(s.longestWinStreak),
    rank: (s) => (s.trades === 0 ? null : s.longestWinStreak),
    better: 'higher',
  },
  {
    id: 'longestLossStreak',
    label: 'Longest loss streak',
    hint: 'Most losing trades in a row',
    format: (s) => String(s.longestLossStreak),
    rank: (s) => (s.trades === 0 ? null : s.longestLossStreak),
    better: 'lower',
  },
  {
    id: 'averageDuration',
    label: 'Avg. trade duration',
    hint: 'How long trades stay open on average',
    format: (s) => (s.averageDurationSeconds === null ? DASH : formatDuration(s.averageDurationSeconds)),
  },
  {
    id: 'bestTrade',
    label: 'Best trade',
    hint: 'Largest single profit',
    format: (s) => (s.bestTrade ? formatSignedMoney(s.bestTrade.pnl) : DASH),
    tone: (s) => sign(s.bestTrade?.pnl ?? null),
    rank: (s) => s.bestTrade?.pnl ?? null,
    better: 'higher',
  },
  {
    id: 'worstTrade',
    label: 'Worst trade',
    hint: 'Largest single loss',
    format: (s) => (s.worstTrade ? formatSignedMoney(s.worstTrade.pnl) : DASH),
    tone: (s) => sign(s.worstTrade?.pnl ?? null),
    rank: (s) => s.worstTrade?.pnl ?? null,
    better: 'higher',
  },
];

export const HERO_METRICS: readonly MetricDef[] = [NET_PROFIT, WIN_RATE, PROFIT_FACTOR, MAX_DRAWDOWN];
export const ALL_METRICS: readonly MetricDef[] = [...HERO_METRICS, ...DETAIL_METRICS];

export const TONE_CLASS: Record<MetricTone, string> = {
  bull: 'text-bull',
  bear: 'text-bear',
  neutral: 'text-ink',
};
