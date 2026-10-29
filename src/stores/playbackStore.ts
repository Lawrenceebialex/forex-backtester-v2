import { create } from 'zustand';
import { LAST_INDEX, M1_CANDLES, REPLAY_RANGE, indexAtOrBefore } from '@/data/marketData';
import {
  TIMEFRAME_SECONDS,
  type PlaybackSpeed,
  type TimeRange,
  type Timeframe,
  type UnixSeconds,
} from '@/domain/market';

interface PlaybackState {
  isPlaying: boolean;
  speed: PlaybackSpeed;
  timeframe: Timeframe;
  /**
   * The virtual clock: open time of the newest M1 candle revealed so far.
   * Candles after this time are never handed to the chart.
   */
  currentTime: UnixSeconds;
  /** The span of market time this replay can cover (replay start → last candle). */
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
  reset: () => void;
  setVisibleRange: (range: TimeRange | null) => void;
}

export const usePlaybackStore = create<PlaybackState>()((set, get) => ({
  isPlaying: false,
  speed: 1,
  timeframe: '1m',
  currentTime: REPLAY_RANGE.from,
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

  reset: () => set({ currentTime: REPLAY_RANGE.from, isPlaying: false }),

  setVisibleRange: (visibleRange) => set({ visibleRange }),
}));
