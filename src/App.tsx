import { BreachAlert } from '@/components/challenge/BreachAlert';
import { AppShell } from '@/components/layout/AppShell';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { ShortcutsPanel } from '@/components/settings/ShortcutsPanel';
import { ToastViewport } from '@/components/ui/ToastViewport';
import { usePlaybackEngine } from '@/hooks/usePlaybackEngine';
import { usePropEngine } from '@/hooks/usePropEngine';
import { useShortcuts } from '@/hooks/useShortcuts';
import { useTradingEngine } from '@/hooks/useTradingEngine';

export default function App() {
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
