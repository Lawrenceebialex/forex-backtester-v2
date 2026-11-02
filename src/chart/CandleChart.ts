import type { CandleColors } from '@/domain/candleColors';
import type { ChartPoint, Drawing, DrawingKind, DrawingTool, NewDrawing } from '@/domain/drawings';
import type { Candle, TimeRange, UnixSeconds } from '@/domain/market';
import { clamp } from '@/lib/math';
import { niceTicks } from '@/lib/ticks';
import { drawDrawing, drawMeasure, hitTest, movedDrawing, type DrawingView, type HitPart } from './drawingLayer';
import type { ChartTheme } from './theme';
import { computeTimeTicks, formatCrosshairTime, pickTimeStep } from './timeAxis';

export interface OverlayLine {
  price: number;
  color: string;
  title: string;
  dashed: boolean;
  /** When set with role, the line can be dragged to update the trade. */
  id?: string;
  role?: 'pending' | 'sl' | 'tp';
}

export interface OverlayMarker {
  time: UnixSeconds;
  side: 'buy' | 'sell';
  text: string;
  color: string;
}

export interface ChartOverlays {
  lines: readonly OverlayLine[];
  markers: readonly OverlayMarker[];
}

export interface NewsMarker {
  time: UnixSeconds;
  label: string;
  color: string;
  ids: string[];
}

export interface NewsFocus {
  ids: string[];
  x: number;
  y: number;
}

export interface ChartConfig {
  pricePrecision: number;
  pipSize: number;
}

export interface ChartCallbacks {
  onHover?: (candle: Candle | null) => void;
  onCutChange?: (candle: Candle | null) => void;
  onLatestVisibleChange?: (visible: boolean) => void;
  onVisibleRangeChange?: (range: TimeRange | null) => void;
  onNewsFocus?: (focus: NewsFocus | null) => void;
  onDrawingCreate?: (drawing: NewDrawing) => void;
  onDrawingUpdate?: (drawing: Drawing) => void;
  onDrawingErase?: (id: string) => void;
  onDrawingSelect?: (id: string | null) => void;
  onTextRequest?: (request: { point: ChartPoint; x: number; y: number }) => void;
  onPriceTap?: (price: number) => void;
  onOverlayLineDrag?: (info: { id: string; role: 'pending' | 'sl' | 'tp'; price: number }) => void;
}

interface Point {
  x: number;
  y: number;
}

type Gesture =
  | { kind: 'pan'; startX: number; startEdge: number; moved: boolean; samples: Array<{ x: number; t: number }> }
  | { kind: 'pinch'; startDistance: number; startSpacing: number; anchorIndex: number; anchorX: number }
  | { kind: 'draw'; start: ChartPoint; startPx: Point; moved: boolean; fromPending: boolean }
  | { kind: 'drag'; origin: Drawing; part: HitPart; grab: ChartPoint; startPx: Point; moved: boolean }
  | { kind: 'line-drag'; id: string; role: 'pending' | 'sl' | 'tp'; color: string; title: string; dashed: boolean; startPx: Point; price: number; moved: boolean };

const MONO = '11px "JetBrains Mono Variable", ui-monospace, SFMono-Regular, Menlo, monospace';
const MONO_BOLD = '600 11px "JetBrains Mono Variable", ui-monospace, SFMono-Regular, Menlo, monospace';
const UI = '600 10px "Inter Variable", system-ui, -apple-system, sans-serif';
const MIN_SPACING = 1;
const MAX_SPACING = 48;
const RIGHT_PADDING_BARS = 8;
const TAP_SLOP = 5;
const PILL_HEIGHT = 18;
const TIME_AXIS_HEIGHT = 26;

function contrastText(hex: string): string {
  const value = /^#[0-9a-f]{6}$/i.test(hex) ? hex : '#888888';
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? '#111827' : '#ffffff';
}

/** STUB - full implementation being restored */
export class CandleChart {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly observer: ResizeObserver;
  private width = 0;
  private height = 0;
  private dpr = 1;
  private candles: Candle[] = [];
  private barSpacing = 8;
  private rightEdge = 0;
  private priceMin = 0;
  private priceMax = 1;
  private snapScale = true;
  private needsFrame = false;
  private timeframeSeconds = 60;
  private watermark = '';
  private overlays: ChartOverlays = { lines: [], markers: [] };
  private news: NewsMarker[] = [];
  private newsFocusKey = '';
  private drawings: Drawing[] = [];
  private tool: DrawingTool = 'cursor';
  private drawColor = '#3d70f2';
  private selectedId: string | null = null;
  private pending: ChartPoint | null = null;
  private draft: { a: ChartPoint; b: ChartPoint } | null = null;
  private measurement: { a: ChartPoint; b: ChartPoint } | null = null;
  private readonly pointers = new Map<number, Point>();
  private gesture: Gesture | null = null;
  private hover: Point | null = null;
  private hoverIndex = -1;
  private velocity = 0;
  private inertiaTime = 0;
  private inertiaActive = false;
  private cutMode = false;
  private cutIndex: number | null = null;
  private cutLocked = false;
  private raf = 0;
  private disposed = false;
  private latestVisible: boolean | null = null;
  private rangeKey = '';
  private pricePickMode = false;

