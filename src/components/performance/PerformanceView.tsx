import { useMemo, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { SYMBOL } from '@/data/marketData';
import { computeStatistics } from '@/lib/statistics';
import { generateInsights } from '@/lib/advice';
import { formatChartTime } from '@/lib/formatTime';
import { formatMoney } from '@/lib/format';
import { DETAIL_METRICS, HERO_METRICS } from '@/lib/metrics';
import { useStrategyStore } from '@/stores/strategyStore';
import { useTradingStore } from '@/stores/tradingStore';
import { useUiStore } from '@/stores/uiStore';
import { InsightList } from '@/components/insights/InsightList';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Select } from '@/components/ui/Select';
import { SeriesChart } from '@/components/ui/SeriesChart';
import { MetricCard } from './MetricCard';

const ALL = 'all';

export function PerformanceView() {
  const trades = useTradingStore((state) => state.closedTrades);
  const initialBalance = useTradingStore((state) => state.settings.initialBalance);
  const strategies = useStrategyStore((state) => state.strategies);
  const activeId = useStrategyStore((state) => state.activeId);
  const setView = useUiStore((state) => state.setView);

  const [selected, setSelected] = useState<string>(activeId);
  const scope = selected === ALL || strategies.some((strategy) => strategy.id === selected) ? selected : ALL;

  const scopedTrades = useMemo(
    () => (scope === ALL ? trades : trades.filter((trade) => trade.strategyId === scope)),
    [trades, scope],
  );
  const stats = useMemo(() => computeStatistics(scopedTrades, initialBalance, SYMBOL), [scopedTrades, initialBalance]);
  const insights = useMemo(() => generateInsights(stats), [stats]);

  const equity = useMemo(
    () => [{ id: 'equity', label: 'Balance', color: 'rgb(var(--accent))', points: stats.equityCurve.map((p) => ({ x: p.time, y: p.value })) }],
    [stats],
  );
  const drawdown = useMemo(
    () => [{ id: 'drawdown', label: 'Drawdown', color: 'rgb(var(--bear))', points: stats.drawdownCurve.map((p) => ({ x: p.time, y: -p.percent })) }],
    [stats],
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 p-3 md:space-y-5 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">Performance</h1>
          <p className="text-sm text-ink-muted">Calculated from your closed trades.</p>
        </div>
        <Select label="Strategy" value={scope} onChange={setSelected} className="sm:w-64">
          <option value={ALL}>All strategies</option>
          {strategies.map((strategy) => (
            <option key={strategy.id} value={strategy.id}>
              {strategy.name}
              {strategy.archived ? ' (archived)' : ''}
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
                className="h-10 rounded-lg bg-accent px-4 text-sm font-medium text-accent-ink transition hover:brightness-110"
              >
                Open chart session
              </button>
            }
          >
            Open and close a trade{scope === ALL ? '' : ' with this strategy'} and your statistics, equity curve and insights will appear here.
          </EmptyState>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {HERO_METRICS.map((metric) => (
              <MetricCard key={metric.id} metric={metric} stats={stats} large />
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {DETAIL_METRICS.map((metric) => (
              <MetricCard key={metric.id} metric={metric} stats={stats} />
            ))}
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
            <Card title="Drawdown">
              <SeriesChart
                series={drawdown}
                baseline={0}
                area
                ariaLabel="Drawdown from the balance peak after each closed trade"
                yFormat={(value) => `${value.toFixed(1)}%`}
                xFormat={formatChartTime}
              />
            </Card>
          </div>

          <InsightList insights={insights} />
        </>
      )}
    </div>
  );
}
