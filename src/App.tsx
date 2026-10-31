import { useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ToastViewport } from '@/components/ui/ToastViewport';
import { bootstrapMarketData, DEFAULT_START_TIME } from '@/data/marketData';
import { usePlaybackEngine } from '@/hooks/usePlaybackEngine';
import { useTradingEngine } from '@/hooks/useTradingEngine';
import { usePlaybackStore } from '@/stores/playbackStore';

function Engines() {
  usePlaybackEngine();
  useTradingEngine();
  return null;
}

export default function App() {
  useEffect(() => {
    void bootstrapMarketData('EURUSD').then(() => {
      // Drop any old mock clock stuck in localStorage, then jump into real history.
      try {
        localStorage.removeItem('fb-playback');
      } catch {
        /* ignore */
      }
      usePlaybackStore.getState().jumpTo(DEFAULT_START_TIME);
    });
  }, []);

  return (
    <>
      <Engines />
      <AppShell />
      <ToastViewport />
    </>
  );
}
