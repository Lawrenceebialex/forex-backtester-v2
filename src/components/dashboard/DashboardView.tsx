import { FlaskConical, FolderKanban, Target } from 'lucide-react';
import { useTradingStore } from '@/stores/tradingStore';
import { useStrategyStore } from '@/stores/strategyStore';
import { useUiStore } from '@/stores/uiStore';
import { formatMoney, formatPercent } from '@/lib/format';
import { SYMBOL } from '@/data/marketData';
import { computeStatistics } from '@/lib/statistics';

export function DashboardView() {
  const setView = useUiStore((s) => s.setView);
  const closed = useTradingStore((s) => s.closedTrades);
  const balance = useTradingStore((s) => s.balance);
  const strategies = useStrategyStore((s) => s.strategies.filter((x) => !x.archived));

  const stats = computeStatistics(closed, balance, SYMBOL);
  const pf = stats.profitFactor;
  const hasTrades = closed.length > 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 pb-24 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">Research workspace</p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-ink">Dashboard</h1>
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

      {!hasTrades ? (
        <div className="mt-10 rounded-lg border border-line bg-surface p-8 text-center">
          <p className="text-base font-semibold text-ink">Your testing workspace is ready</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
            Start a structured historical experiment. Configure the market and risk, replay candles without look-ahead,
            execute simulated trades, then review the numbers.
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
        <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Closed trades', value: String(stats.trades) },
            { label: 'Win rate', value: stats.winRate == null ? '—' : formatPercent(stats.winRate, 1) },
            { label: 'Profit factor', value: pf == null ? '—' : pf === Infinity ? '∞' : pf.toFixed(2) },
            { label: 'Net P/L', value: formatMoney(stats.netProfit) },
          ].map((m) => (
            <div key={m.label} className="rounded-lg border border-line bg-surface px-4 py-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-ink-subtle">{m.label}</p>
              <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-ink">{m.value}</p>
            </div>
          ))}
        </section>
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
            {strategies.length} active {strategies.length === 1 ? 'methodology' : 'methodologies'} tagged to trades.
          </p>
        </button>
      </section>
    </div>
  );
}
