import { useState } from 'react';
import { Palette, PanelRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatSignedMoney, pnlTone } from '@/lib/format';
import { useTradingStore } from '@/stores/tradingStore';
import { useUiStore } from '@/stores/uiStore';
import { CandleColorPanel } from '@/components/settings/CandleColorPanel';
import { IconButton } from '@/components/ui/IconButton';
import { Overlay } from '@/components/ui/Overlay';
import { Logo } from './Logo';
import { NavTabs } from './NavTabs';
import { NAV_ITEMS } from './navItems';
import { ThemeToggle } from './ThemeToggle';

export function Header() {
  const [colorsOpen, setColorsOpen] = useState(false);
  const view = useUiStore((state) => state.view);
  const panelOpen = useUiStore((state) => state.tradingPanelOpen);
  const togglePanel = useUiStore((state) => state.toggleTradingPanel);
  const openPositions = useTradingStore((state) => state.positions.length);
  const floatingPnl = useTradingStore((state) => state.floatingPnl);
  const onChart = view === 'chart';

  return (
    <header className="shrink-0 border-b border-line bg-surface pt-[env(safe-area-inset-top)]">
      <div className="flex h-12 items-center gap-2 px-3 md:h-14 md:gap-5 md:px-4">
        <div className="flex items-center gap-2.5">
          <Logo />
          <span className="hidden text-[15px] font-semibold tracking-tight text-ink lg:block">Forex Backtester</span>
          <h1 className="text-[15px] font-semibold tracking-tight text-ink md:hidden">
            {NAV_ITEMS.find((item) => item.id === view)?.label}
          </h1>
        </div>

        <NavTabs />

        <div className="ml-auto flex items-center gap-0.5 md:gap-1">
          {onChart && (
            <IconButton label="Candle colors" active={colorsOpen} aria-haspopup="dialog" onClick={() => setColorsOpen(true)}>
              <Palette size={18} />
            </IconButton>
          )}
          <ThemeToggle />
          {onChart && openPositions > 0 && (
            <span
              className={cn('ml-1 font-mono text-xs font-medium tabular-nums', pnlTone(floatingPnl))}
              aria-label={`Floating profit and loss across ${openPositions} open positions`}
            >
              {formatSignedMoney(floatingPnl)}
            </span>
          )}
          {onChart && (
            <button
              type="button"
              aria-pressed={panelOpen}
              onClick={togglePanel}
              className={cn(
                'ml-1 inline-flex h-9 items-center gap-2 rounded-lg px-3 text-[13px] font-medium transition active:scale-95 coarse:h-11',
                panelOpen ? 'bg-overlay text-ink hover:bg-line' : 'bg-accent text-accent-ink hover:brightness-110',
              )}
            >
              <PanelRight size={16} />
              Trade
            </button>
          )}
        </div>
      </div>

      <Overlay open={colorsOpen} onClose={() => setColorsOpen(false)} title="Candle colors">
        <CandleColorPanel />
      </Overlay>
    </header>
  );
}
