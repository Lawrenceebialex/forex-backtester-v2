import { useCallback, useEffect, useState } from 'react';
import { LandingPage } from '@/components/landing/LandingPage';
import { AppShell } from '@/components/layout/AppShell';
import { ToastViewport } from '@/components/ui/ToastViewport';
import {
  DEFAULT_START_TIME,
  REPLAY_RANGE,
  bootstrapMarketData,
} from '@/data/marketData';
import { usePlaybackEngine } from '@/hooks/usePlaybackEngine';
import { usePropEngine } from '@/hooks/usePropEngine';
import { useSessionSync } from '@/hooks/useSessionSync';
import { useShortcuts } from '@/hooks/useShortcuts';
import { useTradingEngine } from '@/hooks/useTradingEngine';
import { useAuthStore } from '@/stores/authStore';
import { usePlaybackStore } from '@/stores/playbackStore';
import { useUiStore } from '@/stores/uiStore';

/** TEMPORARY: skip sign in / register. */
export const AUTH_DISABLED = true;

function seedTester() {
  if (!AUTH_DISABLED) return;
  const auth = useAuthStore.getState();
  if (!auth.user) auth.register('tester@local.dev', 'Testpass1', 'Tester');
  if (!useAuthStore.getState().onboardingDone) {
    useAuthStore.getState().completeOnboarding();
  }
}

function AppEngines() {
  usePlaybackEngine();
  useTradingEngine();
  useSessionSync();
  usePropEngine();
  useShortcuts();
  return null;
}

export default function App() {
  // Always start on landing after a crash recovery; only skip if explicitly chosen this session.
  const [entered, setEntered] = useState(false);
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    seedTester();
    // Force a known-safe starting view (dashboard, not workspace/chart).
    useUiStore.setState({ view: 'dashboard', cutMode: false });
    try {
      localStorage.removeItem('fb-playback');
    } catch {
      /* ignore */
    }
    let cancelled = false;
    void bootstrapMarketData('EURUSD')
      .then(() => {
        if (cancelled) return;
        usePlaybackStore.setState({
          currentTime: DEFAULT_START_TIME,
          sessionRange: { ...REPLAY_RANGE },
          isPlaying: false,
          visibleRange: null,
        });
        setBooted(true);
      })
      .catch((err) => {
        console.error('Market data bootstrap failed', err);
        if (!cancelled) setBooted(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const enterApp = useCallback(() => {
    seedTester();
    useUiStore.setState({ view: 'dashboard' });
    setEntered(true);
  }, []);

  if (!entered) {
    return <LandingPage onEnter={enterApp} />;
  }

  return (
    <>
      {booted ? <AppEngines /> : null}
      <AppShell />
      <ToastViewport />
    </>
  );
}
