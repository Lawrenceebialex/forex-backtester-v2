import { useEffect, type RefObject } from 'react';
import type { CandleChart, ChartOverlays } from '@/chart/CandleChart';
import { TIMEFRAME_SECONDS } from '@/domain/market';
import { readCssColor } from '@/lib/cssColor';
import { usePlaybackStore } from '@/stores/playbackStore';
import { useThemeStore } from '@/stores/themeStore';
import { useTradingStore } from '@/stores/tradingStore';

/**
 * Draws open positions + pending orders on the chart:
 * entry / pending price lines, SL / TP dashed lines, markers at entry.
 * Lines with id+role are draggable (pending entry, SL, TP).
 */
export function usePositionOverlays(chartRef: RefObject<CandleChart | null>): void {
  const positions = useTradingStore((state) => state.positions);
  const pending = useTradingStore((state) => state.pendingOrders);
  const timeframe = usePlaybackStore((state) => state.timeframe);
  const theme = useThemeStore((state) => state.theme);
  const enteredKey = usePlaybackStore((state) =>
    positions
      .filter((position) => position.entryTime <= state.currentTime)
      .map((position) => position.id)
      .join(','),
  );
  const pendingKey = pending
    .map((p) => `${p.id}:${p.price}:${p.stopLoss}:${p.takeProfit}`)
    .join(',');
  const stopsKey = positions.map((p) => `${p.id}:${p.stopLoss}:${p.takeProfit}`).join(',');

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const entered = new Set(enteredKey.split(',').filter(Boolean));
    const shown = positions.filter((position) => entered.has(position.id));
    const bull = readCssColor('--bull');
    const bear = readCssColor('--bear');
    const muted = readCssColor('--ink-muted') || '#94a3b8';
    const bucketSeconds = TIMEFRAME_SECONDS[timeframe];

    const overlays: ChartOverlays = {
      markers: shown.map((position) => ({
        time: Math.floor(position.entryTime / bucketSeconds) * bucketSeconds,
        side: position.side,
        color: position.side === 'buy' ? bull : bear,
        text: `${position.side === 'buy' ? 'BUY' : 'SELL'} ${position.lots.toFixed(2)}`,
      })),
      lines: [
        ...shown.flatMap((position) => {
          const isBuy = position.side === 'buy';
          return [
            {
              price: position.entryPrice,
              color: isBuy ? bull : bear,
              title: `${isBuy ? 'BUY' : 'SELL'} #${position.number}`,
              dashed: false,
            },
            ...(position.stopLoss !== null
              ? [
                  {
                    price: position.stopLoss,
                    color: bear,
                    title: `SL #${position.number}`,
                    dashed: true,
                    id: position.id,
                    role: 'sl' as const,
                  },
                ]
              : []),
            ...(position.takeProfit !== null
              ? [
                  {
                    price: position.takeProfit,
                    color: bull,
                    title: `TP #${position.number}`,
                    dashed: true,
                    id: position.id,
                    role: 'tp' as const,
                  },
                ]
              : []),
          ];
        }),
        ...pending.flatMap((order) => {
          const isBuy = order.side === 'buy';
          return [
            {
              price: order.price,
              color: muted,
              title: `${order.orderType.toUpperCase()} ${isBuy ? 'BUY' : 'SELL'} #${order.number}`,
              dashed: true,
              id: order.id,
              role: 'pending' as const,
            },
            ...(order.stopLoss !== null
              ? [
                  {
                    price: order.stopLoss,
                    color: bear,
                    title: `SL #${order.number}`,
                    dashed: true,
                    id: order.id,
                    role: 'sl' as const,
                  },
                ]
              : []),
            ...(order.takeProfit !== null
              ? [
                  {
                    price: order.takeProfit,
                    color: bull,
                    title: `TP #${order.number}`,
                    dashed: true,
                    id: order.id,
                    role: 'tp' as const,
                  },
                ]
              : []),
          ];
        }),
      ],
    };
    chart.setOverlays(overlays);
  }, [positions, pending, enteredKey, pendingKey, stopsKey, timeframe, theme, chartRef]);
}
