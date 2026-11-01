/** Prop-firm rule evaluation — full API expected by propStore + ChallengeView. */
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
        challenge: { ...next, status: 'passed', resolvedAt: snap.time },
        drafts,
      };
    }
  }

  return { challenge: next, drafts };
}

export function checkProfitConsistency(
  challenge: Challenge,
  closedTrades: readonly ClosedTrade[],
  time: UnixSeconds,
): BreachDraft | null {
  const rule = challenge.rules.profitConsistency;
  if (!rule?.enabled) return null;
  const trades = inChallenge(challenge, closedTrades);
  const net = trades.reduce((sum, trade) => sum + trade.pnl, 0);
  if (net <= 0 || trades.length === 0) return null;
  const best = trades.reduce((a, b) => (b.pnl > a.pnl ? b : a));
  const share = (best.pnl / net) * 100;
  if (share <= rule.maxSharePercent) return null;
  return draft(
    'profitConsistency',
    'profit-consistency',
    time,
    `One trade made ${formatPercent(share, 0)} of the profit (limit ${formatPercent(rule.maxSharePercent, 0)}).`,
    [
      { label: 'Best trade', value: `#${best.number} · ${formatMoney(best.pnl)}` },
      { label: 'Total profit', value: formatMoney(net) },
      { label: 'Share of profit', value: formatPercent(share, 1) },
      { label: 'Allowed', value: formatPercent(rule.maxSharePercent, 0) },
    ],
  );
}

/** Lot size, lot consistency, news window. */
export function evaluateNewPosition(
  challenge: Challenge,
  position: Position,
  allTrades: readonly (Position | ClosedTrade)[],
  news: readonly NewsEvent[],
): BreachDraft[] {
  const { rules } = challenge;
  const drafts: BreachDraft[] = [];
  const label = `#${position.number} ${position.side === 'buy' ? 'Buy' : 'Sell'} ${position.lots.toFixed(2)}`;

  const maxLot = (rules as any).maxLotSize ?? (rules as any).maxLot;
  if (maxLot?.enabled && position.lots > (maxLot.lots ?? maxLot.value)) {
    const limit = maxLot.lots ?? maxLot.value;
    drafts.push(
      draft('maxLotSize' as RuleId, `lot:${position.id}`, position.entryTime, `${label} is above the ${Number(limit).toFixed(2)} lot limit.`, [
        { label: 'Lot limit', value: Number(limit).toFixed(2) },
        { label: 'This trade', value: position.lots.toFixed(2) },
      ]),
    );
  }

  if (rules.lotConsistency?.enabled) {
    const previous = inChallenge(challenge, allTrades).filter((trade) => trade.number < position.number);
    if (previous.length >= 3) {
      const average = previous.reduce((sum, trade) => sum + trade.lots, 0) / previous.length;
      const tolerance = rules.lotConsistency.tolerancePercent / 100;
      const low = average * (1 - tolerance);
      const high = average * (1 + tolerance);
      if (position.lots < low - 1e-9 || position.lots > high + 1e-9) {
        drafts.push(
          draft(
            'lotConsistency',
            `lotcons:${position.id}`,
            position.entryTime,
            `${label} is outside ±${rules.lotConsistency.tolerancePercent}% of average lot size.`,
            [
              { label: 'Average lot', value: average.toFixed(2) },
              { label: 'This trade', value: position.lots.toFixed(2) },
            ],
          ),
        );
      }
    }
  }

  const newsRule = rules.newsTrading;
  if (newsRule && (newsRule as any).blocked !== false) {
    const before = (newsRule as any).minutesBefore ?? (newsRule as any).windowMinutes ?? 5;
    const after = (newsRule as any).minutesAfter ?? (newsRule as any).windowMinutes ?? 5;
    const blocking = findBlockingEvent(position.entryTime, before, after);
    if (blocking) {
      drafts.push(
        draft('newsTrading', `news:${position.id}`, position.entryTime, `Trade near news: ${blocking.title}.`, [
          { label: 'Event', value: blocking.title },
        ]),
      );
    }
  }

  void news;
  return drafts;
}

export function evaluateClosedTrade(
  challenge: Challenge,
  trade: ClosedTrade,
  news: readonly NewsEvent[],
): BreachDraft[] {
  const drafts: BreachDraft[] = [];
  const consistency = checkProfitConsistency(challenge, [trade], trade.closeTime);
  if (consistency) drafts.push(consistency);
  void news;
  return drafts;
}

