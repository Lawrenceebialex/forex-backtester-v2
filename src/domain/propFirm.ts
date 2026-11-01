import type { UnixSeconds } from './market';

export type LimitUnit = 'percent' | 'amount';

/** A limit expressed as a percentage of the starting balance or as a fixed amount. */
export interface LimitRule {
  enabled: boolean;
  unit: LimitUnit;
  value: number;
}

export interface Rules {
  dailyLoss: LimitRule;
  totalLoss: LimitRule;
  /** Optional: the loss limit follows the highest equity reached. */
  trailingDrawdown: LimitRule;
  profitTarget: LimitRule;
  maxLotSize: { enabled: boolean; lots: number };
  /** Each trade's lot size must stay within ±tolerance of the average of the previous trades. */
  lotConsistency: { enabled: boolean; tolerancePercent: number };
  /** No single trade may make up more than this share of the total profit (checked at the target). */
  profitConsistency: { enabled: boolean; maxSharePercent: number };
  /** When blocked, opening or manually closing within the window of a high-impact event breaks the rule. */
  newsTrading: { blocked: boolean; windowMinutes: number };
  weekendHolding: { blocked: boolean };
}

export type RuleId = keyof Rules;

export interface RuleSet {
  id: string;
  name: string;
  createdAt: number;
  rules: Rules;
}

export interface BreachFact {
  label: string;
  value: string;
}

export interface Breach {
  /** Identifies the circumstance (rule + day / trade / event) so it is only recorded once. */
  key: string;
  rule: RuleId;
  title: string;
  /** Market time (UTC, replay clock) at which the rule was broken. */
  time: UnixSeconds;
  /** Real clock time the app recorded it. */
  recordedAt: number;
  summary: string;
  facts: BreachFact[];
}

export type ChallengeStatus = 'active' | 'failed' | 'passed' | 'ended';

export interface Challenge {
  ruleSetId: string;
  ruleSetName: string;
  /** A copy taken at the start, so editing a rule set never changes a challenge in progress. */
  rules: Rules;
  startedAt: UnixSeconds;
  startingBalance: number;
  /** Trades numbered below this belong to the account before the challenge began. */
  firstTradeNumber: number;
  peakEquity: number;
  /** Equity at the first moment seen on each UTC day (day number → equity). */
  dayStarts: Record<string, number>;
  breaches: Breach[];
  status: ChallengeStatus;
  /** Market time the status last left "active" (failed / passed). */
  resolvedAt: UnixSeconds | null;
  endedAt: UnixSeconds | null;
}

export const DEFAULT_RULES: Rules = {
  dailyLoss: { enabled: true, unit: 'percent', value: 5 },
  totalLoss: { enabled: true, unit: 'percent', value: 10 },
  trailingDrawdown: { enabled: false, unit: 'percent', value: 6 },
  profitTarget: { enabled: true, unit: 'percent', value: 8 },
  maxLotSize: { enabled: false, lots: 5 },
  lotConsistency: { enabled: false, tolerancePercent: 50 },
  profitConsistency: { enabled: false, maxSharePercent: 40 },
  newsTrading: { blocked: false, windowMinutes: 5 },
  weekendHolding: { blocked: false },
};

export const RULE_TITLES: Record<RuleId, string> = {
  dailyLoss: 'Maximum daily loss',
  totalLoss: 'Maximum total loss',
  trailingDrawdown: 'Trailing drawdown',
  profitTarget: 'Profit target',
  maxLotSize: 'Maximum lot size',
  lotConsistency: 'Lot-size consistency',
  profitConsistency: 'Profit consistency',
  newsTrading: 'News trading',
  weekendHolding: 'Weekend holding',
};
