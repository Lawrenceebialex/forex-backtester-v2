import { useEffect } from 'react';
import { useBacktestStore } from '@/stores/backtestStore';
import { useTradingStore } from '@/stores/tradingStore';

/**
 * Keeps the active backtest session's tradeCount / netPnl aligned with closed trades.
 * Failures are swallowed so this never takes down the UI.
 */
export function useSessionSync(): void {
  useEffect(() => {
    try {
      return useTradingStore.subscribe((state, prev) => {
        try {
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
        } catch (err) {
          console.warn('session sync skipped', err);
        }
      });
    } catch (err) {
      console.warn('session sync not mounted', err);
      return undefined;
    }
  }, []);
}
