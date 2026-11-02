import { useMemo } from 'react';
import { FlaskConical } from 'lucide-react';
import { SYMBOL } from '@/data/marketData';
import { computeStatistics } from '@/lib/statistics';
import { formatMoney, formatPercent } from '@/lib/format';
import { useAuthStore } from '@/stores/authStore';
import { statusLabel, useBacktestStore } from '@/stores/backtestStore';
import { useStrategyStore } from '@/stores/strategyStore';
import { useTradingStore } from '@/stores/tradingStore';
import { useUiStore } from '@/stores/uiStore';

export function DashboardView() {
  const setView = useUiStore((s) => s.setView);
  const displayName = useAuthStore((s) => s.user?.displayName ?? 'trader');
  const closed = useTradingStore((s) => s.closedTrades);
  const balance = useTradingStore((s) => s.balance);
  // Never filter inside a Zustand selector — causes React #185.
  const allStrategies = useStrategyStore((s) => s.strategies);
  const strategies = useMemo(() => allStrategies.filter((x) => !x.archived), [allStrategies]);
  const sessions = useBacktestStore((s) => s.sessions);
  const setActive = useBacktestStore((s) => s.setActive);

  const stats = useMemo(() => computeStatistics(closed, balance, SYMBOL), [closed, balance]);
  const hasActivity = closed.length > 0 || sessions.length > 0;
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const bestStrategy = useMemo(() => {
    if (closed.length === 0) return null;
    let best: { name: string; net: number } | null = null;
    for (const s of strategies) {
      const scoped = closed.filter((t) => t.strategyId === s.id);
      if (scoped.length === 0) continue;
      const st = computeStatistics(scoped, balance, SYMBOL);
      if (!best || st.netProfit > best.net) best = { name: s.name, net: st.netProfit };
    }
    return best;
  }, [closed, balance, strategies]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 pb-24 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">{today}</p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-ink">
            {displayName}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setView('workspace')}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-line px-4 text-sm font-medium text-ink hover:bg-overlay"
          >
            Open chart
          </button>
          <button
            type="button"
            onClick={() => setView('new-backtest')}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-accent px-4 text-sm font-medium text-accent-ink hover:brightness-110"
          >
            <FlaskConical size={16} />
            New Backtest
          </button>
        </div>
      </header>

      {!hasActivity ? (
        <div className="mt-10 rounded-lg border border-line bg-surface p-8 text-center">
          <p className="text-base font-semibold text-ink">No backtests yet</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink-muted">
            Open the chart freely, or start a backtest with your own balance and risk settings.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => setView('workspace')}
              className="inline-flex h-10 items-center rounded-md border border-line px-4 text-sm font-medium text-ink hover:bg-overlay"
            >
              Open chart
            </button>
            <button
              type="button"
              onClick={() => setView('new-backtest')}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-accent px-4 text-sm font-medium text-accent-ink hover:brightness-110"
            >
              <FlaskConical size={16} />
              New Backtest
            </button>
          </div>
        </div>
      ) : (
        <>
          <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { label: 'Backtests', value: String(sessions.length) },
              { label: 'Total trades', value: String(stats.trades) },
              {
                label: 'Win rate',
                value: stats.winRate == null ? '—' : formatPercent(stats.winRate, 1),
              },
              {
                label: 'Profit factor',
                value:
                  stats.profitFactor == null
                    ? '—'
                    : stats.profitFactor === Infinity
                      ? '∞'
                      : stats.profitFactor.toFixed(2),
              },
              {
                label: 'Best strategy',
                value: bestStrategy ? bestStrategy.name : '—',
              },
            ].map((m) => (
              <div key={m.label} className="rounded-lg border border-line bg-surface px-4 py-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-ink-subtle">{m.label}</p>
                <p className="mt-1 truncate font-mono text-base font-semibold tabular-nums text-ink">{m.value}</p>
              </div>
            ))}
          </section>

          {sessions.length > 0 && (
            <section className="mt-8">
              <h2 className="text-sm font-semibold text-ink">Recent backtests</h2>
              <ul className="mt-3 space-y-2">
                {sessions.slice(0, 8).map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setActive(s.id);
                        setView('workspace');
                      }}
                      className="flex w-full items-center justify-between rounded-lg border border-line bg-surface px-4 py-3 text-left hover:bg-overlay"
                    >
                      <span>
                        <span className="block text-sm font-medium text-ink">{s.config.name}</span>
                        <span className="text-xs text-ink-muted">
                          {s.config.instrument} · {statusLabel(s.status)}
                        </span>
                      </span>
                      <span className="font-mono text-sm tabular-nums text-ink">
                        {formatMoney(s.netPnl)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
