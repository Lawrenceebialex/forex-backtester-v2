import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  createSessionId,
  type BacktestConfig,
  type BacktestSession,
  type BacktestStatus,
} from '@/domain/backtest';

interface BacktestState {
  sessions: BacktestSession[];
  activeSessionId: string | null;
  draftConfig: Partial<BacktestConfig> | null;
  setDraft: (patch: Partial<BacktestConfig>) => void;
  clearDraft: () => void;
  createSession: (config: BacktestConfig) => string;
  setActive: (id: string | null) => void;
  updateSession: (
    id: string,
    patch: Partial<Pick<BacktestSession, 'status' | 'tradeCount' | 'netPnl' | 'updatedAt'>>,
  ) => void;
  removeSession: (id: string) => void;
}

export const useBacktestStore = create<BacktestState>()(
  persist(
    (set) => ({
      sessions: [],
      activeSessionId: null,
      draftConfig: null,

      setDraft: (patch) => set((s) => ({ draftConfig: { ...(s.draftConfig ?? {}), ...patch } })),

      clearDraft: () => set({ draftConfig: null }),

      createSession: (config) => {
        const id = createSessionId();
        const now = Date.now();
        const session: BacktestSession = {
          id,
          config,
          status: 'in_progress',
          createdAt: now,
          updatedAt: now,
          tradeCount: 0,
          netPnl: 0,
        };
        set((s) => ({
          sessions: [session, ...s.sessions],
          activeSessionId: id,
          draftConfig: null,
        }));
        return id;
      },

      setActive: (id) => set({ activeSessionId: id }),

      updateSession: (id, patch) =>
        set((s) => ({
          sessions: s.sessions.map((session) =>
            session.id === id ? { ...session, ...patch, updatedAt: Date.now() } : session,
          ),
        })),

      removeSession: (id) =>
        set((s) => ({
          sessions: s.sessions.filter((x) => x.id !== id),
          activeSessionId: s.activeSessionId === id ? null : s.activeSessionId,
        })),
    }),
    { name: 'fb-backtests' },
  ),
);

export function statusLabel(status: BacktestStatus): string {
  if (status === 'in_progress') return 'In Progress';
  if (status === 'completed') return 'Completed';
  return 'Draft';
}
