import { useState } from 'react';
import { ACTIVE_PAIR, switchPair, type PairId } from '@/data/marketData';
import { cn } from '@/lib/cn';
import { usePlaybackStore } from '@/stores/playbackStore';
import { useUiStore } from '@/stores/uiStore';

const PAIRS: {
  id: PairId;
  name: string;
  blurb: string;
}[] = [
  { id: 'EURUSD', name: 'EUR / USD', blurb: 'Euro vs US Dollar — most liquid pair' },
  { id: 'USDJPY', name: 'USD / JPY', blurb: 'US Dollar vs Japanese Yen' },
];

export function MarketsView() {
  const [busy, setBusy] = useState<PairId | null>(null);
  const [active, setActive] = useState<PairId>(ACTIVE_PAIR);
  const setView = useUiStore((s) => s.setView);

  async function select(id: PairId) {
    if (busy) return;
    setBusy(id);
    try {
      try {
        localStorage.removeItem('fb-playback');
      } catch {
        /* ignore */
      }
      await switchPair(id);
      setActive(id);
      usePlaybackStore.setState({ isPlaying: false, visibleRange: null });
      setView('chart');
      window.location.reload();
    } catch (err) {
      console.error(err);
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6 pb-24">
      <h2 className="text-lg font-semibold text-ink">Markets</h2>
      <p className="mt-1 text-sm text-ink-muted">
        Choose a currency pair. History loads from your R2 data. Switching resets the replay clock, not your demo
        account.
      </p>
      <ul className="mt-5 space-y-3">
        {PAIRS.map((p) => {
          const selected = p.id === active;
          return (
            <li key={p.id}>
              <button
                type="button"
                disabled={!!busy}
                onClick={() => void select(p.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition',
                  selected ? 'border-accent bg-accent/10' : 'border-line bg-surface hover:bg-overlay',
                  busy && 'opacity-70',
                )}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-raised font-mono text-xs font-bold text-ink">
                  {p.id.slice(0, 3)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-ink">{p.name}</span>
                  <span className="block text-xs text-ink-muted">{p.blurb}</span>
                </span>
                <span className="text-xs font-medium text-accent">
                  {busy === p.id ? 'Loading…' : selected ? 'Active' : 'Select'}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-6 text-xs text-ink-subtle">
        Demo balance: open Settings (gear) → Trading → Account setup. Or open the Trade panel on the chart.
      </p>
    </div>
  );
}
