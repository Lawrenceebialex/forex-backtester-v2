import { AppShell } from '@/components/layout/AppShell';
import { ToastViewport } from '@/components/ui/ToastViewport';
import { usePlaybackEngine } from '@/hooks/usePlaybackEngine';
import { useTradingEngine } from '@/hooks/useTradingEngine';

export default function App() {
  usePlaybackEngine();
  useTradingEngine();
  return (
    <>
      <AppShell />
      <ToastViewport />
    </>
  );
}
