import { useState } from 'react';
import { useBacktestStore } from '@/stores/backtestStore';
import { useStrategyStore } from '@/stores/strategyStore';
import { useUiStore } from '@/stores/uiStore';
import { cn } from '@/lib/cn';
import type { Strategy } from '@/domain/strategy';

export function StrategiesView() {
  const strategies = useStrategyStore((s) => s.strategies);
  const activeId = useStrategyStore((s) => s.activeId);
  const setActive = useStrategyStore((s) => s.setActive);
  const createStrategy = useStrategyStore((s) => s.createStrategy);
  const renameStrategy = useStrategyStore((s) => s.renameStrategy);
  const archiveStrategy = useStrategyStore((s) => s.archiveStrategy);
  const restoreStrategy = useStrategyStore((s) => s.restoreStrategy);
  const sessions = useBacktestStore((s) => s.sessions);
  const setView = useUiStore((s) => s.setView);

  const [name, setName] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const visible = strategies.filter((s) => (showArchived ? true : !s.archived));

  const updateMeta = (id: string, patch: Partial<Strategy>) => {
    useStrategyStore.setState((st) => ({
      strategies: st.strategies.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 pb-24 lg:px-8">
      <h1 className="text-xl font-semibold tracking-tight text-ink">Strategies</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Methodologies — separate from individual backtest experiments. Multiple tests can share one strategy.
      </p>

      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const r = createStrategy(name.trim() || 'New strategy');
          if (r.ok) setName('');
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New strategy name"
          className="h-9 flex-1 rounded-md border border-line bg-surface px-3 text-sm text-ink outline-none focus:border-accent"
        />
        <button type="submit" className="h-9 rounded-md bg-accent px-3 text-sm font-medium text-accent-ink">
          Create
        </button>
      </form>

      <label className="mt-3 flex items-center gap-2 text-xs text-ink-muted">
        <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
        Show archived
      </label>

      <ul className="mt-6 space-y-3">
        {visible.map((s) => {
          const linked = sessions.filter((b) => b.config.strategyId === s.id);
          const open = editId === s.id;
          return (
            <li key={s.id} className={cn('rounded-lg border border-line bg-surface p-4', s.archived && 'opacity-70')}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <button type="button" onClick={() => setActive(s.id)} className="text-left">
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                    <span className="text-sm font-semibold text-ink">{s.name}</span>
                    {activeId === s.id && (
                      <span className="rounded bg-accent/15 px-1.5 text-[10px] font-medium text-accent">Active</span>
                    )}
                  </span>
                  <span className="mt-1 block text-xs text-ink-muted">
                    {linked.length} linked backtest{linked.length === 1 ? '' : 's'}
                  </span>
                </button>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEditId(open ? null : s.id)}
                    className="h-8 rounded-md border border-line px-2 text-xs text-ink"
                  >
                    {open ? 'Close' : 'Edit'}
                  </button>
                  {s.archived ? (
                    <button
                      type="button"
                      onClick={() => restoreStrategy(s.id)}
                      className="h-8 rounded-md border border-line px-2 text-xs text-ink-muted"
                    >
                      Restore
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => archiveStrategy(s.id)}
                      className="h-8 rounded-md border border-line px-2 text-xs text-ink-muted"
                    >
                      Archive
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setActive(s.id);
                      setView('new-backtest');
                    }}
                    className="h-8 rounded-md bg-accent px-2 text-xs font-medium text-accent-ink"
                  >
                    New test
                  </button>
                </div>
              </div>

              {open && (
                <div className="mt-4 space-y-3 border-t border-line pt-3">
                  <label className="block text-xs">
                    <span className="text-ink-subtle">Name</span>
                    <input
                      defaultValue={s.name}
                      onBlur={(e) => renameStrategy(s.id, e.target.value)}
                      className="mt-1 h-9 w-full rounded-md border border-line bg-raised px-2 text-sm text-ink"
                    />
                  </label>
                  {(
                    [
                      ['description', 'Description'],
                      ['entryRules', 'Entry rules'],
                      ['exitRules', 'Exit rules'],
                      ['riskRules', 'Risk management'],
                      ['preferredInstruments', 'Preferred instruments'],
                      ['preferredTimeframes', 'Preferred timeframes'],
                      ['tradingSessions', 'Trading sessions'],
                      ['notes', 'Notes'],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="block text-xs">
                      <span className="text-ink-subtle">{label}</span>
                      <textarea
                        rows={key === 'description' || key === 'notes' ? 2 : 3}
                        defaultValue={(s[key] as string | undefined) ?? ''}
                        onBlur={(e) => updateMeta(s.id, { [key]: e.target.value })}
                        className="mt-1 w-full rounded-md border border-line bg-raised px-2 py-1.5 text-sm text-ink"
                        placeholder="Optional — discretionary strategies welcome"
                      />
                    </label>
                  ))}
                  {linked.length > 0 && (
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-ink-subtle">Linked backtests</p>
                      <ul className="mt-1 space-y-1">
                        {linked.map((b) => (
                          <li key={b.id} className="text-xs text-ink-muted">
                            {b.config.name} · {b.config.instrument} {b.config.timeframe}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
