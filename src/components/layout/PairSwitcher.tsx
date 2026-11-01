import { useState } from 'react';
import { ACTIVE_PAIR, switchPair, type PairId } from '@/data/marketData';
import { cn } from '@/lib/cn';

const PAIRS: { id: PairId; label: string }[] = [
  { id: 'EURUSD', label: 'EURUSD' },
  { id: 'USDJPY', label: 'USDJPY' },
];

export function PairSwitcher() {
  const [pair, setPair] = useState<PairId>(ACTIVE_PAIR);
  const [busy, setBusy] = useState(false);

  const onSelect = async (next: PairId) => {
    if (next === pair || busy) return;
    setBusy(true);
    try {
      try {
        localStorage.removeItem('fb-playback');
      } catch {
        /* ignore */
      }
      await switchPair(next);
      setPair(next);
      window.location.reload();
    } catch (err) {
      console.error(err);
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center rounded-lg border border-line bg-raised p-0.5" role="group" aria-label="Instrument">
      {PAIRS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          disabled={busy}
          aria-pressed={pair === id}
          onClick={() => void onSelect(id)}
          className={cn(
            'h-7 rounded-md px-2.5 text-[12px] font-semibold tracking-wide transition coarse:h-9',
            pair === id ? 'bg-accent text-accent-ink' : 'text-ink-muted hover:text-ink',
            busy && 'opacity-60',
          )}
        >
          {busy && pair !== id ? '…' : label}
        </button>
      ))}
    </div>
  );
}
