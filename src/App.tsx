import { useEffect, useState } from 'react';
import { LandingPage } from '@/components/landing/LandingPage';
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
import { useSessionSync } from '@/hooks/useSessionSync';
import { useShortcuts } from '@/hooks/useShortcuts';
import { useTradingEngine } from '@/hooks/useTradingEngine';
import { useAuthStore } from '@/stores/authStore';
import { usePlaybackStore } from '@/stores/playbackStore';

/** TEMPORARY: skip sign in / register. Set false to restore auth gate. */
export const AUTH_DISABLED = true;

/** Seed a local tester profile once (outside render) so effects cannot loop. */
function ensureTesterProfile() {
  if (!AUTH_DISABLED) return;
  const state = useAuthStore.getState();
  if (!state.user) {
    state.register('tester@local.dev', 'Testpass1', 'Tester');
  }
  if (!useAuthStore.getState().onboardingDone) {
    useAuthStore.getState().completeOnboarding();
  }
}

export default function App() {
  const [showLanding, setShowLanding] = useState(() => {
    try {
      return localStorage.getItem('fb-skip-landing') !== '1';
    } catch {
      return true;
    }
  });

  // Run once on mount — never depends on user/onboarding state.
  useEffect(() => {
    ensureTesterProfile();
    try {
      localStorage.removeItem('fb-playback');
    } catch {
      /* ignore */
    }
    void bootstrapMarketData('EURUSD')
      .then(() => {
        usePlaybackStore.setState({
          currentTime: DEFAULT_START_TIME,
          sessionRange: { ...REPLAY_RANGE },
          isPlaying: false,
          visibleRange: null,
        });
      })
      .catch((err) => console.error('Market data bootstrap failed', err));
  }, []);

  usePlaybackEngine();
  useTradingEngine();
  useSessionSync();
  usePropEngine();
  useShortcuts();

  const enterApp = () => {
    ensureTesterProfile();
    try {
      localStorage.setItem('fb-skip-landing', '1');
    } catch {
      /* ignore */
    }
    setShowLanding(false);
  };

  if (showLanding) {
    return <LandingPage onEnter={enterApp} />;
  }

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
