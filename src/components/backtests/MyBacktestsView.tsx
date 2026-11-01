import { FlaskConical } from 'lucide-react';
import { useUiStore } from '@/stores/uiStore';
import { useTradingStore } from '@/stores/tradingStore';

export function MyBacktestsView() {
  const setView = useUiStore((s) => s.setView);
  const trades = useTradingStore((s) => s.closedTrades.length);

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

      <div className="mt-8 rounded-lg border border-dashed border-line-strong bg-surface/50 px-5 py-10 text-center">
        <p className="text-sm font-medium text-ink">Named backtest library coming next</p>
        <p className="mx-auto mt-2 max-w-md text-xs text-ink-muted">
          The engine already records {trades} closed trade{trades === 1 ? '' : 's'} on a continuous demo account. Part
          6+ will attach each run to a saved session (instrument, range, strategy, status). Until then, open the chart
          session to continue testing.
        </p>
        <button
          type="button"
          onClick={() => setView('workspace')}
          className="mt-5 h-9 rounded-md border border-line px-3 text-sm font-medium text-ink hover:bg-overlay"
        >
          Open chart session
        </button>
      </div>
    </div>
  );
}
