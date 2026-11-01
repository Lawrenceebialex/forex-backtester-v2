import type { ClosedTrade } from '@/domain/trading';
import type { SymbolInfo } from '@/domain/market';
import { SYMBOL } from '@/data/marketData';
import { rMultiple } from '@/lib/statistics';

export interface BucketStats {
  key: string;
  trades: number;
  wins: number;
  losses: number;
  netPnl: number;
  winRate: number | null;
  avgR: number | null;
}

function bucket(
  trades: readonly ClosedTrade[],
  keyFn: (t: ClosedTrade) => string,
  symbol: SymbolInfo = SYMBOL,
): BucketStats[] {
  const map = new Map<string, ClosedTrade[]>();
  for (const t of trades) {
    const k = keyFn(t);
    const list = map.get(k) ?? [];
    list.push(t);
    map.set(k, list);
  }
  return [...map.entries()]
    .map(([key, list]) => {
      const wins = list.filter((t) => t.pnl > 0).length;
      const losses = list.filter((t) => t.pnl < 0).length;
      const netPnl = list.reduce((s, t) => s + t.pnl, 0);
      const rs = list.map((t) => rMultiple(t, symbol)).filter((v): v is number => v != null);
      return {
        key,
        trades: list.length,
        wins,
        losses,
        netPnl,
        winRate: list.length ? (wins / list.length) * 100 : null,
        avgR: rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : null,
      };
    })
    .sort((a, b) => b.trades - a.trades);
}

export function bySide(trades: readonly ClosedTrade[]): BucketStats[] {
  return bucket(trades, (t) => (t.side === 'buy' ? 'Long' : 'Short'));
}

export function byWeekday(trades: readonly ClosedTrade[]): BucketStats[] {
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return bucket(trades, (t) => names[new Date(t.exitTime * 1000).getUTCDay()] ?? '?');
}

export function byMonth(trades: readonly ClosedTrade[]): BucketStats[] {
  return bucket(trades, (t) => {
    const d = new Date(t.exitTime * 1000);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  }).sort((a, b) => a.key.localeCompare(b.key));
}

export function byStrategyId(trades: readonly ClosedTrade[]): BucketStats[] {
  return bucket(trades, (t) => t.strategyId);
}

export function streakInfo(trades: readonly ClosedTrade[]): { longestWin: number; longestLoss: number } {
  const ordered = [...trades].sort((a, b) => a.exitTime - b.exitTime);
  let longestWin = 0;
  let longestLoss = 0;
  let curW = 0;
  let curL = 0;
  for (const t of ordered) {
    if (t.pnl > 0) {
      curW++;
      curL = 0;
      longestWin = Math.max(longestWin, curW);
    } else if (t.pnl < 0) {
      curL++;
      curW = 0;
      longestLoss = Math.max(longestLoss, curL);
    } else {
      curW = 0;
      curL = 0;
    }
  }
  return { longestWin, longestLoss };
}