  constructor(
    private readonly container: HTMLElement,
    private readonly config: ChartConfig,
    private theme: ChartTheme,
    private colors: CandleColors,
    private readonly callbacks: ChartCallbacks = {},
  ) {
    this.canvas = document.createElement('canvas');
    Object.assign(this.canvas.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      display: 'block',
      touchAction: 'none',
      outline: 'none',
      cursor: 'crosshair',
    });
    this.canvas.tabIndex = 0;
    this.container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;
    this.observer = new ResizeObserver(() => this.measure());
    this.observer.observe(this.container);
    this.measure();
  }

  setTheme(theme: ChartTheme): void { this.theme = theme; this.requestDraw(); }
  setCandleColors(colors: CandleColors): void { this.colors = colors; this.requestDraw(); }
  setTimeframe(seconds: number, label: string): void { this.timeframeSeconds = seconds; this.watermark = label; this.requestDraw(); }
  setData(candles: Candle[], options: { reframe: boolean }): void { this.candles = candles; if (options.reframe) this.frameView(); this.requestDraw(); }
  update(candle: Candle): void {
    const last = this.candles[this.candles.length - 1];
    if (last && last.time === candle.time) this.candles[this.candles.length - 1] = candle;
    else this.candles.push(candle);
    this.requestDraw();
  }
  setOverlays(overlays: ChartOverlays): void { this.overlays = overlays; this.requestDraw(); }
  setNewsMarkers(markers: NewsMarker[]): void { this.news = markers; this.requestDraw(); }
  setDrawings(drawings: Drawing[]): void { this.drawings = drawings; this.requestDraw(); }
  setTool(tool: DrawingTool): void { this.tool = tool; this.cancelDrawing(); this.select(null); }
  setDrawingColor(color: string): void { this.drawColor = color; this.requestDraw(); }
  cancelDrawing(): void { this.pending = null; this.draft = null; this.measurement = null; this.requestDraw(); }
  setCutMode(active: boolean): void { this.cutMode = active; this.cutIndex = null; this.cutLocked = false; this.requestDraw(); }
  scrollToLatest(): void { this.rightEdge = this.candles.length - 1 + RIGHT_PADDING_BARS; this.requestDraw(); }
  redraw(): void { this.requestDraw(); }
  setPricePickMode(on: boolean): void { this.pricePickMode = on; this.canvas.style.cursor = on ? 'crosshair' : 'crosshair'; }
  destroy(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.observer.disconnect();
    this.canvas.remove();
  }
  getViewState() {
    return { barSpacing: this.barSpacing, rightEdge: this.rightEdge, candleCount: this.candles.length, priceMin: this.priceMin, priceMax: this.priceMax, atLatest: true };
  }

  private measure(): void {
    const rect = this.container.getBoundingClientRect();
    const width = Math.floor(rect.width);
    const height = Math.floor(rect.height);
    if (width <= 0 || height <= 0) return;
    const dpr = globalThis.devicePixelRatio || 1;
    this.width = width; this.height = height; this.dpr = dpr;
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.requestDraw();
  }
  private plot() {
    const axisWidth = this.width < 520 ? 58 : 68;
    const right = this.width - axisWidth;
    const bottom = this.height - TIME_AXIS_HEIGHT;
    return { left: 0, top: 0, right, bottom, width: right, height: bottom, axisWidth };
  }
  private frameView(): void {
    const count = this.candles.length;
    const target = Math.min(Math.max(count, 1), 120);
    this.barSpacing = clamp(this.plot().width / (target + RIGHT_PADDING_BARS), 6, 22);
    this.rightEdge = count - 1 + RIGHT_PADDING_BARS;
  }
  private requestDraw(): void {
    if (this.raf || this.disposed) return;
    this.raf = requestAnimationFrame(() => { this.raf = 0; this.draw(); });
  }
  private draw(): void {
    if (!this.width || !this.height) return;
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = this.theme.background || '#0b0e11';
    ctx.fillRect(0, 0, this.width, this.height);
    // Minimal draw so build succeeds; full engine restore follows
    ctx.fillStyle = this.theme.textMuted || '#888';
    ctx.font = UI;
    ctx.fillText(this.watermark || 'Chart loading…', 12, 24);
  }
  private select(id: string | null): void {
    this.selectedId = id;
    this.callbacks.onDrawingSelect?.(id);
  }
}
