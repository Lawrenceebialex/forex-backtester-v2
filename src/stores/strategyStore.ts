import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  DEFAULT_STRATEGY,
  MAX_STRATEGY_NAME_LENGTH,
  STRATEGY_COLORS,
  type Strategy,
} from '@/domain/strategy';

type Result = { ok: true } | { ok: false; error: string };

interface StrategyState {
  strategies: Strategy[];
  /** Always refers to a non-archived strategy. */
  activeId: string;
  createStrategy: (name: string) => Result;
  renameStrategy: (id: string, name: string) => Result;
  archiveStrategy: (id: string) => Result;
  restoreStrategy: (id: string) => void;
  setActive: (id: string) => void;
}

function checkName(strategies: readonly Strategy[], rawName: string, ignoreId?: string): string | null {
  const name = rawName.trim();
  if (name === '') return 'Give the strategy a name.';
  if (name.length > MAX_STRATEGY_NAME_LENGTH) return `Keep the name under ${MAX_STRATEGY_NAME_LENGTH} characters.`;
  const taken = strategies.some((s) => s.id !== ignoreId && s.name.toLowerCase() === name.toLowerCase());
  return taken ? `You already have a strategy called “${name}”.` : null;
}

const isStrategy = (value: unknown): value is Strategy => {
  const v = value as Partial<Strategy> | null;
  return typeof v === 'object' && v !== null && typeof v.id === 'string' && typeof v.name === 'string' &&
    typeof v.color === 'string' && typeof v.archived === 'boolean' && typeof v.createdAt === 'number';
};

export const useStrategyStore = create<StrategyState>()(
  persist(
    (set, get) => ({
      strategies: [DEFAULT_STRATEGY],
      activeId: DEFAULT_STRATEGY.id,

      createStrategy: (rawName) => {
        const { strategies } = get();
        const error = checkName(strategies, rawName);
        if (error) return { ok: false, error };
        const strategy: Strategy = {
          id: `strategy-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
          name: rawName.trim(),
          color: STRATEGY_COLORS[strategies.length % STRATEGY_COLORS.length],
          archived: false,
          createdAt: Date.now(),
        };
        set({ strategies: [...strategies, strategy], activeId: strategy.id });
        return { ok: true };
      },

      renameStrategy: (id, rawName) => {
        const { strategies } = get();
        const error = checkName(strategies, rawName, id);
        if (error) return { ok: false, error };
        set({ strategies: strategies.map((s) => (s.id === id ? { ...s, name: rawName.trim() } : s)) });
        return { ok: true };
      },

      archiveStrategy: (id) => {
        const { strategies, activeId } = get();
        const remaining = strategies.filter((s) => !s.archived && s.id !== id);
        if (remaining.length === 0) return { ok: false, error: 'Keep at least one active strategy.' };
        set({
          strategies: strategies.map((s) => (s.id === id ? { ...s, archived: true } : s)),
          activeId: activeId === id ? remaining[0].id : activeId,
        });
        return { ok: true };
      },

      restoreStrategy: (id) =>
        set((state) => ({ strategies: state.strategies.map((s) => (s.id === id ? { ...s, archived: false } : s)) })),

      setActive: (id) => {
        if (get().strategies.some((s) => s.id === id && !s.archived)) set({ activeId: id });
      },
    }),
    {
      name: 'fb-strategies',
      version: 1,
      partialize: (state) => ({ strategies: state.strategies, activeId: state.activeId }),
      merge: (persisted, current) => {
        const saved = persisted as Partial<Pick<StrategyState, 'strategies' | 'activeId'>> | undefined;
        let strategies = Array.isArray(saved?.strategies) ? saved.strategies.filter(isStrategy) : [];
        if (strategies.length === 0) strategies = [DEFAULT_STRATEGY];
        if (strategies.every((s) => s.archived)) strategies = strategies.map((s, i) => (i === 0 ? { ...s, archived: false } : s));
        const active = strategies.find((s) => s.id === saved?.activeId && !s.archived) ?? strategies.find((s) => !s.archived)!;
        return { ...current, strategies, activeId: active.id };
      },
    },
  ),
);
