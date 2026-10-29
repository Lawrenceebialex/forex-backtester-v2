import { useState } from 'react';
import { Palette, PanelRight } from 'lucide-react';
import { SYMBOL } from '@/data/marketData';
import { cn } from '@/lib/cn';
import { useUiStore } from '@/stores/uiStore';
import { CandleColorPanel } from '@/components/settings/CandleColorPanel';
import { IconButton } from '@/components/ui/IconButton';
import { Overlay } from '@/components/ui/Overlay';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';

export function Header() {
  const [colorsOpen, setColorsOpen] = useState(false);
  const panelOpen = useUiStore((state) => state.tradingPanelOpen);
  const togglePanel = useUiStore((state) => state.toggleTradingPanel);

  return (
    <header className="shrink-0 border-b border-line bg-surface pt-[env(safe-area-inset-top)]">
      <div className="flex h-12 items-center gap-2 px-3 md:h-14 md:gap-3 md:px-4">
        <div className="flex items-center gap-2.5">
          <Logo />
          <span className="hidden text-[15px] font-semibold tracking-tight text-ink sm:block">Forex Backtester</span>
        </div>

        <div className="mx-1 hidden h-6 w-px bg-line sm:block" />

        <div className="flex min-w-0 items-baseline gap-2">
          <span className="text-sm font-semibold tracking-wide text-ink">{SYMBOL.symbol}</span>
          <span className="hidden truncate text-xs text-ink-subtle md:block">{SYMBOL.description}</span>
        </div>

        <div className="ml-auto flex items-center gap-0.5 md:gap-1">
          <IconButton label="Candle colors" active={colorsOpen} aria-haspopup="dialog" onClick={() => setColorsOpen(true)}>
            <Palette size={18} />
          </IconButton>
          <ThemeToggle />
          <button
            type="button"
            aria-pressed={panelOpen}
            onClick={togglePanel}
            className={cn(
              'ml-1 inline-flex h-9 items-center gap-2 rounded-lg px-3 text-[13px] font-medium transition active:scale-95 coarse:h-11',
              panelOpen
                ? 'bg-overlay text-ink hover:bg-line'
                : 'bg-accent text-accent-ink hover:brightness-110',
            )}
          >
            <PanelRight size={16} />
            Trade
          </button>
        </div>
      </div>

      <Overlay open={colorsOpen} onClose={() => setColorsOpen(false)} title="Candle colors">
        <CandleColorPanel />
      </Overlay>
    </header>
  );
}
