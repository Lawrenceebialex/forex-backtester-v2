import { useEffect } from 'react';
import { indexAtOrBefore } from '@/data/marketData';
import { usePlaybackStore } from '@/stores/playbackStore';
import { useTradingStore } from '@/stores/tradingStore';

/**
 * Connects the replay clock to the trading account. Whenever new candles are revealed it
 * checks stop-loss / take-profit candle by candle and refreshes the quote, equity and margin.
 * Time travel (jumping or rewinding) never resets the account.
 * Mount once at the app root.
 */
export function useTradingEngine(): void {
  useEffect(() => {
    let previousIndex = indexAtOrBefore(usePlaybackStore.getState().currentTime);

    return usePlaybackStore.subscribe((state, previous) => {
      if (state.currentTime === previous.currentTime) return;
      const nextIndex = indexAtOrBefore(state.currentTime);
      useTradingStore.getState().onClockAdvance(previousIndex, nextIndex);
      previousIndex = nextIndex;
    });
  }, []);
}
