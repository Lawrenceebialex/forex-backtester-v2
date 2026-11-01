import { useEffect } from 'react';
import { WEEKEND_GAP_TIMES } from '@/data/marketData';
import { usePlaybackStore } from '@/stores/playbackStore';
import { usePropStore } from '@/stores/propStore';
import { useTradingStore } from '@/stores/tradingStore';

/**
 * Watches the account against the active rule set. Every change to the account (each replay tick,
 * each order, each close) is checked, and any rule that is broken is recorded with the exact
 * market time and the numbers involved. Mount once at the app root.
 */
export function usePropEngine(): void {
  useEffect(() => {
    let lastTime = usePlaybackStore.getState().currentTime;
    let lastPositions = useTradingStore.getState().positions;
    let lastClosedCount = useTradingStore.getState().closedTrades.length;

    return useTradingStore.subscribe((state) => {
      const prop = usePropStore.getState();
      const time = usePlaybackStore.getState().currentTime;

      if (state.closedTrades.length < lastClosedCount) lastClosedCount = state.closedTrades.length; // account was reset
      const crossed = time > lastTime ? WEEKEND_GAP_TIMES.filter((gap) => gap >= lastTime && gap < time) : [];
      const newPositions = state.positions.filter((p) => !lastPositions.some((known) => known.id === p.id));
      const newTrades = state.closedTrades.slice(lastClosedCount);
      lastTime = time;
      lastPositions = state.positions;
      lastClosedCount = state.closedTrades.length;

      if (!prop.challenge || prop.challenge.endedAt !== null) return;
      const everything = [...state.positions, ...state.closedTrades];
      newPositions.forEach((position) => prop.applyNewPosition(position, everything));
      newTrades.forEach((trade) => prop.applyClosedTrade(trade));
      if (crossed.length > 0) prop.applyWeekend(crossed, everything);
      prop.applyTick({ time, balance: state.balance, equity: state.equity, positions: state.positions, closedTrades: state.closedTrades });
    });
  }, []);
}
