import { Pause, Play, RotateCcw, StepForward } from 'lucide-react';
import { replayProgress } from '@/data/marketData';
import { PLAYBACK_SPEEDS, type PlaybackSpeed } from '@/domain/market';
import { cn } from '@/lib/cn';
import { usePlaybackStore } from '@/stores/playbackStore';
import { IconButton } from '@/components/ui/IconButton';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { ProgressBar } from './ProgressBar';
import { VirtualClock } from './VirtualClock';

const SPEED_OPTIONS = PLAYBACK_SPEEDS.map((speed) => ({
  value: speed,
  label: speed === 'max' ? 'Max' : `${speed}×`,
}));

/**
 * Phone:   clock + progress on top, transport and a scrollable speed selector below.
 * iPad/PC: one row — transport, speed, progress, clock.
 */
export function PlaybackBar() {
  const isPlaying = usePlaybackStore((state) => state.isPlaying);
  const speed = usePlaybackStore((state) => state.speed);
  const currentTime = usePlaybackStore((state) => state.currentTime);
  const sessionEnd = usePlaybackStore((state) => state.sessionRange.to);
  const togglePlay = usePlaybackStore((state) => state.togglePlay);
  const stepForward = usePlaybackStore((state) => state.stepForward);
  const setSpeed = usePlaybackStore((state) => state.setSpeed);
  const reset = usePlaybackStore((state) => state.reset);

  const atEnd = currentTime >= sessionEnd;
  const progress = replayProgress(currentTime);

  return (
    <footer className="shrink-0 border-t border-line bg-surface md:pb-[env(safe-area-inset-bottom)]">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2 md:flex-nowrap md:gap-x-4 md:px-4 md:py-2.5">
        <div className="order-1 flex w-full flex-col gap-1.5 md:order-3 md:min-w-0 md:flex-1 md:flex-row md:items-center md:gap-4">
          <VirtualClock time={currentTime} progress={progress} className="md:order-2" />
          <ProgressBar value={progress} className="md:order-1 md:flex-1" />
        </div>

        <div className="order-2 flex items-center gap-1 md:order-1">
          <button
            type="button"
            onClick={togglePlay}
            disabled={atEnd}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            title={isPlaying ? 'Pause' : 'Play'}
            className={cn(
              'inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-ink shadow-sm transition',
              'hover:brightness-110 active:scale-95 disabled:pointer-events-none disabled:opacity-40 coarse:h-12 coarse:w-12',
            )}
          >
            {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
          </button>
          <IconButton label="Step forward" onClick={stepForward} disabled={atEnd}>
            <StepForward size={18} />
          </IconButton>
          <IconButton label="Back to session start" onClick={reset}>
            <RotateCcw size={17} />
          </IconButton>
        </div>

        <div className="no-scrollbar order-3 min-w-0 flex-1 overflow-x-auto md:order-2 md:flex-none">
          <SegmentedControl<PlaybackSpeed>
            label="Playback speed"
            options={SPEED_OPTIONS}
            value={speed}
            onChange={setSpeed}
          />
        </div>
      </div>
    </footer>
  );
}
