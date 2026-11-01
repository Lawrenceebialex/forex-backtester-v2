/** Prop-firm rule evaluation (from final Claude package). */
import { findBlockingEvent } from '@/data/newsEvents';
import type { UnixSeconds } from '@/domain/market';
import type { NewsEvent } from '@/domain/news';
import {
  RULE_TITLES,
  type Breach,
  type BreachFact,
  type Challenge,
  type LimitRule,
  type RuleId,
  type Rules,
} from '@/domain/propFirm';
import type { ClosedTrade, Position } from '@/domain/trading';
import { formatMoney, formatPercent } from './format';

export type BreachDraft = Omit<Breach, 'recordedAt'>;

export interface RuleSnapshot {
  time: UnixSeconds;
  balance: number;
  equity: number;
  positions: readonly Position[];
  closedTrades: readonly ClosedTrade[];
}

export const limitAmount = (rule: LimitRule, base: number): number =>
  rule.unit === 'percent' ? (base * rule.value) / 100 : rule.value;

export const dayKey = (time: UnixSeconds): string => String(Math.floor(time / 86_400));

const describeLimit = (rule: LimitRule, base: number) =>
  rule.unit === 'percent'
    ? `${formatPercent(rule.value, 1)} (${formatMoney(limitAmount(rule, base))})`
    : formatMoney(rule.value);

function draft(
  rule: RuleId,
  key: string,
  time: UnixSeconds,
  summary: string,
  facts: BreachFact[],
): BreachDraft {
  return { key, rule, title: RULE_TITLES[rule], time, summary, facts };
}

export function applyBreaches(challenge: Challenge, drafts: readonly BreachDraft[], now: number): Challenge {
  const fresh = drafts.filter((d) => !challenge.breaches.some((b) => b.key === d.key));
  if (fresh.length === 0) return challenge;
  const unique = fresh.filter((d, i) => fresh.findIndex((other) => other.key === d.key) === i);
  return {
    ...challenge,
    breaches: [...challenge.breaches, ...unique.map((d) => ({ ...d, recordedAt: now }))],
    status: challenge.status === 'active' ? 'failed' : challenge.status,
    resolvedAt: challenge.status === 'active' ? unique[0].time : challenge.resolvedAt,
  };
}

const inChallenge = <T extends { number: number }>(challenge: Challenge, items: readonly T[]) =>
  items.filter((item) => item.number >= challenge.firstTradeNumber);

export function evaluateTick(
  challenge: Challenge,
  snap: RuleSnapshot,
): { challenge: Challenge; drafts: BreachDraft[] } {
  const { rules, startingBalance } = challenge;
  const key = dayKey(snap.time);
  const peakEquity = Math.max(challenge.peakEquity, snap.equity);
  const dayStarts =
    key in challenge.dayStarts ? challenge.dayStarts : { ...challenge.dayStarts, [key]: snap.equity };
  const next =
    peakEquity !== challenge.peakEquity || dayStarts !== challenge.dayStarts
      ? { ...challenge, peakEquity, dayStarts }
      : challenge;
  const drafts: BreachDraft[] = [];

  if (rules.dailyLoss.enabled) {
    const limit = limitAmount(rules.dailyLoss, startingBalance);
    const dayStart = dayStarts[key];
    const loss = dayStart - snap.equity;
    if (loss > limit) {
      drafts.push(
        draft('dailyLoss', `daily:${key}`, snap.time, `Lost ${formatMoney(loss)} today, over the ${describeLimit(rules.dailyLoss, startingBalance)} limit.`, [
          { label: 'Daily limit', value: formatMoney(limit) },
          { label: 'Loss today', value: formatMoney(loss) },
          { label: "Day's starting equity", value: formatMoney(dayStart) },
          { label: 'Equity now', value: formatMoney(snap.equity) },
        ]),
      );
    }
  }

  if (rules.totalLoss.enabled) {
    const limit = limitAmount(rules.totalLoss, startingBalance);
    const loss = startingBalance - snap.equity;
    if (loss > limit) {
      drafts.push(
        draft('totalLoss', 'total', snap.time, `Total loss of ${formatMoney(loss)} passed the ${describeLimit(rules.totalLoss, startingBalance)} limit.`, [
          { label: 'Loss limit', value: formatMoney(limit) },
          { label: 'Total loss', value: formatMoney(loss) },
          { label: 'Starting balance', value: formatMoney(startingBalance) },
          { label: 'Equity now', value: formatMoney(snap.equity) },
        ]),
      );
    }
  }

  if (rules.trailingDrawdown.enabled) {
    const limit = limitAmount(rules.trailingDrawdown, startingBalance);
    const drawdown = peakEquity - snap.equity;
    if (drawdown > limit) {
      drafts.push(
        draft('trailingDrawdown', 'trailing', snap.time, `Equity fell ${formatMoney(drawdown)} from its peak, over the ${describeLimit(rules.trailingDrawdown, startingBalance)} trailing limit.`, [
          { label: 'Trailing limit', value: formatMoney(limit) },
          { label: 'Peak equity', value: formatMoney(peakEquity) },
          { label: 'Fall from peak', value: formatMoney(drawdown) },
          { label: 'Equity now', value: formatMoney(snap.equity) },
        ]),
      );
    }
  }

  if (rules.profitTarget.enabled && next.status === 'active') {
    const target = limitAmount(rules.profitTarget, startingBalance);
    const profit = snap.equity - startingBalance;
    if (profit >= target) {
      return {
        challenge: {
          ...next,
          status: 'passed',
          resolvedAt: snap.time,
        },
        drafts,
      };
    }
  }

  return { challenge: next, drafts };
}