export function evaluateWeekend(
  challenge: Challenge,
  gapTimes: readonly UnixSeconds[],
  allTrades: readonly ClosedTrade[],
): BreachDraft[] {
  if (!challenge.rules.weekendHolding?.blocked && !(challenge.rules.weekendHolding as any)?.enabled) {
    return [];
  }
  const drafts: BreachDraft[] = [];
  for (const trade of inChallenge(challenge, allTrades)) {
    for (const gap of gapTimes) {
      if (trade.openTime <= gap && trade.closeTime >= gap) {
        drafts.push(
          draft('weekendHolding', `weekend:${trade.id}:${gap}`, gap, `Trade #${trade.number} held across a weekend gap.`, [
            { label: 'Trade', value: `#${trade.number}` },
          ]),
        );
        break;
      }
    }
  }
  return drafts;
}

export interface Gauge {
  label: string;
  used: number;
  limit: number;
  fill: number;
}

export function computeGauges(
  challenge: Challenge,
  snap: RuleSnapshot,
): { risk: Gauge[]; target: Gauge | null } {
  const { rules, startingBalance } = challenge;
  const gauge = (label: string, used: number, limit: number): Gauge => ({
    label,
    used: Math.max(0, used),
    limit,
    fill: limit > 0 ? Math.min(1, Math.max(0, used) / limit) : 0,
  });

  const risk: Gauge[] = [];
  if (rules.dailyLoss.enabled) {
    const dayStart = challenge.dayStarts[dayKey(snap.time)] ?? snap.equity;
    risk.push(gauge('Daily loss', dayStart - snap.equity, limitAmount(rules.dailyLoss, startingBalance)));
  }
  if (rules.totalLoss.enabled) {
    risk.push(gauge('Total loss', startingBalance - snap.equity, limitAmount(rules.totalLoss, startingBalance)));
  }
  if (rules.trailingDrawdown.enabled) {
    risk.push(
      gauge(
        'Trailing drawdown',
        Math.max(challenge.peakEquity, snap.equity) - snap.equity,
        limitAmount(rules.trailingDrawdown, startingBalance),
      ),
    );
  }
  const target = rules.profitTarget.enabled
    ? gauge('Profit target', snap.balance - startingBalance, limitAmount(rules.profitTarget, startingBalance))
    : null;
  return { risk, target };
}

export function describeRules(rules: Rules, startingBalance: number): string[] {
  const lines: string[] = [];
  if (rules.dailyLoss.enabled) lines.push(`Maximum daily loss: ${describeLimit(rules.dailyLoss, startingBalance)}`);
  if (rules.totalLoss.enabled) lines.push(`Maximum total loss: ${describeLimit(rules.totalLoss, startingBalance)}`);
  if (rules.trailingDrawdown.enabled) {
    lines.push(`Trailing drawdown: ${describeLimit(rules.trailingDrawdown, startingBalance)}`);
  }
  if (rules.profitTarget.enabled) lines.push(`Profit target: ${describeLimit(rules.profitTarget, startingBalance)}`);
  const maxLot = (rules as any).maxLotSize;
  if (maxLot?.enabled) lines.push(`Maximum lot size: ${Number(maxLot.lots ?? maxLot.value).toFixed(2)}`);
  if (rules.lotConsistency?.enabled) {
    lines.push(`Lot-size consistency: within ±${rules.lotConsistency.tolerancePercent}% of the average`);
  }
  if (rules.profitConsistency?.enabled) {
    lines.push(`Profit consistency: no trade above ${rules.profitConsistency.maxSharePercent}% of total profit`);
  }
  const news = rules.newsTrading as any;
  if (news) {
    lines.push(
      news.blocked !== false
        ? `News trading: blocked ±${news.windowMinutes ?? news.minutesBefore ?? 5} min around high-impact events`
        : 'News trading: allowed',
    );
  }
  const weekend = rules.weekendHolding as any;
  if (weekend) {
    lines.push(weekend.blocked || weekend.enabled ? 'Weekend holding: blocked' : 'Weekend holding: allowed');
  }
  return lines;
}

export type { NewsEvent };
