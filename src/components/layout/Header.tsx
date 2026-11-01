import { Palette, PanelRight, Settings } from 'lucide-react';
import { ChallengeChip } from '@/components/challenge/ChallengeChip';
import { IconButton } from '@/components/ui/IconButton';
import { useGradual } from '@/hooks/useEasedNumber';
import { cn } from '@/lib/cn';
import { formatSignedMoney, pnlTone } from '@/lib/format';
import { useTradingStore } from '@/stores/tradingStore';
import { useUiStore } from '@/stores/uiStore';
import { Logo } from './Logo';
import { NavTabs } from './NavTabs';
import { NAV_ITEMS } from './navItems';
import { PairSwitcher } from './PairSwitcher';
import { ThemeToggle } from './ThemeToggle';

export function Header() {
  const view = useUiStore((state) => state.view);
  const panelOpen = useUiStore((state) => state.tradingPanelOpen);
  const togglePanel = useUiStore((state) => state.toggleTradingPanel);
  const openSettings = useUiStore((state) => state.openSettings);
  const openPositions = useTradingStore((state) => state.positions.length);
  const floatingPnl = useGradual(useTradingStore((state) => state.floatingPnl));
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

        <PairSwitcher />

        <NavTabs />

        <div className="ml-auto flex items-center gap-0.5 md:gap-1">
          {onChart && (
            <IconButton label="Candle colors" className="hidden md:inline-flex" onClick={() => openSettings('chart')}>
              <Palette size={18} />
            </IconButton>
          )}
          <ChallengeChip />
          <ThemeToggle />
          <IconButton label="Settings" aria-haspopup="dialog" onClick={() => openSettings()}>
            <Settings size={18} />
          </IconButton>
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
    </header>
  );
}
