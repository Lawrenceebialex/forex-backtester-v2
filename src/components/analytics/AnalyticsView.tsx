import { useMemo, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { SYMBOL } from '@/data/marketData';
import { generateInsights } from '@/lib/advice';
import { formatChartTime } from '@/lib/formatTime';
import { formatMoney, formatPercent } from '@/lib/format';
import { DETAIL_METRICS, HERO_METRICS } from '@/lib/metrics';
import { computeStatistics } from '@/lib/statistics';
import { byMonth, bySide, byWeekday, streakInfo } from '@/lib/tradeBreakdown';
import { InsightList } from '@/components/insights/InsightList';
import { MetricCard } from '@/components/performance/MetricCard';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Select } from '@/components/ui/Select';
import { SeriesChart } from '@/components/ui/SeriesChart';
import { useStrategyStore } from '@/stores/strategyStore';
import { useTradingStore } from '@/stores/tradingStore';
import { useUiStore } from '@/stores/uiStore';

const ALL = 'all';

export function AnalyticsView() {
  const trades = useTradingStore((s) => s.closedTrades);
  const initialBalance = useTradingStore((s) => s.settings.initialBalance);
  const strategies = useStrategyStore((s) => s.strategies);
  const activeId = useStrategyStore((s) => s.activeId);
  const setView = useUiStore((s) => s.setView);
  const [selected, setSelected] = useState(activeId);
  const scope = selected === ALL || strategies.some((s) => s.id === selected) ? selected : ALL;

  const scoped = useMemo(
    () => (scope === ALL ? trades : trades.filter((t) => t.strategyId === scope)),
    [trades, scope],
  );
  const stats = useMemo(() => computeStatistics(scoped, initialBalance, SYMBOL), [scoped, initialBalance]);
  const insights = useMemo(() => generateInsights(stats), [stats]);
  const sideBuckets = useMemo(() => bySide(scoped), [scoped]);
  const weekdayBuckets = useMemo(() => byWeekday(scoped), [scoped]);
  const monthBuckets = useMemo(() => byMonth(scoped), [scoped]);
  const streaks = useMemo(() => streakInfo(scoped), [scoped]);

  const equity = useMemo(
    () => [
      {
        id: 'equity',
        label: 'Balance',
        color: 'rgb(var(--accent))',
        points: stats.equityCurve.map((p) => ({ x: p.time, y: p.value })),
      },
    ],
    [stats],
  );
  const drawdown = useMemo(
    () => [
      {
        id: 'drawdown',
        label: 'Drawdown %',
        color: 'rgb(var(--bear))',
        points: stats.drawdownCurve.map((p) => ({ x: p.time, y: -p.percent })),
      },
    ],
    [stats],
  );

  const breakeven = scoped.filter((t) => t.pnl === 0).length;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 p-3 pb-24 md:space-y-5 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">Analytics</h1>
          <p className="text-sm text-ink-muted">
            Research report from closed trades only. Win rate is wins ÷ total trades (breakeven counts in the
            denominator).
          </p>
        </div>
        <Select label="Strategy" value={scope} onChange={setSelected} className="sm:w-64">
          <option value={ALL}>All strategies</option>
          {strategies.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
              {s.archived ? ' (archived)' : ''}
            </option>
          ))}
        </Select>
      </div>

      {stats.trades === 0 ? (
        <Card>
          <EmptyState
            icon={BarChart3}
            title="No closed trades yet"
            action={
              <button
                type="button"
                onClick={() => setView('workspace')}
                className="h-10 rounded-lg bg-accent px-4 text-sm font-medium text-accent-ink"
              >
                Open chart session
              </button>
            }
          >
            Statistics appear after you close simulated trades.
          </EmptyState>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {HERO_METRICS.map((m) => (
              <MetricCard key={m.id} metric={m} stats={stats} large />
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {DETAIL_METRICS.map((m) => (
              <MetricCard key={m.id} metric={m} stats={stats} />
            ))}
            <div className="rounded-lg border border-line bg-surface px-3 py-2">
              <p className="text-[11px] text-ink-subtle">Breakeven</p>
              <p className="font-mono text-sm font-semibold tabular-nums text-ink">{breakeven}</p>
            </div>
            <div className="rounded-lg border border-line bg-surface px-3 py-2">
              <p className="text-[11px] text-ink-subtle">Longest win streak</p>
              <p className="font-mono text-sm font-semibold tabular-nums text-ink">{streaks.longestWin}</p>
            </div>
            <div className="rounded-lg border border-line bg-surface px-3 py-2">
              <p className="text-[11px] text-ink-subtle">Longest loss streak</p>
              <p className="font-mono text-sm font-semibold tabular-nums text-ink">{streaks.longestLoss}</p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Equity curve">
              <SeriesChart
                series={equity}
                baseline={initialBalance}
                area
                ariaLabel="Account balance after each closed trade"
                yFormat={formatMoney}
                xFormat={formatChartTime}
              />
            </Card>
            <Card title="Drawdown (%)">
              <SeriesChart
                series={drawdown}
                baseline={0}
                area
                ariaLabel="Percentage drawdown from peak"
                yFormat={(v) => `${v.toFixed(1)}%`}
                xFormat={formatChartTime}
              />
              <p className="mt-2 text-[11px] text-ink-subtle">
                Max drawdown: {formatMoney(stats.maxDrawdown)} ({stats.maxDrawdownPercent.toFixed(1)}% of peak equity).
              </p>
            </Card>
          </div>

          {scoped.length >= 5 ? (
            <>
              <BreakdownTable title="Long vs short" rows={sideBuckets} />
              <BreakdownTable title="By weekday (exit, UTC)" rows={weekdayBuckets} />
              <BreakdownTable title="Monthly performance" rows={monthBuckets} />
            </>
          ) : (
            <p className="text-xs text-ink-subtle">
              Distribution tables appear after at least 5 closed trades in this scope (sample-size guard).
            </p>
          )}

          <InsightList insights={insights} />
        </>
      )}
    </div>
  );
}

function BreakdownTable({
  title,
  rows,
}: {
  title: string;
  rows: {
    key: string;
    trades: number;
    wins: number;
    losses: number;
    netPnl: number;
    winRate: number | null;
    avgR: number | null;
  }[];
}) {
  if (rows.length === 0) return null;
  return (
    <Card title={title}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-xs">
          <thead className="text-ink-subtle">
            <tr>
              <th className="py-1.5 font-medium">Bucket</th>
              <th className="py-1.5 font-medium">Trades</th>
              <th className="py-1.5 font-medium">W / L</th>
              <th className="py-1.5 font-medium">Win rate</th>
              <th className="py-1.5 font-medium">Net</th>
              <th className="py-1.5 font-medium">Avg R</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-t border-line/70">
                <td className="py-1.5 text-ink">{r.key}</td>
                <td className="py-1.5 font-mono tabular-nums">{r.trades}</td>
                <td className="py-1.5 font-mono tabular-nums">
                  {r.wins} / {r.losses}
                </td>
                <td className="py-1.5 font-mono tabular-nums">
                  {r.winRate == null ? '—' : formatPercent(r.winRate, 1)}
                </td>
                <td className="py-1.5 font-mono tabular-nums">{formatMoney(r.netPnl)}</td>
                <td className="py-1.5 font-mono tabular-nums">{r.avgR == null ? '—' : r.avgR.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
