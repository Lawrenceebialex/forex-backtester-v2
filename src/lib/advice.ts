import type { Statistics } from '@/domain/statistics';
import { formatMoney, formatPercent } from './format';

export type InsightTone = 'positive' | 'caution' | 'neutral';

/** Every insight is shown to the user under the label "Educational Insight". */
export interface Insight {
  id: string;
  tone: InsightTone;
  title: string;
  body: string;
}

export const INSIGHT_LABEL = 'Educational Insight';
export const ADVICE_DISCLAIMER =
  'Educational information based on your simulated results. It is not financial advice and does not predict future performance.';

/** Below this many closed trades, most statistics are too noisy to read much into. */
export const SMALL_SAMPLE = 30;
const TOO_FEW = 10;

type Rule = (stats: Statistics) => Insight | null;

const tooFewTrades: Rule = (s) =>
  s.trades < TOO_FEW
    ? {
        id: 'few-trades',
        tone: 'neutral',
        title: 'Too few trades to draw conclusions',
        body: `You have ${s.trades} closed ${s.trades === 1 ? 'trade' : 'trades'}. With so few, luck dominates: a handful of wins or losses can swing every statistic. Many traders wait for 30 or more trades, and ideally 100+, before judging a strategy.`,
      }
    : null;

const smallSample: Rule = (s) =>
  s.trades >= TOO_FEW && s.trades < SMALL_SAMPLE
    ? {
        id: 'small-sample',
        tone: 'neutral',
        title: 'Still a small sample',
        body: `${s.trades} trades is a start, but results from fewer than ${SMALL_SAMPLE} trades can look better or worse than the strategy really is. Treat the numbers below as early signs rather than conclusions.`,
      }
    : null;

const deepDrawdown: Rule = (s) => {
  if (s.trades < TOO_FEW || s.maxDrawdownPercent < 15) return null;
  const recovery = (s.maxDrawdownPercent / (100 - Math.min(s.maxDrawdownPercent, 99))) * 100;
  return {
    id: 'deep-drawdown',
    tone: 'caution',
    title: 'Deep drawdown',
    body: `Your balance fell ${formatPercent(s.maxDrawdownPercent)} (${formatMoney(s.maxDrawdown)}) from its peak at the worst point. Recovering from that needs a gain of about ${formatPercent(recovery, 0)} just to get back to even. Many traders reduce position size or risk per trade to keep drawdowns shallower.`,
  };
};

const drawdownVersusReturn: Rule = (s) => {
  if (s.trades < TOO_FEW || s.returnPercent <= 0 || s.maxDrawdownPercent <= s.returnPercent) return null;
  return {
    id: 'drawdown-vs-return',
    tone: 'caution',
    title: 'Drawdown is larger than the return',
    body: `The account gained ${formatPercent(s.returnPercent)} but endured a ${formatPercent(s.maxDrawdownPercent)} drawdown along the way. A strategy that risks more than it earns can be hard to stick with in real conditions. Comparing return against drawdown is a common way to judge whether the ride was worth it.`,
  };
};

const lossesOutweighWins: Rule = (s) => {
  if (s.trades < TOO_FEW || s.averageWin === null || s.averageLoss === null || s.winRate === null) return null;
  const ratio = -s.averageLoss / s.averageWin;
  if (ratio < 1.5) return null;
  const breakEven = (-s.averageLoss / (s.averageWin - s.averageLoss)) * 100;
  return {
    id: 'loss-bigger-than-win',
    tone: s.winRate < breakEven ? 'caution' : 'neutral',
    title: 'Average loss is much larger than average win',
    body: `Your average loss (${formatMoney(-s.averageLoss)}) is ${ratio.toFixed(1)}× your average win (${formatMoney(s.averageWin)}). At that ratio a strategy needs to win about ${formatPercent(breakEven, 0)} of its trades to break even; yours wins ${formatPercent(s.winRate, 0)}. Tighter stop losses or letting winners run further are common ways traders improve this balance.`,
  };
};

const longLosingStreak: Rule = (s) =>
  s.trades >= TOO_FEW && s.longestLossStreak >= 5
    ? {
        id: 'losing-streak',
        tone: 'caution',
        title: `Longest losing streak: ${s.longestLossStreak} trades`,
        body: `Losing streaks are normal even for good strategies, but a run of ${s.longestLossStreak} tests both your account and your discipline. Risking a small, fixed fraction of the account per trade is a common way to make sure a streak like this is survivable.`,
      }
    : null;

