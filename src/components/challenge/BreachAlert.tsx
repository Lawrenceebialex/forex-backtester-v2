import { useEffect } from 'react';
import { ShieldAlert } from 'lucide-react';
import { formatVirtualTime } from '@/lib/formatTime';
import { usePlaybackStore } from '@/stores/playbackStore';
import { usePreferencesStore } from '@/stores/preferencesStore';
import { usePropStore } from '@/stores/propStore';
import { useUiStore } from '@/stores/uiStore';

/**
 * The moment a rule is broken: a clear alert with the numbers. The replay pauses so it can't
 * scroll past unnoticed at high speed.
 */
export function BreachAlert() {
  const challenge = usePropStore((state) => state.challenge);
  const unseen = usePropStore((state) => state.unseen);
  const dismissAlert = usePropStore((state) => state.dismissAlert);
  const setView = useUiStore((state) => state.setView);

  const key = unseen[0];
  const breach = challenge?.breaches.find((candidate) => candidate.key === key);

  useEffect(() => {
    if (breach) {
      if (usePreferencesStore.getState().pauseOnBreach) usePlaybackStore.getState().pause();
    }
    else if (key) dismissAlert(key); // stale entry (e.g. the challenge was restarted)
  }, [breach, key, dismissAlert]);

  if (!breach) return null;

  return (
    <div
      role="alertdialog"
      aria-live="assertive"
      aria-label={`Rule broken: ${breach.title}`}
      className="fixed inset-x-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[70] mx-auto max-w-md animate-pop-in overflow-hidden rounded-2xl border border-bear/60 bg-surface shadow-overlay md:left-auto md:right-4 md:mx-0"
    >
      <div className="h-1 bg-bear" />
      <div className="p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bear/15 text-bear">
            <ShieldAlert size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-bear">Rule broken</p>
            <h2 className="text-base font-semibold text-ink">{breach.title}</h2>
            <p className="mt-1 text-sm text-ink-muted">{breach.summary}</p>
          </div>
        </div>

        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg bg-raised p-3">
          {breach.facts.map((fact) => (
            <div key={fact.label} className="min-w-0">
              <dt className="text-[11px] text-ink-subtle">{fact.label}</dt>
              <dd className="truncate font-mono text-xs tabular-nums text-ink">{fact.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-2 font-mono text-xs tabular-nums text-ink-subtle">Recorded at {formatVirtualTime(breach.time)} UTC</p>

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              dismissAlert(breach.key);
              setView('challenge');
            }}
            className="h-10 flex-1 rounded-lg bg-bear text-sm font-medium text-white transition hover:brightness-110 coarse:h-11"
          >
            View report
          </button>
          <button
            type="button"
            onClick={() => dismissAlert(breach.key)}
            className="h-10 flex-1 rounded-lg border border-line-strong text-sm text-ink-muted transition-colors hover:bg-overlay hover:text-ink coarse:h-11"
          >
            {unseen.length > 1 ? `Dismiss (${unseen.length - 1} more)` : 'Dismiss'}
          </button>
        </div>
      </div>
    </div>
  );
}
