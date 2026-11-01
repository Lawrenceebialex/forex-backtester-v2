import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronsRight, Scissors } from 'lucide-react';
import { DrawingToolbar } from '@/components/drawing/DrawingToolbar';
import { TextPrompt } from '@/components/drawing/TextPrompt';
import { DRAWING_TOOLS } from '@/components/drawing/tools';
import { CandleChart, type NewsFocus } from '@/chart/CandleChart';
import { readChartTheme } from '@/chart/theme';
import { M1_CANDLES, MARKET_DATA_STATUS, SYMBOL, indexAtOrBefore } from '@/data/marketData';
import { NEWS_EVENTS, countReleased } from '@/data/newsEvents';
import type { ChartPoint } from '@/domain/drawings';
import { TIMEFRAME_SECONDS, type Candle } from '@/domain/market';
import { readCssColor } from '@/lib/cssColor';
import { formatVirtualTime } from '@/lib/formatTime';
import { groupNewsMarkers } from '@/lib/newsMarkers';
import {
  bucketIndexAt,
  bucketIndexByTime,
  buildTimeframeIndex,
  candleUpdates,
  latestCandle,
  visibleCandles,
} from '@/lib/replay';
import { useCandleColorsStore } from '@/stores/candleColorsStore';
import { useDrawingStore } from '@/stores/drawingStore';
import { useNewsStore } from '@/stores/newsStore';
import { usePlaybackStore } from '@/stores/playbackStore';
import { useThemeStore } from '@/stores/themeStore';
import { useToastStore } from '@/stores/toastStore';
import { useUiStore } from '@/stores/uiStore';
import { NewsCard } from '@/components/news/NewsCard';
import { ChartLegend, sameOhlc, type Ohlc } from './ChartLegend';
import { ChartSkeleton } from './ChartSkeleton';
import { usePositionOverlays } from './usePositionOverlays';

/** Above this many newly opened candles in one tick, redraw with setData instead of update(). */
const MAX_INCREMENTAL_CANDLES = 200;

export function ChartView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<CandleChart | null>(null);
  const [hovered, setHovered] = useState<Ohlc | null>(null);
  const [atLatest, setAtLatest] = useState(true);
  const [lockedCandle, setLockedCandle] = useState<Candle | null>(null);
  const [newsFocus, setNewsFocus] = useState<NewsFocus | null>(null);
  const [textRequest, setTextRequest] = useState<{ point: ChartPoint; x: number; y: number } | null>(null);

  const cutMode = useUiStore((state) => state.cutMode);
  const setCutMode = useUiStore((state) => state.setCutMode);
  const theme = useThemeStore((state) => state.theme);
  const colors = useCandleColorsStore((state) => state.colors);
  const tool = useDrawingStore((state) => state.tool);
  const drawColor = useDrawingStore((state) => state.color);
  const allDrawings = useDrawingStore((state) => state.drawings);
  const drawings = useMemo(() => allDrawings.filter((drawing) => drawing.symbol === SYMBOL.symbol), [allDrawings]);
  const timeframe = usePlaybackStore((state) => state.timeframe);
  const currentTime = usePlaybackStore((state) => state.currentTime);

  const newsVisible = useNewsStore((state) => state.visible);
  const minImpact = useNewsStore((state) => state.minImpact);
  const releasedNews = usePlaybackStore((state) => countReleased(NEWS_EVENTS, state.currentTime));

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
        onNewsFocus: setNewsFocus,
        onDrawingCreate: (drawing) => useDrawingStore.getState().add(drawing),
        onDrawingUpdate: (drawing) => useDrawingStore.getState().update(drawing),
        onDrawingErase: (id) => useDrawingStore.getState().remove(id),
        onDrawingSelect: (id) => useDrawingStore.getState().select(id),
        onTextRequest: setTextRequest,
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

  // News: only events that have already happened at the replay clock are shown.
  const newsMarkers = useMemo(() => {
    if (!newsVisible) return [];
    const now = usePlaybackStore.getState().currentTime;
    const shown = NEWS_EVENTS.filter((event) => event.time <= now && (minImpact === 'medium' || event.impact === 'high'));
    return groupNewsMarkers(shown, TIMEFRAME_SECONDS[timeframe], { high: readCssColor('--bear'), medium: readCssColor('--warn') });
    // `releasedNews` changes exactly when the clock passes an event; `theme` refreshes the colors.
  }, [newsVisible, minImpact, releasedNews, timeframe, theme]);

  useEffect(() => {
    chartRef.current?.setNewsMarkers(newsMarkers);
    setNewsFocus(null);
  }, [newsMarkers]);

  // Drawings: the saved shapes, the active tool and its color.
  useEffect(() => {
    chartRef.current?.setDrawings(drawings);
  }, [drawings]);
  useEffect(() => {
    chartRef.current?.setTool(tool);
    setTextRequest(null);
  }, [tool]);
  useEffect(() => {
    chartRef.current?.setDrawingColor(drawColor);
  }, [drawColor]);

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
      <DrawingToolbar />
      {MARKET_DATA_STATUS !== 'ready' && <ChartSkeleton error={MARKET_DATA_STATUS === 'error'} />}

      {tool !== 'cursor' && !cutMode && (
        <p className="pointer-events-none absolute bottom-10 left-2 right-24 z-10 truncate rounded-lg bg-surface/90 px-3 py-1.5 text-xs text-ink-muted shadow-overlay sm:right-auto sm:max-w-md">
          <span className="font-medium text-ink">{DRAWING_TOOLS.find((item) => item.id === tool)?.label}.</span> {DRAWING_TOOLS.find((item) => item.id === tool)?.hint} <span className="hidden sm:inline">Esc to stop.</span>
        </p>
      )}

      {textRequest && (
        <TextPrompt
          x={textRequest.x}
          y={textRequest.y}
          containerWidth={containerRef.current?.clientWidth ?? 600}
          onCancel={() => setTextRequest(null)}
          onSubmit={(text) => {
            useDrawingStore.getState().add({ kind: 'text', color: drawColor, a: textRequest.point, text });
            setTextRequest(null);
          }}
        />
      )}

      {newsFocus && <NewsCard ids={newsFocus.ids} x={newsFocus.x} y={newsFocus.y} containerWidth={containerRef.current?.clientWidth ?? 600} />}

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
