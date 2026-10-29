import { useEffect } from 'react';
import { ChartArea } from '@/components/chart/ChartArea';
import { PlaybackBar } from '@/components/playback/PlaybackBar';
import { TradingPanel } from '@/components/trading/TradingPanel';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { DESKTOP_QUERY, useUiStore } from '@/stores/uiStore';
import { Header } from './Header';

/**
 * ┌──────────────── Header ────────────────┐
 * │  Chart toolbar + Chart   │ Trading panel │   ← docked from 1024px, drawer / sheet below
 * ├──────────────── Playback ──────────────┤
 */
export function AppShell() {
  const isDocked = useMediaQuery(DESKTOP_QUERY);
  const setTradingPanelOpen = useUiStore((state) => state.setTradingPanelOpen);

  // Crossing the docking breakpoint: docked panels start open, overlays start closed.
  useEffect(() => {
    setTradingPanelOpen(isDocked);
  }, [isDocked, setTradingPanelOpen]);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-canvas pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      <Header />
      <main className="flex min-h-0 flex-1">
        <ChartArea />
        <TradingPanel />
      </main>
      <PlaybackBar />
    </div>
  );
}
