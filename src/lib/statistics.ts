import type { SymbolInfo } from '@/domain/market';
import type { CurvePoint, DrawdownPoint, Statistics } from '@/domain/statistics';
import type { ClosedTrade } from '@/domain/trading';

/** Profit or loss in units of the risk taken at entry (distance to stop loss). Null without a stop loss. */
export function rMultiple(trade: ClosedTrade, symbol: SymbolInfo): number | null {
  if (trade.stopLoss === null) return null;
  const risk = Math.abs(trade.entryPrice - trade.stopLoss) * trade.lots * symbol.contractSize;
  return risk > 0 ? trade.pnl / risk : null;
}

export function computeStatistics(
  trades: readonly ClosedTrade[],
  initialBalance: number,
  symbol: SymbolInfo,
): Statistics {
  const ordered = [...trades].sort((a, b) => a.exitTime - b.exitTime || a.number - b.number);

  let grossProfit = 0;
  let grossLoss = 0;
  let wins = 0;
  let losses = 0;
  let breakeven = 0;
  let winRun = 0;
  let lossRun = 0;
  let longestWinStreak = 0;
  let longestLossStreak = 0;
  let durationTotal = 0;
  let rTotal = 0;
  let ratedTrades = 0;
  let best: ClosedTrade | null = null;
  let worst: ClosedTrade | null = null;

  let balance = initialBalance;
  let peak = initialBalance;
  let maxDrawdown = 0;
  let maxDrawdownPercent = 0;

  const startTime = ordered.length > 0 ? Math.min(...ordered.map((trade) => trade.entryTime)) : 0;
  const equityCurve: CurvePoint[] = ordered.length > 0 ? [{ time: startTime, value: initialBalance }] : [];
  const drawdownCurve: DrawdownPoint[] = ordered.length > 0 ? [{ time: startTime, amount: 0, percent: 0 }] : [];

  for (const trade of ordered) {
    if (trade.pnl > 0) {
      wins++;
      grossProfit += trade.pnl;
      winRun++;
      lossRun = 0;
    } else if (trade.pnl < 0) {
      losses++;
      grossLoss += trade.pnl;
      lossRun++;
      winRun = 0;
    } else {
      breakeven++;
      winRun = 0;
      lossRun = 0;
    }
    longestWinStreak = Math.max(longestWinStreak, winRun);
    longestLossStreak = Math.max(longestLossStreak, lossRun);

    durationTotal += trade.exitTime - trade.entryTime;
    const r = rMultiple(trade, symbol);
    if (r !== null) {
      rTotal += r;
      ratedTrades++;
    }
    if (best === null || trade.pnl > best.pnl) best = trade;
    if (worst === null || trade.pnl < worst.pnl) worst = trade;

    balance += trade.pnl;
    peak = Math.max(peak, balance);
    const amount = peak - balance;
    const percent = peak > 0 ? (amount / peak) * 100 : 0;
    maxDrawdown = Math.max(maxDrawdown, amount);
    maxDrawdownPercent = Math.max(maxDrawdownPercent, percent);
    equityCurve.push({ time: trade.exitTime, value: balance });
    drawdownCurve.push({ time: trade.exitTime, amount, percent });
  }

  const count = ordered.length;
  const netProfit = grossProfit + grossLoss;
  const profitFactor = grossLoss < 0 ? grossProfit / -grossLoss : grossProfit > 0 ? Infinity : null;

  return {
    trades: count,
    wins,
    losses,
    breakeven,
    netProfit,
    grossProfit,
    grossLoss,
    returnPercent: initialBalance > 0 ? (netProfit / initialBalance) * 100 : 0,
    winRate: count > 0 ? (wins / count) * 100 : null,
    profitFactor,
    averageWin: wins > 0 ? grossProfit / wins : null,
    averageLoss: losses > 0 ? grossLoss / losses : null,
    expectancy: count > 0 ? netProfit / count : null,
    averageR: ratedTrades > 0 ? rTotal / ratedTrades : null,
    ratedTrades,
    longestWinStreak,
    longestLossStreak,
    averageDurationSeconds: count > 0 ? durationTotal / count : null,
    bestTrade: best,
    worstTrade: worst,
    maxDrawdown,
    maxDrawdownPercent,
    equityCurve,
    drawdownCurve,
  };
}
