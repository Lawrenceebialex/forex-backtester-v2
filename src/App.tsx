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

/**
 * TEMPORARY for testing: skip sign in / register entirely.
 * Flip to false when you want the real auth gate again.
 */
export const AUTH_DISABLED = true;

export default function App() {
  const user = useAuthStore((s) => s.user);
  const onboardingDone = useAuthStore((s) => s.onboardingDone);
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);
  const register = useAuthStore((s) => s.register);

  const [showLanding, setShowLanding] = useState(() => {
    try {
      return localStorage.getItem('fb-skip-landing') !== '1';
    } catch {
      return true;
    }
  });

  useEffect(() => {
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

  // Seed a local tester profile when auth is bypassed.
  useEffect(() => {
    if (!AUTH_DISABLED) return;
    if (!user) {
      register('tester@local.dev', 'Testpass1', 'Tester');
    }
    if (!onboardingDone) {
      completeOnboarding();
    }
  }, [user, onboardingDone, register, completeOnboarding]);

  const enterApp = () => {
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
