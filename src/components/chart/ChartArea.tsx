import { Scissors } from 'lucide-react';
import { cn } from '@/lib/cn';
import { usePlaybackStore } from '@/stores/playbackStore';
import { useUiStore } from '@/stores/uiStore';
import { ToolbarButton } from '@/components/ui/ToolbarButton';
import { ChartView } from './ChartView';
import { JumpToDate } from './JumpToDate';
import { TimeframeSelector } from './TimeframeSelector';

function ReplayStatus() {
  const isPlaying = usePlaybackStore((state) => state.isPlaying);
  return (
    <div className="ml-auto hidden shrink-0 items-center gap-2 text-xs text-ink-muted lg:flex" role="status">
      <span className={cn('h-1.5 w-1.5 rounded-full', isPlaying ? 'animate-pulse bg-bull' : 'bg-ink-subtle')} />
      {isPlaying ? 'Replaying' : 'Paused'}
    </div>
  );
}

export function ChartArea() {
  const cutMode = useUiStore((state) => state.cutMode);
  const setCutMode = useUiStore((state) => state.setCutMode);
  const pause = usePlaybackStore((state) => state.pause);

  return (
    <section aria-label="Chart" className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="no-scrollbar flex h-12 shrink-0 items-center gap-2 overflow-x-auto border-b border-line bg-surface px-3 md:gap-3 md:px-4 coarse:h-14">
        <TimeframeSelector />
        <div className="mx-0.5 h-5 w-px shrink-0 bg-line" />
        <JumpToDate />
        <ToolbarButton
          icon={Scissors}
          label="Cut chart"
          active={cutMode}
          onClick={() => {
            pause();
            setCutMode(!cutMode);
          }}
        />
        <ReplayStatus />
      </div>
      <ChartView />
    </section>
  );
}
