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

/** Engines only run after the user leaves the landing page. */
function AppEngines() {
  usePlaybackEngine();
  useTradingEngine();
  useSessionSync();
  usePropEngine();
  useShortcuts();
  return null;
}

export default function App() {
  const [entered, setEntered] = useState(() => {
    try {
      return localStorage.getItem('fb-skip-landing') === '1';
    } catch {
      return false;
    }
  });
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    seedTester();
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
    try {
      localStorage.setItem('fb-skip-landing', '1');
    } catch {
      /* ignore */
    }
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
