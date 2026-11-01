import { useEffect, useRef } from 'react';
import { useBacktestStore } from '@/stores/backtestStore';
import { useTradingStore } from '@/stores/tradingStore';

/** Sync active session tradeCount/netPnl with closed trades — never loops. */
export function useSessionSync(): void {
  const lastLen = useRef(-1);

  useEffect(() => {
    try {
      return useTradingStore.subscribe((state) => {
        try {
          const len = state.closedTrades.length;
          if (len === lastLen.current) return;
          lastLen.current = len;
          const activeId = useBacktestStore.getState().activeSessionId;
          if (!activeId) return;
          const netPnl = state.closedTrades.reduce((sum, t) => sum + t.pnl, 0);
          useBacktestStore.getState().updateSession(activeId, {
            tradeCount: len,
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
