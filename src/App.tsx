import { useEffect } from 'react';
import { BreachAlert } from '@/components/challenge/BreachAlert';
import { AppShell } from '@/components/layout/AppShell';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { ShortcutsPanel } from '@/components/settings/ShortcutsPanel';
import { ToastViewport } from '@/components/ui/ToastViewport';
import {
  DEFAULT_START_TIME,
  REPLAY_RANGE,
  bootstrapMarketData,
} from '@/data/marketData';
import { usePlaybackEngine } from '@/hooks/usePlaybackEngine';
import { usePropEngine } from '@/hooks/usePropEngine';
import { useShortcuts } from '@/hooks/useShortcuts';
import { useTradingEngine } from '@/hooks/useTradingEngine';
import { usePlaybackStore } from '@/stores/playbackStore';

export default function App() {
  useEffect(() => {
    // Drop any clock saved while we still had mock/broken 2024-only data.
    try {
      localStorage.removeItem('fb-playback');
    } catch {
      /* ignore */
    }
    void bootstrapMarketData('EURUSD').then(() => {
      usePlaybackStore.setState({
        currentTime: DEFAULT_START_TIME,
        sessionRange: { ...REPLAY_RANGE },
        isPlaying: false,
        visibleRange: null,
      });
    });
  }, []);

  usePlaybackEngine();
  useTradingEngine();
  usePropEngine();
  useShortcuts();

  return (
    <>
      <AppShell />
      <ToastViewport />
      <BreachAlert />
      <SettingsModal />
      <ShortcutsPanel />
    </>
  );
}
