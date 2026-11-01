import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { NEWS_EVENTS } from '@/data/newsEvents';
import type { UnixSeconds } from '@/domain/market';
import { DEFAULT_RULES, type Challenge, type RuleSet, type Rules } from '@/domain/propFirm';
import type { ClosedTrade, Position } from '@/domain/trading';
import { createThrottledStorage } from '@/lib/debouncedStorage';
import {
  applyBreaches,
  evaluateClosedTrade,
  evaluateNewPosition,
  evaluateTick,
  evaluateWeekend,
  type BreachDraft,
  type RuleSnapshot,
} from '@/lib/propRules';
import { useToastStore } from './toastStore';

/** What the challenge needs to know about the account when it starts. */
export interface ChallengeStart {
  time: UnixSeconds;
  balance: number;
  equity: number;
  /** The account's next trade number: earlier trades are not part of the challenge. */
  nextTradeNumber: number;
}

interface PropState {
  ruleSets: RuleSet[];
  /** The challenge in progress (or finished); null when none has been started. */
  challenge: Challenge | null;
  /** Breach keys the user has not been alerted about yet. */
  unseen: string[];

  /** Creates (no id) or updates a rule set. Returns its id. */
  saveRuleSet: (ruleSet: { id?: string; name: string; rules: Rules }) => string;
  deleteRuleSet: (id: string) => void;
  duplicateRuleSet: (id: string) => void;

  startChallenge: (ruleSetId: string, start: ChallengeStart) => void;
  /** Starts the same rule set again from the account's current state (e.g. after an account reset). */
  restartChallenge: (start: ChallengeStart) => void;
  endChallenge: (time: UnixSeconds) => void;
  clearChallenge: () => void;
  dismissAlert: (key: string) => void;

  // Called by the prop engine as the account changes.
  applyTick: (snapshot: RuleSnapshot) => void;
  applyNewPosition: (position: Position, allTrades: readonly (Position | ClosedTrade)[]) => void;
  applyClosedTrade: (trade: ClosedTrade) => void;
  applyWeekend: (gapTimes: readonly UnixSeconds[], allTrades: readonly (Position | ClosedTrade)[]) => void;
}

const SEED_RULE_SETS: RuleSet[] = [
  { id: 'seed-standard', name: 'Standard challenge', createdAt: 0, rules: DEFAULT_RULES },
  {
    id: 'seed-trailing',
    name: 'Trailing drawdown, no news or weekends',
    createdAt: 0,
    rules: {
      ...DEFAULT_RULES,
      dailyLoss: { enabled: true, unit: 'percent', value: 4 },
      totalLoss: { enabled: false, unit: 'percent', value: 10 },
      trailingDrawdown: { enabled: true, unit: 'percent', value: 6 },
      profitTarget: { enabled: true, unit: 'percent', value: 10 },
      newsTrading: { blocked: true, windowMinutes: 5 },
      weekendHolding: { blocked: true },
    },
  },
];

/** Fills in anything missing from older saves with defaults. */
function normalizeRules(raw: unknown): Rules {
  const source = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const merged = { ...DEFAULT_RULES } as Record<string, unknown>;
  for (const key of Object.keys(DEFAULT_RULES)) {
    const value = source[key];
    if (typeof value === 'object' && value !== null) merged[key] = { ...(DEFAULT_RULES as unknown as Record<string, object>)[key], ...value };
  }
  return merged as unknown as Rules;
}

const isRuleSet = (value: unknown): value is RuleSet => {
  const v = value as Partial<RuleSet> | null;
  return typeof v === 'object' && v !== null && typeof v.id === 'string' && typeof v.name === 'string' && typeof v.rules === 'object';
};

function newChallenge(ruleSet: RuleSet, start: ChallengeStart): Challenge {
  return {
    ruleSetId: ruleSet.id,
    ruleSetName: ruleSet.name,
    rules: JSON.parse(JSON.stringify(ruleSet.rules)) as Rules,
    startedAt: start.time,
    startingBalance: start.balance,
    firstTradeNumber: start.nextTradeNumber,
    peakEquity: start.equity,
    dayStarts: {},
    breaches: [],
    status: 'active',
    resolvedAt: null,
    endedAt: null,
  };
}

