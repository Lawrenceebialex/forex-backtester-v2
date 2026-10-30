import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronsRight, Scissors } from 'lucide-react';
import { CandleChart } from '@/chart/CandleChart';
import { readChartTheme } from '@/chart/theme';
import { M1_CANDLES, SYMBOL, indexAtOrBefore } from '@/data/marketData';
import { TIMEFRAME_SECONDS, type Candle } from '@/domain/market';
import { formatVirtualTime } from '@/lib/formatTime';
import {
  bucketIndexAt,
  bucketIndexByTime,
  buildTimeframeIndex,
  candleUpdates,
  latestCandle,
  visibleCandles,
} from '@/lib/replay';
import { useCandleColorsStore } from '@/stores/candleColorsStore';
import { usePlaybackStore } from '@/stores/playbackStore';
import { useThemeStore } from '@/stores/themeStore';
import { useToastStore } from '@/stores/toastStore';
import { useUiStore } from '@/stores/uiStore';
import { ChartLegend, sameOhlc, type Ohlc } from './ChartLegend';
import { usePositionOverlays } from './usePositionOverlays';

/** Above this many newly opened candles in one tick, redraw with setData instead of update(). */
const MAX_INCREMENTAL_CANDLES = 200;

export function ChartView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<CandleChart | null>(null);
  const [hovered, setHovered] = useState<Ohlc | null>(null);
  const [atLatest, setAtLatest] = useState(true);
  const [lockedCandle, setLockedCandle] = useState<Candle | null>(null);

  const cutMode = useUiStore((state) => state.cutMode);
  const setCutMode = useUiStore((state) => state.setCutMode);
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

    const chart = new CandleChart(
      container,
      { pricePrecision: SYMBOL.pricePrecision, pipSize: SYMBOL.pipSize },
      readChartTheme(),
      useCandleColorsStore.getState().colors,
      {
        onHover: (candle) => {
          const next = candle ? { open: candle.open, high: candle.high, low: candle.low, close: candle.close } : null;
          setHovered((previous) => (sameOhlc(previous, next) ? previous : next));
        },
        onCutChange: setLockedCandle,
        onLatestVisibleChange: setAtLatest,
        onVisibleRangeChange: (range) => usePlaybackStore.getState().setVisibleRange(range),
      },
    );
    chartRef.current = chart;

    // Canvas text is measured with whatever font is loaded at draw time: repaint once web fonts are ready.
    void document.fonts.ready.then(() => {
      if (chartRef.current === chart) chart.redraw();
    });

    return () => {
      chart.destroy();
      chartRef.current = null;
    };
  }, []);

  // Entry markers and SL / TP lines for open positions.
  usePositionOverlays(chartRef);

  // Theme: re-read the CSS variables (the theme store has already updated the DOM).
  useEffect(() => {
    chartRef.current?.setTheme(readChartTheme());
  }, [theme]);

  useEffect(() => {
    chartRef.current?.setCandleColors(colors);
  }, [colors]);

  // Data: draw what the virtual clock has revealed, then follow it candle by candle.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    chart.setTimeframe(TIMEFRAME_SECONDS[timeframeIndex.timeframe], `${SYMBOL.symbol} · ${timeframeIndex.timeframe}`);
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
        chart.setData(visibleCandles(M1_CANDLES, timeframeIndex, next), { reframe: cursor < 0 || goingBack });
      } else {
        for (const candle of candleUpdates(M1_CANDLES, timeframeIndex, cursor, next)) chart.update(candle);
      }
      cursor = next;
    };

    sync(usePlaybackStore.getState().currentTime);
    return usePlaybackStore.subscribe((state, previous) => {
      if (state.currentTime !== previous.currentTime) sync(state.currentTime);
    });
  }, [timeframeIndex]);

  // Cut mode.
  useEffect(() => {
    chartRef.current?.setCutMode(cutMode);
    if (!cutMode) return;
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && setCutMode(false);
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [cutMode, setCutMode]);

  const confirmCut = () => {
    if (!lockedCandle) return;
    const bucket = bucketIndexByTime(timeframeIndex, lockedCandle.time);
    if (bucket < 0) return;
    // Cut after the chosen candle — but never forward of where the clock already is.
    const cursor = indexAtOrBefore(usePlaybackStore.getState().currentTime);
    const target = M1_CANDLES[Math.min(timeframeIndex.buckets[bucket].last, cursor)].time;
    usePlaybackStore.getState().jumpTo(target);
    setCutMode(false);
    useToastStore.getState().push({
      tone: 'neutral',
      title: 'Chart cut',
      description: `Replay continues from ${formatVirtualTime(target)} UTC`,
    });
  };

  return (
    <div className="relative min-h-0 flex-1 bg-chart">
      <div ref={containerRef} className="absolute inset-0" />
      <ChartLegend ohlc={hovered ?? latest} timeframe={timeframe} />

      {!atLatest && !cutMode && (
        <button
          type="button"
          onClick={() => chartRef.current?.scrollToLatest()}
          aria-label="Scroll to latest candle"
          className="absolute bottom-10 right-20 z-10 inline-flex h-8 items-center gap-1.5 rounded-full border border-line bg-surface/95 px-3 text-xs font-medium text-ink shadow-overlay transition hover:bg-overlay coarse:h-10"
        >
          Latest <ChevronsRight size={14} />
        </button>
      )}

      {cutMode && (
        <div
          role="status"
          className="absolute inset-x-3 bottom-10 z-20 mx-auto flex max-w-lg items-center gap-3 rounded-xl border border-line bg-surface p-2.5 shadow-overlay"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
            <Scissors size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ink">
              {lockedCandle ? 'Cut after this candle?' : 'Tap a candle to choose where to cut'}
            </p>
            <p className="truncate font-mono text-xs tabular-nums text-ink-muted">
              {lockedCandle ? `${formatVirtualTime(lockedCandle.time)} UTC` : 'Everything after the line is removed. Your account is unchanged.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCutMode(false)}
            className="h-9 rounded-lg px-3 text-[13px] text-ink-muted transition-colors hover:bg-overlay hover:text-ink coarse:h-11"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!lockedCandle}
            onClick={confirmCut}
            className="h-9 rounded-lg bg-accent px-3 text-[13px] font-medium text-accent-ink transition hover:brightness-110 disabled:opacity-40 coarse:h-11"
          >
            Cut
          </button>
        </div>
      )}
    </div>
  );
}
