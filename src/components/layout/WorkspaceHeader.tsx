import { ArrowLeft, Check, PanelRight, Settings } from 'lucide-react';
import { ChallengeChip } from '@/components/challenge/ChallengeChip';
import { IconButton } from '@/components/ui/IconButton';
import { PairSwitcher } from './PairSwitcher';
import { useGradual } from '@/hooks/useEasedNumber';
import { cn } from '@/lib/cn';
import { formatMoney, formatSignedMoney, pnlTone } from '@/lib/format';
import { formatVirtualTime } from '@/lib/formatTime';
import { useBacktestStore } from '@/stores/backtestStore';
import { usePlaybackStore } from '@/stores/playbackStore';
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
  const balance = useTradingStore((s) => s.balance);
  const equity = useTradingStore((s) => s.equity);
  const closed = useTradingStore((s) => s.closedTrades);
  const currentTime = usePlaybackStore((s) => s.currentTime);
  const timeframe = usePlaybackStore((s) => s.timeframe);
  const activeId = useBacktestStore((s) => s.activeSessionId);
  const session = useBacktestStore((s) => s.sessions.find((x) => x.id === activeId));
  const updateSession = useBacktestStore((s) => s.updateSession);

  const completeBacktest = () => {
    if (activeId) {
      const netPnl = closed.reduce((sum, t) => sum + t.pnl, 0);
      updateSession(activeId, {
        status: 'completed',
        tradeCount: closed.length,
        netPnl,
      });
    }
    setView('analytics');
  };

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line bg-surface px-2 pt-[env(safe-area-inset-top)] md:gap-3 md:px-3">
      <MobileMenuButton />
      <button
        type="button"
        onClick={() => setView('dashboard')}
        className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium text-ink-muted hover:bg-overlay hover:text-ink"
      >
        <ArrowLeft size={14} />
        <span className="hidden sm:inline">Exit</span>
      </button>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-semibold text-ink">
          {session?.config.name ?? 'Chart session'}
          <span className="ml-2 font-normal text-ink-subtle">
            {session?.config.instrument ?? ''} · {timeframe}
          </span>
        </p>
        <p className="truncate font-mono text-[11px] tabular-nums text-ink-muted">
          {formatVirtualTime(currentTime)} UTC
          <span className="mx-1.5 text-ink-subtle">·</span>
          Bal {formatMoney(balance)}
          <span className="mx-1.5 text-ink-subtle">·</span>
          Eq {formatMoney(equity)}
        </p>
      </div>

      <PairSwitcher />

      <div className="flex items-center gap-0.5">
        {activeId && session?.status !== 'completed' && (
          <button
            type="button"
            onClick={completeBacktest}
            className="mr-1 hidden h-8 items-center gap-1 rounded-md border border-line px-2 text-xs font-medium text-ink hover:bg-overlay sm:inline-flex"
            title="Mark this experiment complete and open Analytics"
          >
            <Check size={14} />
            Complete
          </button>
        )}
        <ChallengeChip />
        <ThemeToggle />
        <IconButton label="Settings" onClick={() => openSettings()}>
          <Settings size={18} />
        </IconButton>
        {openPositions > 0 && (
          <span className={cn('ml-1 hidden font-mono text-xs font-medium tabular-nums sm:inline', pnlTone(floatingPnl))}>
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
