import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CandlestickSeries,
  createChart,
  type CandlestickData,
  type IChartApi,
  type ISeriesApi,
  type MouseEventParams,
  type UTCTimestamp,
} from 'lightweight-charts';
import { M1_CANDLES, SYMBOL, indexAtOrBefore } from '@/data/marketData';
import type { Candle } from '@/domain/market';
import { CHART_FONT, candleSeriesOptions, chartThemeOptions } from '@/lib/chartTheme';
import {
  bucketIndexAt,
  buildTimeframeIndex,
  candleUpdates,
  latestCandle,
  visibleCandles,
} from '@/lib/replay';
import { useCandleColorsStore } from '@/stores/candleColorsStore';
import { usePlaybackStore } from '@/stores/playbackStore';
import { useThemeStore } from '@/stores/themeStore';
import { ChartLegend, sameOhlc, type Ohlc } from './ChartLegend';

const BAR_SPACING = 8;
const PRICE_SCALE_WIDTH = 64;
const RIGHT_PADDING_BARS = 8;
/** Above this many newly opened candles in one tick, redraw with setData instead of update(). */
const MAX_INCREMENTAL_CANDLES = 200;

const toBar = (candle: Candle): CandlestickData<UTCTimestamp> => ({
  time: candle.time as UTCTimestamp,
  open: candle.open,
  high: candle.high,
  low: candle.low,
  close: candle.close,
});

/** Shows the most recent candles at a comfortable density for the current screen width. */
function frameRecentBars(chart: IChartApi, containerWidth: number, barCount: number) {
  const fit = Math.max(30, Math.floor((containerWidth - PRICE_SCALE_WIDTH) / BAR_SPACING));
  const span = Math.min(barCount, fit);
  chart.timeScale().setVisibleLogicalRange({
    from: barCount - span - 1,
    to: barCount - 1 + RIGHT_PADDING_BARS,
  });
}

export function ChartView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const [hovered, setHovered] = useState<Ohlc | null>(null);

  const theme = useThemeStore((state) => state.theme);
  const colors = useCandleColorsStore((state) => state.colors);
  const timeframe = usePlaybackStore((state) => state.timeframe);
  const currentTime = usePlaybackStore((state) => state.currentTime);

  const timeframeIndex = useMemo(() => buildTimeframeIndex(M1_CANDLES, timeframe), [timeframe]);
  const latest = useMemo(
    () => latestCandle(M1_CANDLES, timeframeIndex, indexAtOrBefore(currentTime)),
    [timeframeIndex, currentTime],
  );

  // Create the chart once.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      autoSize: true,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        rightOffset: RIGHT_PADDING_BARS,
        barSpacing: BAR_SPACING,
        minBarSpacing: 1.5,
      },
      rightPriceScale: { scaleMargins: { top: 0.12, bottom: 0.1 } },
    });
    chart.applyOptions(chartThemeOptions());

    const series = chart.addSeries(CandlestickSeries, {
      ...candleSeriesOptions(useCandleColorsStore.getState().colors),
      priceFormat: { type: 'price', precision: SYMBOL.pricePrecision, minMove: SYMBOL.pipSize / 10 },
    });

    chart.subscribeCrosshairMove((param: MouseEventParams) => {
      const bar = param.time ? (param.seriesData.get(series) as CandlestickData | undefined) : undefined;
      const next = bar ? { open: bar.open, high: bar.high, low: bar.low, close: bar.close } : null;
      setHovered((previous) => (sameOhlc(previous, next) ? previous : next));
    });

    chart.timeScale().subscribeVisibleTimeRangeChange((range) => {
      usePlaybackStore
        .getState()
        .setVisibleRange(range ? { from: Number(range.from), to: Number(range.to) } : null);
    });

    // Canvas text is measured with whatever font is loaded at draw time: redraw once web fonts are ready.
    let disposed = false;
    void document.fonts.ready.then(() => {
      if (!disposed) chart.applyOptions({ layout: { fontFamily: CHART_FONT } });
    });

    chartRef.current = chart;
    seriesRef.current = series;
    return () => {
      disposed = true;
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  // Theme: re-read the CSS variables (the theme store has already updated the DOM).
  useEffect(() => {
    chartRef.current?.applyOptions(chartThemeOptions());
  }, [theme]);

  // Candle colors.
  useEffect(() => {
    seriesRef.current?.applyOptions(candleSeriesOptions(colors));
  }, [colors]);

  // Data: draw what the virtual clock has revealed, then follow it candle by candle.
  useEffect(() => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!chart || !series) return;

    let cursor = -1; // M1 index the chart currently shows

    const sync = (time: number) => {
      const next = indexAtOrBefore(time);
      if (next === cursor) return;

      const goingBack = next < cursor;
      const needsRedraw =
        cursor < 0 ||
        goingBack ||
        bucketIndexAt(timeframeIndex, next) - bucketIndexAt(timeframeIndex, cursor) > MAX_INCREMENTAL_CANDLES;

      if (needsRedraw) {
        const candles = visibleCandles(M1_CANDLES, timeframeIndex, next);
        series.setData(candles.map(toBar));
        if (cursor < 0 || goingBack) {
          frameRecentBars(chart, containerRef.current?.clientWidth ?? 0, candles.length);
        }
      } else {
        for (const candle of candleUpdates(M1_CANDLES, timeframeIndex, cursor, next)) {
          series.update(toBar(candle));
        }
      }
      cursor = next;
    };

    sync(usePlaybackStore.getState().currentTime);
    return usePlaybackStore.subscribe((state, previous) => {
      if (state.currentTime !== previous.currentTime) sync(state.currentTime);
    });
  }, [timeframeIndex]);

  return (
    <div className="relative min-h-0 flex-1 bg-chart">
      <div ref={containerRef} className="absolute inset-0" />
      <ChartLegend ohlc={hovered ?? latest} timeframe={timeframe} />
    </div>
  );
}
