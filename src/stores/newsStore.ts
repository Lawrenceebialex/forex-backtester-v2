import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { NewsImpact } from '@/domain/news';

interface NewsState {
  /** Draw news markers on the chart. */
  visible: boolean;
  /** 'high' shows only high-impact events; 'medium' shows medium and high. */
  minImpact: NewsImpact;
  setVisible: (visible: boolean) => void;
  setMinImpact: (impact: NewsImpact) => void;
}

export const useNewsStore = create<NewsState>()(
  persist(
    (set) => ({
      visible: true,
      minImpact: 'high',
      setVisible: (visible) => set({ visible }),
      setMinImpact: (minImpact) => set({ minImpact }),
    }),
    {
      name: 'fb-news',
      version: 1,
      partialize: (state) => ({ visible: state.visible, minImpact: state.minImpact }),
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<NewsState>;
        return {
          ...current,
          visible: typeof saved.visible === 'boolean' ? saved.visible : current.visible,
          minImpact: saved.minImpact === 'medium' || saved.minImpact === 'high' ? saved.minImpact : current.minImpact,
        };
      },
    },
  ),
);
