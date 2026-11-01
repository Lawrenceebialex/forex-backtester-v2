import { RULE_TITLES, type Breach, type Challenge, type ChallengeStatus, type RuleId } from '@/domain/propFirm';
import type { UnixSeconds } from '@/domain/market';
import { formatMoney, formatSignedMoney } from './format';
import { formatVirtualTime } from './formatTime';
import { describeRules, type RuleSnapshot } from './propRules';

export interface RuleResult {
  rule: RuleId;
  title: string;
  /** Number of times it was broken. */
  breaches: number;
}

export interface ChallengeReport {
  ruleSetName: string;
  status: ChallengeStatus;
  startedAt: UnixSeconds;
  /** The market time the report covers up to (end of the challenge, or now). */
  until: UnixSeconds;
  startingBalance: number;
  balance: number;
  equity: number;
  profit: number;
  trades: number;
  rulesInForce: string[];
  results: RuleResult[];
  breaches: Breach[];
}

const ENABLED: Record<RuleId, (c: Challenge) => boolean> = {
  dailyLoss: (c) => c.rules.dailyLoss.enabled,
  totalLoss: (c) => c.rules.totalLoss.enabled,
  trailingDrawdown: (c) => c.rules.trailingDrawdown.enabled,
  profitTarget: (c) => c.rules.profitTarget.enabled,
  maxLotSize: (c) => c.rules.maxLotSize.enabled,
  lotConsistency: (c) => c.rules.lotConsistency.enabled,
  profitConsistency: (c) => c.rules.profitConsistency.enabled,
  newsTrading: (c) => c.rules.newsTrading.blocked,
  weekendHolding: (c) => c.rules.weekendHolding.blocked,
};

export function buildReport(challenge: Challenge, snap: RuleSnapshot): ChallengeReport {
  const results = (Object.keys(ENABLED) as RuleId[])
    .filter((rule) => ENABLED[rule](challenge))
    .map((rule) => ({
      rule,
      title: RULE_TITLES[rule],
      breaches: challenge.breaches.filter((b) => b.rule === rule).length,
    }));
  const trades = snap.closedTrades.filter((t) => t.number >= challenge.firstTradeNumber).length;
  return {
    ruleSetName: challenge.ruleSetName,
    status: challenge.status,
    startedAt: challenge.startedAt,
    until: challenge.endedAt ?? snap.time,
    startingBalance: challenge.startingBalance,
    balance: snap.balance,
    equity: snap.equity,
    profit: snap.balance - challenge.startingBalance,
    trades,
    rulesInForce: describeRules(challenge.rules, challenge.startingBalance),
    results,
    breaches: [...challenge.breaches].sort((a, b) => a.time - b.time),
  };
}

export const STATUS_LABEL: Record<ChallengeStatus, string> = {
  active: 'In progress',
  failed: 'Failed — rules broken',
  passed: 'Passed — target reached with no breaches',
  ended: 'Ended',
};

/** Plain-text version of the report for download / sharing. */
export function reportToText(report: ChallengeReport): string {
  const lines = [
    'PROP FIRM CHALLENGE REPORT',
    '==========================',
    `Rule set:        ${report.ruleSetName}`,
    `Result:          ${STATUS_LABEL[report.status]}`,
    `Period:          ${formatVirtualTime(report.startedAt)} → ${formatVirtualTime(report.until)} UTC`,
    `Starting balance ${formatMoney(report.startingBalance)}`,
    `Balance:         ${formatMoney(report.balance)} (${formatSignedMoney(report.profit)})`,
    `Equity:          ${formatMoney(report.equity)}`,
    `Closed trades:   ${report.trades}`,
    '',
    'RULES IN FORCE',
    ...report.rulesInForce.map((line) => `  - ${line}`),
    '',
    'RULE RESULTS',
    ...report.results.map((r) => `  [${r.breaches === 0 ? 'OK' : 'BROKEN x' + r.breaches}] ${r.title}`),
    '',
    `BREACHES (${report.breaches.length})`,
  ];
  if (report.breaches.length === 0) lines.push('  None. Every rule held.');
  report.breaches.forEach((breach, index) => {
    lines.push(`  ${index + 1}. ${breach.title} — ${formatVirtualTime(breach.time)} UTC`, `     ${breach.summary}`);
    breach.facts.forEach((fact) => lines.push(`     ${fact.label}: ${fact.value}`));
  });
  return lines.join('\n');
}
