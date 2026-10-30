import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ToastViewport } from '@/components/ui/ToastViewport';
import { bootstrapMarketData, isMarketDataReady, subscribeMarketData } from '@/data/marketData';
import { usePlaybackEngine } from '@/hooks/usePlaybackEngine';
import { useTradingEngine } from '@/hooks/useTradingEngine';

function Engines() {
  usePlaybackEngine();
  useTradingEngine();
  return null;
}

export default function App() {
  const [ready, setReady] = useState(isMarketDataReady());
  const [status, setStatus] = useState('Loading market data…');

  useEffect(() => {
    let cancelled = false;
    setStatus('Loading EURUSD history from R2…');
    bootstrapMarketData('EURUSD').finally(() => {
      if (!cancelled) {
        setReady(true);
        setStatus('');
      }
    });
    return subscribeMarketData(() => {
      if (!cancelled) setReady(isMarketDataReady());
    });
  }, []);

  if (!ready && status) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-3 bg-canvas text-ink">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        <p className="text-sm text-ink-muted">{status}</p>
        <p className="max-w-xs text-center text-xs text-ink-subtle">
          Using public R2 data. Broken timestamps are repaired automatically.
        </p>
      </div>
    );
  }

  return (
    <>
      <Engines />
      <AppShell />
      <ToastViewport />
    </>
  );
}
