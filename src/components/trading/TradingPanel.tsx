import { useEffect } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useSwipeToDismiss } from '@/hooks/useSwipeToDismiss';
import { DESKTOP_QUERY, useUiStore } from '@/stores/uiStore';
import { IconButton } from '@/components/ui/IconButton';
import { AccountSummary } from './AccountSummary';
import { OrderTicket } from './OrderTicket';
import { PositionsList } from './PositionsList';

/**
 * Phone: bottom sheet · iPad portrait: slide-over · iPad landscape / desktop: docked column.
 */
export function TradingPanel() {
  const open = useUiStore((state) => state.tradingPanelOpen);
  const setOpen = useUiStore((state) => state.setTradingPanelOpen);
  const isDocked = useMediaQuery(DESKTOP_QUERY);
  const openSettings = useUiStore((state) => state.openSettings);
  const swipe = useSwipeToDismiss(() => setOpen(false));

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
        style={swipe.style}
        className={cn(
          'z-40 flex flex-col bg-surface pb-[env(safe-area-inset-bottom)]',
          // Phone: bottom sheet.
          'fixed inset-x-0 bottom-0 max-h-[85dvh] rounded-t-2xl border-t border-line shadow-overlay',
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
        <div {...swipe.handlers} className="flex touch-none justify-center pb-1 pt-2 md:hidden" aria-hidden>
          <span className="h-1 w-10 rounded-full bg-line-strong" />
        </div>

        <div className="flex h-12 shrink-0 items-center justify-between border-b border-line pl-4 pr-2">
          <h2 className="text-sm font-semibold text-ink">Trading</h2>
          <div className="flex items-center gap-0.5">
            <IconButton label="Trading settings" aria-haspopup="dialog" onClick={() => openSettings('trading')}>
              <SlidersHorizontal size={17} />
            </IconButton>
            <IconButton label="Close trading panel" onClick={() => setOpen(false)} className="lg:hidden">
              <X size={18} />
            </IconButton>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-3 md:p-4">
          <AccountSummary />
          <OrderTicket />
          <PositionsList />
        </div>
      </aside>
    </>
  );
}
