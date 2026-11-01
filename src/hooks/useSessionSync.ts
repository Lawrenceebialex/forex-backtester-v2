import { useEffect } from 'react';
import { useBacktestStore } from '@/stores/backtestStore';
import { useTradingStore } from '@/stores/tradingStore';

/**
 * Keeps the active backtest session's tradeCount / netPnl aligned with the
 * closed-trade ledger so My Backtests and the Dashboard never show stale zeros
 * after real activity. Mount once at the app root (with the other engines).
 */
export function useSessionSync(): void {
  useEffect(() => {
    return useTradingStore.subscribe((state, prev) => {
      if (state.closedTrades === prev.closedTrades) return;
      const activeId = useBacktestStore.getState().activeSessionId;
      if (!activeId) return;
      const closed = state.closedTrades;
      const netPnl = closed.reduce((sum, t) => sum + t.pnl, 0);
      useBacktestStore.getState().updateSession(activeId, {
        tradeCount: closed.length,
        netPnl,
        status: 'in_progress',
      });
    });
  }, []);
}