export const usePropStore = create<PropState>()(
  persist(
    (set, get) => {
      /** Stores the updated challenge, queues alerts for new breaches and announces a pass. */
      const commit = (previous: Challenge, evaluated: Challenge, drafts: readonly BreachDraft[]) => {
        const next = applyBreaches(evaluated, drafts, Date.now());
        if (next === previous) return;
        const added = next.breaches.slice(previous.breaches.length).map((breach) => breach.key);
        set((state) => ({ challenge: next, unseen: [...state.unseen, ...added] }));
        if (previous.status === 'active' && next.status === 'passed') {
          useToastStore.getState().push({ tone: 'bull', title: 'Challenge passed', description: 'Profit target reached with every rule intact.' });
        }
      };
      const active = (): Challenge | null => {
        const { challenge } = get();
        return challenge && challenge.endedAt === null ? challenge : null;
      };

      return {
        ruleSets: SEED_RULE_SETS,
        challenge: null,
        unseen: [],

        saveRuleSet: ({ id, name, rules }) => {
          const trimmed = name.trim() || 'Untitled rule set';
          if (id && get().ruleSets.some((ruleSet) => ruleSet.id === id)) {
            set((state) => ({ ruleSets: state.ruleSets.map((ruleSet) => (ruleSet.id === id ? { ...ruleSet, name: trimmed, rules } : ruleSet)) }));
            return id;
          }
          const created: RuleSet = { id: `rules-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, name: trimmed, createdAt: Date.now(), rules };
          set((state) => ({ ruleSets: [...state.ruleSets, created] }));
          return created.id;
        },

        deleteRuleSet: (id) => set((state) => ({ ruleSets: state.ruleSets.filter((ruleSet) => ruleSet.id !== id) })),

        duplicateRuleSet: (id) => {
          const original = get().ruleSets.find((ruleSet) => ruleSet.id === id);
          if (original) get().saveRuleSet({ name: `${original.name} (copy)`, rules: JSON.parse(JSON.stringify(original.rules)) as Rules });
        },

        startChallenge: (ruleSetId, start) => {
          const ruleSet = get().ruleSets.find((candidate) => candidate.id === ruleSetId);
          if (ruleSet) set({ challenge: newChallenge(ruleSet, start), unseen: [] });
        },

        restartChallenge: (start) => {
          const { challenge, ruleSets } = get();
          if (!challenge) return;
          const ruleSet = ruleSets.find((candidate) => candidate.id === challenge.ruleSetId) ?? {
            id: challenge.ruleSetId,
            name: challenge.ruleSetName,
            createdAt: 0,
            rules: challenge.rules,
          };
          set({ challenge: newChallenge(ruleSet, start), unseen: [] });
        },

        endChallenge: (time) => {
          const challenge = active();
          if (challenge) set({ challenge: { ...challenge, endedAt: time, status: challenge.status === 'active' ? 'ended' : challenge.status } });
        },

        clearChallenge: () => set({ challenge: null, unseen: [] }),
        dismissAlert: (key) => set((state) => ({ unseen: state.unseen.filter((candidate) => candidate !== key) })),

        applyTick: (snapshot) => {
          const challenge = active();
          if (!challenge) return;
          const { challenge: evaluated, drafts } = evaluateTick(challenge, snapshot);
          commit(challenge, evaluated, drafts);
        },
        applyNewPosition: (position, allTrades) => {
          const challenge = active();
          if (challenge && position.number >= challenge.firstTradeNumber) {
            commit(challenge, challenge, evaluateNewPosition(challenge, position, allTrades, NEWS_EVENTS));
          }
        },
        applyClosedTrade: (trade) => {
          const challenge = active();
          if (challenge && trade.number >= challenge.firstTradeNumber) commit(challenge, challenge, evaluateClosedTrade(challenge, trade, NEWS_EVENTS));
        },
        applyWeekend: (gapTimes, allTrades) => {
          const challenge = active();
          if (challenge) commit(challenge, challenge, evaluateWeekend(challenge, gapTimes, allTrades));
        },
      };
    },
    {
      name: 'fb-prop',
      version: 1,
      storage: createThrottledStorage(),
      partialize: (state) => ({ ruleSets: state.ruleSets, challenge: state.challenge, unseen: state.unseen }),
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<PropState>;
        const ruleSets = Array.isArray(saved.ruleSets) ? saved.ruleSets.filter(isRuleSet).map((r) => ({ ...r, rules: normalizeRules(r.rules) })) : [];
        const challenge =
          saved.challenge && typeof saved.challenge === 'object' && 'rules' in saved.challenge
            ? { ...saved.challenge, rules: normalizeRules(saved.challenge.rules) }
            : null;
        return {
          ...current,
          ruleSets: ruleSets.length > 0 ? ruleSets : SEED_RULE_SETS,
          challenge,
          unseen: Array.isArray(saved.unseen) ? saved.unseen.filter((key): key is string => typeof key === 'string') : [],
        };
      },
    },
  ),
);
