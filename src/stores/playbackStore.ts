import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  DEFAULT_START_TIME,
  LAST_INDEX,
  M1_CANDLES,
  REPLAY_RANGE,
  indexAtOrBefore,
  snapToCandleTime,
} from '@/data/marketData';
import {
  PLAYBACK_SPEEDS,
  TIMEFRAMES,
  TIMEFRAME_SECONDS,
  type PlaybackSpeed,
  type TimeRange,
  type Timeframe,
  type UnixSeconds,
} from '@/domain/market';
import { createThrottledStorage } from '@/lib/debouncedStorage';

interface PlaybackState {
  isPlaying: boolean;
  speed: PlaybackSpeed;
  timeframe: Timeframe;
  currentTime: UnixSeconds;
  sessionRange: TimeRange;
  visibleRange: TimeRange | null;

  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  setSpeed: (speed: PlaybackSpeed) => void;
  setTimeframe: (timeframe: Timeframe) => void;
  advance: (m1Candles: number) => void;
  stepForward: () => void;
  stepBackward: () => void;
  jumpTo: (time: UnixSeconds) => void;
  reset: () => void;
  setVisibleRange: (range: TimeRange | null) => void;
}

function sameRange(a: TimeRange | null, b: TimeRange | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.from === b.from && a.to === b.to;
}

export const usePlaybackStore = create<PlaybackState>()(
  persist(
    (set, get) => ({
      isPlaying: false,
      speed: 1,
      timeframe: '1m',
      currentTime: DEFAULT_START_TIME,
      sessionRange: REPLAY_RANGE,
      visibleRange: null,

      play: () => {
        if (get().currentTime < get().sessionRange.to) set({ isPlaying: true });
      },
      pause: () => set({ isPlaying: false }),
      togglePlay: () => (get().isPlaying ? get().pause() : get().play()),
      setSpeed: (speed) => set({ speed }),
      setTimeframe: (timeframe) => set({ timeframe }),

      advance: (m1Candles) => {
        const index = indexAtOrBefore(get().currentTime);
        const next = Math.min(index + Math.max(1, Math.floor(m1Candles)), LAST_INDEX);
        if (!M1_CANDLES[next]) return;
        set({
          currentTime: M1_CANDLES[next].time,
          isPlaying: get().isPlaying && next < LAST_INDEX,
        });
      },

      stepForward: () => get().advance(TIMEFRAME_SECONDS[get().timeframe] / 60),

      stepBackward: () => {
        const index = indexAtOrBefore(get().currentTime);
        const prev = Math.max(0, index - TIMEFRAME_SECONDS[get().timeframe] / 60);
        if (!M1_CANDLES[prev]) return;
        get().jumpTo(M1_CANDLES[prev].time);
      },

      jumpTo: (time) => set({ currentTime: snapToCandleTime(time), isPlaying: false }),

      reset: () => set({ currentTime: DEFAULT_START_TIME, isPlaying: false }),

      // Guard: chart resize/pan can spam identical ranges; writing every time caused #185.
      setVisibleRange: (visibleRange) => {
        if (sameRange(get().visibleRange, visibleRange)) return;
        set({ visibleRange });
      },
    }),
    {
      name: 'fb-playback',
      version: 1,
      storage: createThrottledStorage(),
      partialize: (state) => ({ currentTime: state.currentTime, timeframe: state.timeframe, speed: state.speed }),
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<Pick<PlaybackState, 'currentTime' | 'timeframe' | 'speed'>>;
        return {
          ...current,
          currentTime:
            typeof saved.currentTime === 'number' && Number.isFinite(saved.currentTime)
              ? snapToCandleTime(saved.currentTime)
              : current.currentTime,
          timeframe: TIMEFRAMES.includes(saved.timeframe as Timeframe) ? (saved.timeframe as Timeframe) : current.timeframe,
          speed: PLAYBACK_SPEEDS.includes(saved.speed as PlaybackSpeed) ? (saved.speed as PlaybackSpeed) : current.speed,
        };
      },
    },
  ),
);
