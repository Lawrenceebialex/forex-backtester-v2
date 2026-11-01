import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LOT_LIMITS } from '@/domain/trading';
import { clamp, roundTo } from '@/lib/math';

interface PreferencesState {
  /** Lot size the order ticket starts with and the B / S shortcuts trade. */
  defaultLots: number;
  /** Pause the replay the moment a prop firm rule is broken. */
  pauseOnBreach: boolean;
  /** Rule set preselected when starting a challenge (null = none). */
  defaultRuleSetId: string | null;
  setDefaultLots: (lots: number) => void;
  setPauseOnBreach: (pause: boolean) => void;
  setDefaultRuleSetId: (id: string | null) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      defaultLots: 0.1,
      pauseOnBreach: true,
      defaultRuleSetId: null,
      setDefaultLots: (lots) => set({ defaultLots: clamp(roundTo(lots, 2), LOT_LIMITS.min, LOT_LIMITS.max) }),
      setPauseOnBreach: (pauseOnBreach) => set({ pauseOnBreach }),
      setDefaultRuleSetId: (defaultRuleSetId) => set({ defaultRuleSetId }),
    }),
    {
      name: 'fb-preferences',
      version: 1,
      partialize: (s) => ({ defaultLots: s.defaultLots, pauseOnBreach: s.pauseOnBreach, defaultRuleSetId: s.defaultRuleSetId }),
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<PreferencesState>;
        return {
          ...current,
          defaultLots: typeof saved.defaultLots === 'number' && Number.isFinite(saved.defaultLots) ? clamp(roundTo(saved.defaultLots, 2), LOT_LIMITS.min, LOT_LIMITS.max) : current.defaultLots,
          pauseOnBreach: typeof saved.pauseOnBreach === 'boolean' ? saved.pauseOnBreach : current.pauseOnBreach,
          defaultRuleSetId: typeof saved.defaultRuleSetId === 'string' ? saved.defaultRuleSetId : null,
        };
      },
    },
  ),
);
