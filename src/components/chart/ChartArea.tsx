import { cn } from '@/lib/cn';
import { usePlaybackStore } from '@/stores/playbackStore';
import { ChartView } from './ChartView';
import { TimeframeSelector } from './TimeframeSelector';

function ReplayStatus() {
  const isPlaying = usePlaybackStore((state) => state.isPlaying);
  return (
    <div className="ml-auto hidden shrink-0 items-center gap-2 text-xs text-ink-muted sm:flex" role="status">
      <span className={cn('h-1.5 w-1.5 rounded-full', isPlaying ? 'animate-pulse bg-bull' : 'bg-ink-subtle')} />
      {isPlaying ? 'Replaying' : 'Paused'}
    </div>
  );
}

export function ChartArea() {
  return (
    <section aria-label="Chart" className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="no-scrollbar flex h-12 shrink-0 items-center gap-3 overflow-x-auto border-b border-line bg-surface px-3 md:px-4 coarse:h-14">
        <TimeframeSelector />
        <ReplayStatus />
      </div>
      <ChartView />
    </section>
  );
}
