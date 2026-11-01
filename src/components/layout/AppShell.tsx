import { useEffect } from 'react';
import { AnalyticsView } from '@/components/analytics/AnalyticsView';
import { ChartArea } from '@/components/chart/ChartArea';
import { ChallengeView } from '@/components/challenge/ChallengeView';
import { ComparisonView } from '@/components/comparison/ComparisonView';
import { DashboardView } from '@/components/dashboard/DashboardView';
import { NewBacktestView } from '@/components/backtests/NewBacktestView';
import { MyBacktestsView } from '@/components/backtests/MyBacktestsView';
import { TradeJournalView } from '@/components/journal/TradeJournalView';
import { PlaybackBar } from '@/components/playback/PlaybackBar';
import { StrategiesView } from '@/components/strategies/StrategiesView';
import { SettingsView } from '@/components/settings/SettingsView';
import { TradingPanel } from '@/components/trading/TradingPanel';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/cn';
import { DESKTOP_QUERY, useUiStore } from '@/stores/uiStore';
import { BottomNav } from './BottomNav';
import { MobileMenuButton, Sidebar } from './Sidebar';
import { WorkspaceHeader } from './WorkspaceHeader';

export function AppShell() {
  const view = useUiStore((state) => state.view);
  const isDocked = useMediaQuery(DESKTOP_QUERY);
  const setTradingPanelOpen = useUiStore((state) => state.setTradingPanelOpen);

  useEffect(() => {
    setTradingPanelOpen(isDocked);
  }, [isDocked, setTradingPanelOpen]);

  const inWorkspace = view === 'workspace';

  return (
    <div className="flex h-dvh overflow-hidden bg-canvas pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        {!inWorkspace && (
          <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line bg-surface px-3 pt-[env(safe-area-inset-top)] lg:px-4">
            <MobileMenuButton />
            <span className="text-[13px] font-semibold text-ink lg:hidden">Forex Backtester</span>
          </header>
        )}

        <div className={cn('min-h-0 flex-1 flex-col', inWorkspace ? 'flex' : 'hidden')}>
          <WorkspaceHeader />
          <main className="flex min-h-0 flex-1">
            <ChartArea />
            <TradingPanel />
          </main>
          <PlaybackBar />
        </div>

        {!inWorkspace && (
          <main key={view} className="min-h-0 flex-1 animate-fade-in overflow-y-auto overscroll-contain">
            {view === 'dashboard' && <DashboardView />}
            {view === 'new-backtest' && <NewBacktestView />}
            {view === 'backtests' && <MyBacktestsView />}
            {view === 'strategies' && <StrategiesView />}
            {view === 'analytics' && <AnalyticsView />}
            {view === 'journal' && <TradeJournalView />}
            {view === 'settings' && <SettingsView />}
            {view === 'comparison' && <ComparisonView />}
            {view === 'challenge' && <ChallengeView />}
          </main>
        )}

        {!inWorkspace && <BottomNav />}
      </div>
    </div>
  );
}
