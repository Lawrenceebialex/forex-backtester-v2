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
  /**
   * The virtual clock: open time of the newest M1 candle revealed so far.
   * Candles after this time are never handed to the chart.
   */
  currentTime: UnixSeconds;
  /** The span of market time the clock can move across (the whole dataset). */
  sessionRange: TimeRange;
  /** The time range currently shown in the chart viewport (reported by the chart). */
  visibleRange: TimeRange | null;

  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  setSpeed: (speed: PlaybackSpeed) => void;
  setTimeframe: (timeframe: Timeframe) => void;
  /** Moves the clock forward by a number of M1 candles. Pauses automatically at the end of the data. */
  advance: (m1Candles: number) => void;
  /** Moves the clock forward by one candle's worth of time on the selected timeframe. */
  stepForward: () => void;
  /** Moves the clock to any time (forwards or backwards) and pauses. The account is never touched. */
  jumpTo: (time: UnixSeconds) => void;
  /** Back to where a new session starts. */
  reset: () => void;
  setVisibleRange: (range: TimeRange | null) => void;
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
        set({
          currentTime: M1_CANDLES[next].time,
          isPlaying: get().isPlaying && next < LAST_INDEX,
        });
      },

      stepForward: () => get().advance(TIMEFRAME_SECONDS[get().timeframe] / 60),

      jumpTo: (time) => set({ currentTime: snapToCandleTime(time), isPlaying: false }),

      reset: () => set({ currentTime: DEFAULT_START_TIME, isPlaying: false }),

      setVisibleRange: (visibleRange) => set({ visibleRange }),
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
