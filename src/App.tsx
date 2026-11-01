import { useEffect } from 'react';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { OnboardingScreen } from '@/components/onboarding/OnboardingScreen';
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
import { useAuthStore } from '@/stores/authStore';
import { usePlaybackStore } from '@/stores/playbackStore';

export default function App() {
  const user = useAuthStore((s) => s.user);
  const onboardingDone = useAuthStore((s) => s.onboardingDone);

  useEffect(() => {
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

  if (!user) {
    return <AuthScreen />;
  }

  if (!onboardingDone) {
    return <OnboardingScreen />;
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
