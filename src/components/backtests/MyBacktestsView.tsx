import { FlaskConical } from 'lucide-react';
import { formatMoney } from '@/lib/format';
import { statusLabel, useBacktestStore } from '@/stores/backtestStore';
import { useUiStore } from '@/stores/uiStore';

export function MyBacktestsView() {
  const setView = useUiStore((s) => s.setView);
  const sessions = useBacktestStore((s) => s.sessions);
  const setActive = useBacktestStore((s) => s.setActive);
  const removeSession = useBacktestStore((s) => s.removeSession);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 pb-24 lg:px-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">My Backtests</h1>
          <p className="mt-1 text-sm text-ink-muted">Experiments saved on this device.</p>
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

      {sessions.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-line-strong bg-surface/50 px-5 py-10 text-center">
          <p className="text-sm font-medium text-ink">No backtests yet</p>
          <p className="mx-auto mt-2 max-w-md text-xs text-ink-muted">
            Create a configured session from New Backtest. Each launch is stored here with status and summary fields.
          </p>
          <button
            type="button"
            onClick={() => setView('new-backtest')}
            className="mt-5 h-9 rounded-md bg-accent px-3 text-sm font-medium text-accent-ink"
          >
            New Backtest
          </button>
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {sessions.map((s) => (
            <li key={s.id} className="rounded-lg border border-line bg-surface p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-ink">{s.config.name}</p>
                  <p className="text-xs text-ink-muted">
                    {s.config.instrument} · {s.config.timeframe} · {statusLabel(s.status)}
                  </p>
                  <p className="mt-1 text-[11px] text-ink-subtle">
                    Updated {new Date(s.updatedAt).toLocaleString()} · {s.tradeCount} trades · {formatMoney(s.netPnl)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActive(s.id);
                      setView('workspace');
                    }}
                    className="h-8 rounded-md bg-accent px-3 text-xs font-medium text-accent-ink"
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSession(s.id)}
                    className="h-8 rounded-md border border-line px-3 text-xs text-ink-muted"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
