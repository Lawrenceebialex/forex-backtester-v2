import { FlaskConical, FolderKanban, Target } from 'lucide-react';
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
  const strategies = useStrategyStore((s) => s.strategies.filter((x) => !x.archived));
  const sessions = useBacktestStore((s) => s.sessions);
  const setActive = useBacktestStore((s) => s.setActive);

  const stats = computeStatistics(closed, balance, SYMBOL);
  const hasActivity = closed.length > 0 || sessions.length > 0;
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const bestStrategy = (() => {
    if (closed.length === 0) return null;
    let best: { name: string; net: number } | null = null;
    for (const s of strategies) {
      const scoped = closed.filter((t) => t.strategyId === s.id);
      if (scoped.length === 0) continue;
      const st = computeStatistics(scoped, balance, SYMBOL);
      if (!best || st.netProfit > best.net) best = { name: s.name, net: st.netProfit };
    }
    return best;
  })();

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 pb-24 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">{today}</p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-ink">Welcome back, {displayName}</h1>
          <p className="mt-1 max-w-xl text-sm text-ink-muted">
            Test strategies on historical data, record decisions, then measure what actually worked.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setView('new-backtest')}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-accent px-4 text-sm font-medium text-accent-ink hover:brightness-110"
        >
          <FlaskConical size={16} />
          New Backtest
        </button>
      </header>

      {!hasActivity ? (
        <div className="mt-10 rounded-lg border border-line bg-surface p-8 text-center">
          <p className="text-base font-semibold text-ink">Your testing workspace is ready</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
            Start your first backtest to begin measuring your strategy&apos;s performance. Configure the market and
            risk, replay without look-ahead, then review real results.
          </p>
          <button
            type="button"
            onClick={() => setView('new-backtest')}
            className="mt-5 inline-flex h-10 items-center gap-2 rounded-md bg-accent px-4 text-sm font-medium text-accent-ink hover:brightness-110"
          >
            <FlaskConical size={16} />
            Start your first backtest
          </button>
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
            <section className="mt-10">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-ink">Recent backtests</h2>
                <button
                  type="button"
                  onClick={() => setView('backtests')}
                  className="text-xs font-medium text-accent hover:underline"
                >
                  View all
                </button>
              </div>
              <ul className="space-y-2">
                {sessions.slice(0, 5).map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setActive(s.id);
                        setView(s.status === 'completed' ? 'analytics' : 'workspace');
                      }}
                      className="flex w-full flex-col gap-1 rounded-lg border border-line bg-surface px-4 py-3 text-left transition hover:bg-raised sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">{s.config.name}</p>
                        <p className="text-xs text-ink-muted">
                          {s.config.instrument} · {s.config.timeframe} · {statusLabel(s.status)}
                        </p>
                      </div>
                      <div className="text-xs text-ink-subtle sm:text-right">
                        <p className="font-mono tabular-nums text-ink">{formatMoney(s.netPnl)}</p>
                        <p>{s.tradeCount} trades</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <section className="mt-10 grid gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => setView('new-backtest')}
          className="rounded-lg border border-line bg-surface p-4 text-left transition hover:border-line-strong hover:bg-raised"
        >
          <FlaskConical size={18} className="text-accent" />
          <p className="mt-3 text-sm font-semibold text-ink">Configure a backtest</p>
          <p className="mt-1 text-xs text-ink-muted">Market, period, account risk, then open the workspace.</p>
        </button>
        <button
          type="button"
          onClick={() => setView('backtests')}
          className="rounded-lg border border-line bg-surface p-4 text-left transition hover:border-line-strong hover:bg-raised"
        >
          <FolderKanban size={18} className="text-accent" />
          <p className="mt-3 text-sm font-semibold text-ink">My Backtests</p>
          <p className="mt-1 text-xs text-ink-muted">Resume or review experiments on this device.</p>
        </button>
        <button
          type="button"
          onClick={() => setView('strategies')}
          className="rounded-lg border border-line bg-surface p-4 text-left transition hover:border-line-strong hover:bg-raised"
        >
          <Target size={18} className="text-accent" />
          <p className="mt-3 text-sm font-semibold text-ink">Strategies</p>
          <p className="mt-1 text-xs text-ink-muted">
            {strategies.length} active {strategies.length === 1 ? 'methodology' : 'methodologies'}.
          </p>
        </button>
      </section>
    </div>
  );
}
