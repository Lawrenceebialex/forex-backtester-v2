import { useEffect, type RefObject } from 'react';
import type { CandleChart, ChartOverlays } from '@/chart/CandleChart';
import { TIMEFRAME_SECONDS } from '@/domain/market';
import { readCssColor } from '@/lib/cssColor';
import { usePlaybackStore } from '@/stores/playbackStore';
import { useThemeStore } from '@/stores/themeStore';
import { useTradingStore } from '@/stores/tradingStore';

/**
 * Draws open positions on the chart: an arrow at the entry candle, plus price lines for the
 * entry, stop-loss and take-profit. Positions only change when you open or close one
 * (live P&L is derived elsewhere), so rebuilding on every change is cheap.
 */
export function usePositionOverlays(chartRef: RefObject<CandleChart | null>): void {
  const positions = useTradingStore((state) => state.positions);
  const timeframe = usePlaybackStore((state) => state.timeframe);
  const theme = useThemeStore((state) => state.theme);
  // Positions opened later than the replay clock (after rewinding) are not drawn yet.
  const enteredKey = usePlaybackStore((state) =>
    positions.filter((position) => position.entryTime <= state.currentTime).map((position) => position.id).join(','),
  );

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const entered = new Set(enteredKey.split(','));
    const shown = positions.filter((position) => entered.has(position.id));
    const bull = readCssColor('--bull');
    const bear = readCssColor('--bear');
    const bucketSeconds = TIMEFRAME_SECONDS[timeframe];

    const overlays: ChartOverlays = {
      markers: shown.map((position) => ({
        // Snap to the candle that contains the entry on the current timeframe.
        time: Math.floor(position.entryTime / bucketSeconds) * bucketSeconds,
        side: position.side,
        color: position.side === 'buy' ? bull : bear,
        text: `${position.side === 'buy' ? 'BUY' : 'SELL'} ${position.lots.toFixed(2)}`,
      })),
      lines: shown.flatMap((position) => {
        const isBuy = position.side === 'buy';
        return [
          { price: position.entryPrice, color: isBuy ? bull : bear, title: `${isBuy ? 'BUY' : 'SELL'} #${position.number}`, dashed: false },
          ...(position.stopLoss !== null ? [{ price: position.stopLoss, color: bear, title: `SL #${position.number}`, dashed: true }] : []),
          ...(position.takeProfit !== null ? [{ price: position.takeProfit, color: bull, title: `TP #${position.number}`, dashed: true }] : []),
        ];
      }),
    };
    chart.setOverlays(overlays);
  }, [positions, enteredKey, timeframe, theme, chartRef]);
}
