import { useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ToastViewport } from '@/components/ui/ToastViewport';
import { bootstrapMarketData } from '@/data/marketData';
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
      // Jump to the start of the loaded history once R2 data is in.
      usePlaybackStore.getState().reset();
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
