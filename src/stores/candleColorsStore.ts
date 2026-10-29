import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  CANDLE_PRESETS,
  DEFAULT_CANDLE_COLORS,
  normalizeHex,
  sanitizeColors,
  type CandleColorKey,
  type CandleColors,
} from '@/domain/candleColors';

interface CandleColorsState {
  colors: CandleColors;
  /** Sets one color. Invalid hex values are ignored. Editing a preset turns it into a custom set. */
  setColor: (key: CandleColorKey, value: string) => void;
  applyPreset: (presetId: string) => void;
  reset: () => void;
}

export const useCandleColorsStore = create<CandleColorsState>()(
  persist(
    (set) => ({
      colors: DEFAULT_CANDLE_COLORS,
      setColor: (key, value) => {
        const hex = normalizeHex(value);
        if (!hex) return;
        set((state) => ({ colors: { ...state.colors, [key]: hex } }));
      },
      applyPreset: (presetId) => {
        const preset = CANDLE_PRESETS.find((candidate) => candidate.id === presetId);
        if (preset) set({ colors: { ...preset.colors } });
      },
      reset: () => set({ colors: { ...DEFAULT_CANDLE_COLORS } }),
    }),
    {
      name: 'fb-candle-colors',
      version: 1,
      partialize: (state) => ({ colors: state.colors }),
      merge: (persisted, current) => ({
        ...current,
        colors: sanitizeColors((persisted as { colors?: unknown } | undefined)?.colors),
      }),
    },
  ),
);