const profitFactorRule: Rule = (s) => {
  if (s.trades < TOO_FEW || s.profitFactor === null) return null;
  if (s.profitFactor < 1) {
    return {
      id: 'profit-factor-low',
      tone: 'caution',
      title: 'Losses outweigh profits',
      body: `Your profit factor is ${s.profitFactor.toFixed(2)}: for every $1 lost, the strategy earned about $${s.profitFactor.toFixed(2)}. Below 1.0 the strategy has lost money overall in this sample. It may be worth reviewing entries, exits and costs such as spread.`,
    };
  }
  if (s.profitFactor < 1.3) {
    return {
      id: 'profit-factor-thin',
      tone: 'neutral',
      title: 'Thin edge',
      body: `A profit factor of ${s.profitFactor.toFixed(2)} is profitable but leaves little margin. Real-world costs such as wider spreads or slippage can erase an edge this small.`,
    };
  }
  return null;
};

const negativeR: Rule = (s) =>
  s.averageR !== null && s.ratedTrades >= 5 && s.averageR < 0
    ? {
        id: 'negative-r',
        tone: 'caution',
        title: 'Negative average R-multiple',
        body: `On trades with a stop loss, you averaged ${s.averageR.toFixed(2)}R, meaning typical outcomes were less than the amount you risked. Defining your target relative to your risk (for example aiming for at least 1.5× what you risk) is a common starting point.`,
      }
    : null;

const missingStops: Rule = (s) =>
  s.trades >= 5 && s.ratedTrades / s.trades < 0.5
    ? {
        id: 'missing-stops',
        tone: 'neutral',
        title: 'Many trades have no stop loss',
        body: `${s.trades - s.ratedTrades} of ${s.trades} trades had no stop loss, so the risk on them was not defined and R-multiples cannot be calculated. Deciding where you are wrong before entering is a core habit in risk management.`,
      }
    : null;

const oneTradeDriven: Rule = (s) =>
  s.trades >= TOO_FEW && s.wins >= 3 && s.bestTrade !== null && s.grossProfit > 0 && s.bestTrade.pnl / s.grossProfit > 0.5
    ? {
        id: 'one-trade',
        tone: 'neutral',
        title: 'Results depend on one trade',
        body: `Your best trade (${formatMoney(s.bestTrade.pnl)}) is ${formatPercent((s.bestTrade.pnl / s.grossProfit) * 100, 0)} of all gross profit. When one trade drives the result, the strategy may be less consistent than the totals suggest.`,
      }
    : null;

const lowWinRateHighReward: Rule = (s) =>
  s.trades >= TOO_FEW && s.winRate !== null && s.winRate < 40 && s.averageR !== null && s.averageR >= 1
    ? {
        id: 'low-win-high-reward',
        tone: 'positive',
        title: 'Low win rate, high reward',
        body: `You win ${formatPercent(s.winRate, 0)} of trades but average ${s.averageR.toFixed(2)}R. This pattern is typical of trend-following styles: many small losses paid for by fewer, larger wins. It works only if you can stay consistent through the losing runs.`,
      }
    : null;

const healthyProfile: Rule = (s) =>
  s.trades >= SMALL_SAMPLE && s.netProfit > 0 && s.profitFactor !== null && s.profitFactor >= 1.3 && s.maxDrawdownPercent < 15
    ? {
        id: 'healthy',
        tone: 'positive',
        title: 'Balanced profile so far',
        body: `Profitable over ${s.trades} trades with a profit factor of ${s.profitFactor === Infinity ? '∞' : s.profitFactor.toFixed(2)} and a drawdown of ${formatPercent(s.maxDrawdownPercent)}. A good next step is checking whether the results hold in different market conditions and time periods.`,
      }
    : null;

const RULES: readonly Rule[] = [
  tooFewTrades,
  smallSample,
  deepDrawdown,
  drawdownVersusReturn,
  lossesOutweighWins,
  longLosingStreak,
  profitFactorRule,
  negativeR,
  missingStops,
  oneTradeDriven,
  lowWinRateHighReward,
  healthyProfile,
];

const ORDER: Record<InsightTone, number> = { caution: 0, neutral: 1, positive: 2 };

export function generateInsights(stats: Statistics): Insight[] {
  if (stats.trades === 0) return [];
  const insights = RULES.map((rule) => rule(stats)).filter((insight): insight is Insight => insight !== null);
  if (insights.length === 0) {
    insights.push({
      id: 'no-flags',
      tone: 'neutral',
      title: 'No warning signs in these numbers',
      body: 'None of the common risk patterns (deep drawdown, oversized losses, long losing streaks) showed up in this sample. Keep logging trades: more data makes every statistic more reliable.',
    });
  }
  return insights.sort((a, b) => ORDER[a.tone] - ORDER[b.tone]);
}
