import { useMemo, useState } from 'react';
import { GitCompare } from 'lucide-react';
import { SYMBOL } from '@/data/marketData';
import { cn } from '@/lib/cn';
import { formatChartTime } from '@/lib/formatTime';
import { formatMoney } from '@/lib/format';
import { ALL_METRICS, TONE_CLASS, type MetricDef } from '@/lib/metrics';
import { computeStatistics } from '@/lib/statistics';
import { useStrategyStore } from '@/stores/strategyStore';
import { useTradingStore } from '@/stores/tradingStore';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { SeriesChart } from '@/components/ui/SeriesChart';
import { Switch } from '@/components/ui/Switch';

export function ComparisonView() {
  const trades = useTradingStore((state) => state.closedTrades);
  const initialBalance = useTradingStore((state) => state.settings.initialBalance);
  const strategies = useStrategyStore((state) => state.strategies);

  // Archived strategies stay selectable, so past work can still be compared.
  const [picked, setPicked] = useState<string[] | null>(null);
  const [overlay, setOverlay] = useState(true);

  const withTrades = useMemo(() => new Set(trades.map((trade) => trade.strategyId)), [trades]);
  const defaultSelection = useMemo(
    () => strategies.filter((s) => !s.archived && withTrades.has(s.id)).map((s) => s.id),
    [strategies, withTrades],
  );
  const selectedIds = (picked ?? defaultSelection).filter((id) => strategies.some((s) => s.id === id));
  const selectionKey = selectedIds.join(',');

  const columns = useMemo(
    () =>
      strategies
        .filter((strategy) => selectionKey.split(',').includes(strategy.id))
        .map((strategy) => ({
          strategy,
          stats: computeStatistics(trades.filter((trade) => trade.strategyId === strategy.id), initialBalance, SYMBOL),
        })),
    [strategies, trades, initialBalance, selectionKey],
  );

  const toggle = (id: string) =>
    setPicked(selectedIds.includes(id) ? selectedIds.filter((candidate) => candidate !== id) : [...selectedIds, id]);

  /** Ids of the best column for a metric (needs at least two comparable values). */
  const bestFor = (metric: MetricDef): Set<string> => {
    const { rank, better } = metric;
    if (!rank || !better) return new Set();
    const scored = columns
      .map(({ strategy, stats }) => ({ id: strategy.id, value: rank(stats) }))
      .filter((entry): entry is { id: string; value: number } => entry.value !== null);
    if (scored.length < 2) return new Set();
    const best = scored.reduce((a, b) => ((better === 'higher' ? b.value > a.value : b.value < a.value) ? b : a));
    return new Set(scored.filter((entry) => entry.value === best.value).map((entry) => entry.id));
  };

  const series = columns
    .filter(({ stats }) => stats.equityCurve.length > 0)
    .map(({ strategy, stats }) => ({
      id: strategy.id,
      label: strategy.name,
      color: strategy.color,
      points: stats.equityCurve.map((p) => ({ x: p.time, y: p.value })),
    }));

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 p-3 md:space-y-5 md:p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">Comparison</h1>
        <p className="text-sm text-ink-muted">Pick strategies to see them side by side.</p>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Strategies to compare">
        {strategies.map((strategy) => {
          const on = selectedIds.includes(strategy.id);
          return (
            <button
              key={strategy.id}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(strategy.id)}
              className={cn(
                'inline-flex h-9 items-center gap-2 rounded-full border px-3 text-sm transition-colors coarse:h-11',
                on ? 'border-accent bg-accent/10 text-ink' : 'border-line bg-surface text-ink-muted hover:text-ink',
              )}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: strategy.color }} />
              {strategy.name}
              {strategy.archived && <span className="text-[10px] uppercase text-ink-subtle">archived</span>}
              {!withTrades.has(strategy.id) && <span className="text-[10px] text-ink-subtle">no trades</span>}
            </button>
          );
        })}
      </div>

      {columns.length === 0 ? (
        <Card>
          <EmptyState icon={GitCompare} title="Choose strategies to compare">
            Select two or more strategies above. Trade with different strategies on the chart and they will appear here.
          </EmptyState>
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-line">
                    <th className="sticky left-0 z-10 bg-surface px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-ink-subtle">Metric</th>
                    {columns.map(({ strategy }) => (
                      <th key={strategy.id} className="px-4 py-3 text-right font-semibold text-ink">
                        <span className="inline-flex items-center gap-2">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: strategy.color }} />
                          <span className="max-w-[10rem] truncate">{strategy.name}</span>
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ALL_METRICS.map((metric) => {
                    const best = bestFor(metric);
                    return (
                      <tr key={metric.id} className="border-b border-line last:border-b-0">
                        <th scope="row" className="sticky left-0 z-10 bg-surface px-4 py-2.5 text-left font-normal text-ink-muted" title={metric.hint}>
                          {metric.label}
                        </th>
                        {columns.map(({ strategy, stats }) => (
                          <td
                            key={strategy.id}
                            className={cn(
                              'px-4 py-2.5 text-right font-mono tabular-nums',
                              TONE_CLASS[metric.tone?.(stats) ?? 'neutral'],
                              best.has(strategy.id) && 'bg-bull/10 font-semibold',
                            )}
                          >
                            {metric.format(stats)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="border-t border-line px-4 py-2.5 text-xs text-ink-subtle">Highlighted cells show the best value in each row.</p>
          </Card>

          <Card
            title="Equity curves"
            action={
              <label className="flex items-center gap-2 text-sm text-ink-muted">
                Overlay
                <Switch label="Overlay equity curves" checked={overlay} onChange={setOverlay} />
              </label>
            }
          >
            {series.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-muted">None of the selected strategies have closed trades yet.</p>
            ) : overlay ? (
              <SeriesChart series={series} baseline={initialBalance} ariaLabel="Balance after each closed trade, per strategy" yFormat={formatMoney} xFormat={formatChartTime} />
            ) : (
              <div className="grid gap-5 lg:grid-cols-2">
                {series.map((one) => (
                  <SeriesChart key={one.id} series={[one]} baseline={initialBalance} height={180} ariaLabel={`Balance after each closed trade for ${one.label}`} yFormat={formatMoney} xFormat={formatChartTime} />
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
