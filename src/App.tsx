import { AppShell } from '@/components/layout/AppShell';
import { usePlaybackEngine } from '@/hooks/usePlaybackEngine';

export default function App() {
  usePlaybackEngine();
  return <AppShell />;
}
