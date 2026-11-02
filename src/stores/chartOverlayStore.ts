import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CustomCrossTime } from '@/data/sessions';

interface ChartOverlayState {
  showSessions: boolean;
  showKillzones: boolean;
  showMajorNews: boolean;
  customCrosses: CustomCrossTime[];
  setShowSessions: (v: boolean) => void;
  setShowKillzones: (v: boolean) => void;
  setShowMajorNews: (v: boolean) => void;
  addCustomCross: (label: string, minuteUtc: number) => void;
  removeCustomCross: (id: string) => void;
}

export const useChartOverlayStore = create<ChartOverlayState>()(
  persist(
    (set) => ({
      showSessions: false,
      showKillzones: false,
      showMajorNews: true,
      customCrosses: [],
      setShowSessions: (showSessions) => set({ showSessions }),
      setShowKillzones: (showKillzones) => set({ showKillzones }),
      setShowMajorNews: (showMajorNews) => set({ showMajorNews }),
      addCustomCross: (label, minuteUtc) =>
        set((s) => ({
          customCrosses: [
            ...s.customCrosses,
            {
              id: `cx-${Date.now().toString(36)}`,
              label: label.trim() || 'Custom',
              minuteUtc: ((minuteUtc % 1440) + 1440) % 1440,
            },
          ],
        })),
      removeCustomCross: (id) =>
        set((s) => ({ customCrosses: s.customCrosses.filter((c) => c.id !== id) })),
    }),
    { name: 'fb-chart-overlays' },
  ),
);
