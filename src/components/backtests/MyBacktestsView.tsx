import { useMemo, useState } from 'react';
import { FlaskConical } from 'lucide-react';
import type { BacktestStatus } from '@/domain/backtest';
import { formatMoney } from '@/lib/format';
import { statusLabel, useBacktestStore } from '@/stores/backtestStore';
import { useStrategyStore } from '@/stores/strategyStore';
import { useUiStore } from '@/stores/uiStore';

type SortKey = 'updated' | 'name' | 'pnl' | 'trades';

export function MyBacktestsView() {
  const setView = useUiStore((s) => s.setView);
  const sessions = useBacktestStore((s) => s.sessions);
  const setActive = useBacktestStore((s) => s.setActive);
  const removeSession = useBacktestStore((s) => s.removeSession);
  const createSession = useBacktestStore((s) => s.createSession);
  const strategies = useStrategyStore((s) => s.strategies);

  const [q, setQ] = useState('');
  const [status, setStatus] = useState<BacktestStatus | 'all'>('all');
  const [sort, setSort] = useState<SortKey>('updated');
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState('');

  const filtered = useMemo(() => {
    let list = sessions;
    if (status !== 'all') list = list.filter((s) => s.status === status);
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter(
        (s) =>
          s.config.name.toLowerCase().includes(needle) ||
          s.config.instrument.toLowerCase().includes(needle) ||
          (strategies.find((x) => x.id === s.config.strategyId)?.name ?? '').toLowerCase().includes(needle),
      );
    }
    list = [...list].sort((a, b) => {
      if (sort === 'name') return a.config.name.localeCompare(b.config.name);
      if (sort === 'pnl') return b.netPnl - a.netPnl;
      if (sort === 'trades') return b.tradeCount - a.tradeCount;
      return b.updatedAt - a.updatedAt;
    });
    return list;
  }, [sessions, status, q, sort, strategies]);

  const duplicate = (id: string) => {
    const s = sessions.find((x) => x.id === id);
    if (!s) return;
    createSession({ ...s.config, name: `${s.config.name} (copy)` });
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 pb-24 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">My Backtests</h1>
          <p className="mt-1 text-sm text-ink-muted">Experiments — separate from reusable strategy methodologies.</p>
        </div>
        <button
          type="button"
          onClick={() => setView('new-backtest')}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-accent px-3 text-sm font-medium text-accent-ink"
        >
          <FlaskConical size={14} />
          New
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, instrument, strategy…"
          className="h-9 flex-1 rounded-md border border-line bg-surface px-3 text-sm text-ink outline-none focus:border-accent"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as BacktestStatus | 'all')}
          className="h-9 rounded-md border border-line bg-surface px-2 text-sm text-ink"
        >
          <option value="all">All statuses</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="draft">Draft</option>
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="h-9 rounded-md border border-line bg-surface px-2 text-sm text-ink"
        >
          <option value="updated">Last updated</option>
          <option value="name">Name</option>
          <option value="pnl">Net P/L</option>
          <option value="trades">Trades</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-line-strong px-5 py-10 text-center">
          <p className="text-sm font-medium text-ink">No matching backtests</p>
          <button
            type="button"
            onClick={() => setView('new-backtest')}
            className="mt-4 h-9 rounded-md bg-accent px-3 text-sm font-medium text-accent-ink"
          >
            New Backtest
          </button>
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {filtered.map((s) => {
            const stratName = strategies.find((x) => x.id === s.config.strategyId)?.name ?? '—';
            return (
              <li key={s.id} className="rounded-lg border border-line bg-surface p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    {renameId === s.id ? (
                      <form
                        className="flex gap-2"
                        onSubmit={(e) => {
                          e.preventDefault();
                          useBacktestStore.setState((st) => ({
                            sessions: st.sessions.map((x) =>
                              x.id === s.id
                                ? {
                                    ...x,
                                    config: { ...x.config, name: renameVal.trim() || x.config.name },
                                    updatedAt: Date.now(),
                                  }
                                : x,
                            ),
                          }));
                          setRenameId(null);
                        }}
                      >
                        <input
                          value={renameVal}
                          onChange={(e) => setRenameVal(e.target.value)}
                          className="h-8 flex-1 rounded-md border border-line bg-raised px-2 text-sm"
                          autoFocus
                        />
                        <button type="submit" className="h-8 rounded-md bg-accent px-2 text-xs text-accent-ink">
                          Save
                        </button>
                      </form>
                    ) : (
                      <p className="text-sm font-semibold text-ink">{s.config.name}</p>
                    )}
                    <p className="text-xs text-ink-muted">
                      {stratName} · {s.config.instrument} · {s.config.timeframe} · {statusLabel(s.status)}
                    </p>
                    <p className="mt-1 text-[11px] text-ink-subtle">
                      Updated {new Date(s.updatedAt).toLocaleString()} · {s.tradeCount} trades · {formatMoney(s.netPnl)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActive(s.id);
                        setView('workspace');
                      }}
                      className="h-8 rounded-md bg-accent px-3 text-xs font-medium text-accent-ink"
                    >
                      {s.status === 'completed' ? 'Review chart' : 'Resume'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActive(s.id);
                        setView('analytics');
                      }}
                      className="h-8 rounded-md border border-line px-3 text-xs text-ink"
                    >
                      Results
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRenameId(s.id);
                        setRenameVal(s.config.name);
                      }}
                      className="h-8 rounded-md border border-line px-3 text-xs text-ink-muted"
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      onClick={() => duplicate(s.id)}
                      className="h-8 rounded-md border border-line px-3 text-xs text-ink-muted"
                    >
                      Duplicate
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Delete “${s.config.name}”? This cannot be undone.`)) removeSession(s.id);
                      }}
                      className="h-8 rounded-md border border-line px-3 text-xs text-bear"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
