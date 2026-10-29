import { useEffect, type ReactNode } from 'react';
import { Inbox, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { DESKTOP_QUERY, useUiStore } from '@/stores/uiStore';
import { IconButton } from '@/components/ui/IconButton';

const ACCOUNT_STATS = ['Balance', 'Equity', 'Free margin', 'Used margin'] as const;

function Section({ title, badge, children }: { title: string; badge?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-raised/60 p-3.5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[11px] font-medium uppercase tracking-wider text-ink-subtle">{title}</h3>
        {badge && (
          <span className="rounded-full bg-overlay px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-muted">
            {badge}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

function DisabledField({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] text-ink-subtle">{label}</span>
      <input
        disabled
        inputMode="decimal"
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-line bg-surface px-3 font-mono text-sm text-ink placeholder:text-ink-subtle disabled:cursor-not-allowed disabled:opacity-60 coarse:h-11 coarse:text-base"
      />
    </label>
  );
}

/**
 * Layout shell only — trading logic arrives in the next part.
 * Phone: bottom sheet · iPad portrait: slide-over · iPad landscape / desktop: docked column.
 */
export function TradingPanel() {
  const open = useUiStore((state) => state.tradingPanelOpen);
  const setOpen = useUiStore((state) => state.setTradingPanelOpen);
  const isDocked = useMediaQuery(DESKTOP_QUERY);

  useEffect(() => {
    if (!open || isDocked) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, isDocked, setOpen]);

  return (
    <>
      {open && (
        <div aria-hidden className="fixed inset-0 z-30 animate-fade-in bg-black/50 lg:hidden" onClick={() => setOpen(false)} />
      )}

      <aside
        aria-label="Trading panel"
        className={cn(
          'z-40 flex flex-col bg-surface pb-[env(safe-area-inset-bottom)]',
          // Phone: bottom sheet.
          'fixed inset-x-0 bottom-0 max-h-[82dvh] rounded-t-2xl border-t border-line shadow-overlay',
          'transition-[transform,visibility] duration-300 ease-out',
          open ? 'visible translate-y-0' : 'invisible translate-y-full',
          // iPad portrait: slide-over from the right.
          'md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-[380px] md:rounded-none md:border-l md:border-t-0',
          open ? 'md:translate-x-0' : 'md:translate-x-full md:translate-y-0',
          // iPad landscape and desktop: docked beside the chart.
          'lg:static lg:w-[340px] lg:shrink-0 lg:translate-x-0 lg:shadow-none lg:transition-none xl:w-[360px]',
          !open && 'lg:hidden',
        )}
      >
        <div className="flex justify-center pt-2 md:hidden" aria-hidden>
          <span className="h-1 w-10 rounded-full bg-line-strong" />
        </div>

        <div className="flex h-12 shrink-0 items-center justify-between border-b border-line px-4">
          <h2 className="text-sm font-semibold text-ink">Trading</h2>
          <IconButton label="Close trading panel" onClick={() => setOpen(false)} className="-mr-2 lg:hidden">
            <X size={18} />
          </IconButton>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-3 md:p-4">
          <Section title="Account">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              {ACCOUNT_STATS.map((stat) => (
                <div key={stat}>
                  <dt className="text-[11px] text-ink-subtle">{stat}</dt>
                  <dd className="font-mono text-base tabular-nums text-ink-muted">—</dd>
                </div>
              ))}
            </dl>
          </Section>

          <Section title="Order ticket" badge="Soon">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled
                  className="flex h-14 flex-col items-center justify-center rounded-xl bg-bear text-white opacity-45 disabled:cursor-not-allowed"
                >
                  <span className="text-sm font-semibold">Sell</span>
                  <span className="font-mono text-xs opacity-90">—</span>
                </button>
                <button
                  type="button"
                  disabled
                  className="flex h-14 flex-col items-center justify-center rounded-xl bg-bull text-white opacity-45 disabled:cursor-not-allowed"
                >
                  <span className="text-sm font-semibold">Buy</span>
                  <span className="font-mono text-xs opacity-90">—</span>
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <DisabledField label="Lots" placeholder="0.10" />
                <DisabledField label="Stop loss" placeholder="—" />
                <DisabledField label="Take profit" placeholder="—" />
              </div>
            </div>
          </Section>

          <Section title="Positions">
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-overlay text-ink-subtle">
                <Inbox size={18} />
              </span>
              <p className="text-sm font-medium text-ink-muted">No open positions</p>
              <p className="max-w-[16rem] text-xs text-ink-subtle">Positions you open during the replay will show up here.</p>
            </div>
          </Section>
        </div>
      </aside>
    </>
  );
}