export function evaluateOrder(
  challenge: Challenge,
  snap: RuleSnapshot,
  order: { lots: number; time: UnixSeconds },
): BreachDraft[] {
  const drafts: BreachDraft[] = [];
  const { rules } = challenge;
  if (rules.maxLot.enabled && order.lots > rules.maxLot.value) {
    drafts.push(
      draft('maxLot', `lot:${order.time}:${order.lots}`, order.time, `Order size ${order.lots} lots exceeds max ${rules.maxLot.value}.`, [
        { label: 'Max lot', value: String(rules.maxLot.value) },
        { label: 'Order lots', value: String(order.lots) },
      ]),
    );
  }
  if (rules.newsTrading.enabled) {
    const blocking = findBlockingEvent(order.time, rules.newsTrading.minutesBefore, rules.newsTrading.minutesAfter);
    if (blocking) {
      drafts.push(
        draft('newsTrading', `news:${order.time}:${blocking.id}`, order.time, `Trade blocked around news: ${blocking.title}.`, [
          { label: 'Event', value: blocking.title },
        ]),
      );
    }
  }
  return drafts;
}

export function evaluateClose(
  challenge: Challenge,
  snap: RuleSnapshot,
  trade: ClosedTrade,
): BreachDraft[] {
  const drafts: BreachDraft[] = [];
  const { rules } = challenge;
  if (rules.weekendHolding.enabled) {
    const openDay = new Date(trade.openTime * 1000).getUTCDay();
    const closeDay = new Date(trade.closeTime * 1000).getUTCDay();
    // Fri open still open into weekend is checked elsewhere; simple close-on-weekend flag
    if (closeDay === 6 || closeDay === 0) {
      drafts.push(
        draft('weekendHolding', `weekend:${trade.id}`, trade.closeTime, 'Position closed or held across the weekend under this rule set.', [
          { label: 'Trade', value: `#${trade.number}` },
        ]),
      );
    }
  }
  void openDay;
  void snap;
  void rules;
  return drafts;
}

export function challengeGauges(challenge: Challenge, equity: number) {
  const { rules, startingBalance, peakEquity, dayStarts } = challenge;
  const today = dayKey(Math.floor(Date.now() / 1000));
  const dayStart = dayStarts[today] ?? equity;
  return [
    rules.dailyLoss.enabled && {
      id: 'dailyLoss',
      label: 'Daily loss',
      used: Math.max(0, dayStart - equity),
      limit: limitAmount(rules.dailyLoss, startingBalance),
    },
    rules.totalLoss.enabled && {
      id: 'totalLoss',
      label: 'Total loss',
      used: Math.max(0, startingBalance - equity),
      limit: limitAmount(rules.totalLoss, startingBalance),
    },
    rules.trailingDrawdown.enabled && {
      id: 'trailingDrawdown',
      label: 'Trailing DD',
      used: Math.max(0, peakEquity - equity),
      limit: limitAmount(rules.trailingDrawdown, startingBalance),
    },
    rules.profitTarget.enabled && {
      id: 'profitTarget',
      label: 'Profit target',
      used: Math.max(0, equity - startingBalance),
      limit: limitAmount(rules.profitTarget, startingBalance),
    },
  ].filter(Boolean) as { id: string; label: string; used: number; limit: number }[];
}

export function summarizeRules(rules: Rules): string[] {
  const lines: string[] = [];
  (Object.keys(RULE_TITLES) as RuleId[]).forEach((id) => {
    const rule = (rules as any)[id];
    if (rule && rule.enabled) lines.push(RULE_TITLES[id]);
  });
  return lines;
}

export type { NewsEvent };
