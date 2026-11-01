import { ArrowLeft, PanelRight, Settings } from 'lucide-react';
import { ChallengeChip } from '@/components/challenge/ChallengeChip';
import { IconButton } from '@/components/ui/IconButton';
import { PairSwitcher } from './PairSwitcher';
import { useGradual } from '@/hooks/useEasedNumber';
import { cn } from '@/lib/cn';
import { formatSignedMoney, pnlTone } from '@/lib/format';
import { useTradingStore } from '@/stores/tradingStore';
import { useUiStore } from '@/stores/uiStore';
import { MobileMenuButton } from './Sidebar';
import { ThemeToggle } from './ThemeToggle';

export function WorkspaceHeader() {
  const setView = useUiStore((s) => s.setView);
  const panelOpen = useUiStore((s) => s.tradingPanelOpen);
  const togglePanel = useUiStore((s) => s.toggleTradingPanel);
  const openSettings = useUiStore((s) => s.openSettings);
  const openPositions = useTradingStore((s) => s.positions.length);
  const floatingPnl = useGradual(useTradingStore((s) => s.floatingPnl));

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line bg-surface px-2 pt-[env(safe-area-inset-top)] md:px-3">
      <MobileMenuButton />
      <button
        type="button"
        onClick={() => setView('dashboard')}
        className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium text-ink-muted hover:bg-overlay hover:text-ink"
      >
        <ArrowLeft size={14} />
        <span className="hidden sm:inline">Dashboard</span>
      </button>
      <PairSwitcher />
      <span className="hidden text-[12px] text-ink-subtle md:inline">Chart session</span>
      <div className="ml-auto flex items-center gap-0.5">
        <ChallengeChip />
        <ThemeToggle />
        <IconButton label="Settings" onClick={() => openSettings()}>
          <Settings size={18} />
        </IconButton>
        {openPositions > 0 && (
          <span className={cn('ml-1 font-mono text-xs font-medium tabular-nums', pnlTone(floatingPnl))}>
            {formatSignedMoney(floatingPnl)}
          </span>
        )}
        <button
          type="button"
          aria-pressed={panelOpen}
          onClick={togglePanel}
          className={cn(
            'ml-1 inline-flex h-9 items-center gap-2 rounded-lg px-3 text-[13px] font-medium transition',
            panelOpen ? 'bg-overlay text-ink' : 'bg-accent text-accent-ink hover:brightness-110',
          )}
        >
          <PanelRight size={16} />
          Trade
        </button>
      </div>
    </header>
  );
}
