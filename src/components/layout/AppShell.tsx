import { useEffect } from 'react';
import { ChartArea } from '@/components/chart/ChartArea';
import { MarketsView } from '@/components/markets/MarketsView';
import { ChallengeView } from '@/components/challenge/ChallengeView';
import { ComparisonView } from '@/components/comparison/ComparisonView';
import { PerformanceView } from '@/components/performance/PerformanceView';
import { PlaybackBar } from '@/components/playback/PlaybackBar';
import { StrategiesView } from '@/components/strategies/StrategiesView';
import { TradingPanel } from '@/components/trading/TradingPanel';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/cn';
import { DESKTOP_QUERY, useUiStore } from '@/stores/uiStore';
import { BottomNav } from './BottomNav';
import { Header } from './Header';

export function AppShell() {
  const view = useUiStore((state) => state.view);
  const isDocked = useMediaQuery(DESKTOP_QUERY);
  const setTradingPanelOpen = useUiStore((state) => state.setTradingPanelOpen);

  useEffect(() => {
    setTradingPanelOpen(isDocked);
  }, [isDocked, setTradingPanelOpen]);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-canvas pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      <Header />

      <div className={cn('min-h-0 flex-1 flex-col', view === 'chart' ? 'flex' : 'hidden')}>
        <main className="flex min-h-0 flex-1">
          <ChartArea />
          <TradingPanel />
        </main>
        <PlaybackBar />
      </div>

      {view !== 'chart' && (
        <main key={view} className="min-h-0 flex-1 animate-fade-in overflow-y-auto overscroll-contain">
          {view === 'markets' && <MarketsView />}
          {view === 'strategies' && <StrategiesView />}
          {view === 'performance' && <PerformanceView />}
          {view === 'comparison' && <ComparisonView />}
          {view === 'challenge' && <ChallengeView />}
        </main>
      )}

      <BottomNav />
    </div>
  );
}
