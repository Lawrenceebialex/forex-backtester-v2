import type { CandleColors } from '@/domain/candleColors';
import type { Candle, TimeRange, UnixSeconds } from '@/domain/market';
import { clamp } from '@/lib/math';
import { niceTicks } from '@/lib/ticks';
import type { ChartTheme } from './theme';
import { computeTimeTicks, formatCrosshairTime, pickTimeStep } from './timeAxis';

export interface OverlayLine {
  price: number;
  color: string;
  title: string;
  dashed: boolean;
}

export interface OverlayMarker {
  /** Open time of the candle the marker belongs to (on the current timeframe). */
  time: UnixSeconds;
  side: 'buy' | 'sell';
  text: string;
  color: string;
}

export interface ChartOverlays {
  lines: readonly OverlayLine[];
  markers: readonly OverlayMarker[];
}

export interface ChartConfig {
  pricePrecision: number;
  pipSize: number;
}

export interface ChartCallbacks {
  /** The candle under the crosshair, or null when it leaves the chart. */
  onHover?: (candle: Candle | null) => void;
  /** In cut mode: the candle the user locked the cut line onto. */
  onCutChange?: (candle: Candle | null) => void;
  /** Whether the newest candle is on screen (drives a "Latest" button). */
  onLatestVisibleChange?: (visible: boolean) => void;
  onVisibleRangeChange?: (range: TimeRange | null) => void;
}

interface Point {
  x: number;
  y: number;
}

type Gesture =
  | { kind: 'pan'; startX: number; startEdge: number; moved: boolean; samples: Array<{ x: number; t: number }> }
  | { kind: 'pinch'; startDistance: number; startSpacing: number; anchorIndex: number; anchorX: number };

const MONO = '11px "JetBrains Mono Variable", ui-monospace, SFMono-Regular, Menlo, monospace';
const MONO_BOLD = '600 11px "JetBrains Mono Variable", ui-monospace, SFMono-Regular, Menlo, monospace';
const UI = '600 10px "Inter Variable", system-ui, -apple-system, sans-serif';
const MIN_SPACING = 1;
const MAX_SPACING = 48;
const RIGHT_PADDING_BARS = 8;
const TAP_SLOP = 5;
const PILL_HEIGHT = 18;
const TIME_AXIS_HEIGHT = 26;

/** Text color that stays readable on top of a hex background. */
function contrastText(hex: string): string {
  const value = /^#[0-9a-f]{6}$/i.test(hex) ? hex : '#888888';
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? '#111827' : '#ffffff';
}

/**
 * Canvas candlestick chart built for replay: crisp on any screen density, smooth pan and zoom
 * (drag with momentum, wheel / pinch zoom around the pointer), animated price auto-scale,
 * a snapping crosshair, position markers and price lines, and a replay "cut" line.
 * Rendering is on-demand: a frame is drawn only when something changed.
 */
export class CandleChart {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly observer: ResizeObserver;

  private width = 0;
  private height = 0;
  private dpr = 1;

  private candles: Candle[] = [];
  private barSpacing = 8;
  /** Logical index sitting at the right edge of the plot (fractional while panning). */
  private rightEdge = 0;
  private priceMin = 0;
  private priceMax = 1;
  private snapScale = true;
  private needsFrame = false;

  private timeframeSeconds = 60;
  private watermark = '';
  private overlays: ChartOverlays = { lines: [], markers: [] };

  private readonly pointers = new Map<number, Point>();
  private gesture: Gesture | null = null;
  private hover: Point | null = null;
  private hoverIndex = -1;
  private velocity = 0; // px per ms
  private inertiaTime = 0;
  private inertiaActive = false;

  private cutMode = false;
  private cutIndex: number | null = null;
  private cutLocked = false;

  private raf = 0;
  private disposed = false;
  private latestVisible: boolean | null = null;
  private rangeKey = '';

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
    this.canvas.setAttribute?.('role', 'img');
    this.canvas.setAttribute?.('aria-label', 'Price chart. Drag to pan, scroll or pinch to zoom, arrow keys to move.');
    this.container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;

    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('pointercancel', this.onPointerUp);
    this.canvas.addEventListener('pointerleave', this.onPointerLeave);
    this.canvas.addEventListener('wheel', this.onWheel as EventListener, { passive: false });
    this.canvas.addEventListener('dblclick', this.onDoubleClick);
    this.canvas.addEventListener('keydown', this.onKeyDown as EventListener);

    this.observer = new ResizeObserver(() => this.measure());
    this.observer.observe(this.container);
    this.measure();
  }

  // ───────────────────────────── public API ─────────────────────────────

  setTheme(theme: ChartTheme): void {
    this.theme = theme;
    this.requestDraw();
  }

  setCandleColors(colors: CandleColors): void {
    this.colors = colors;
    this.requestDraw();
  }

  setTimeframe(seconds: number, label: string): void {
    this.timeframeSeconds = seconds;
    this.watermark = label;
    this.requestDraw();
  }

  /** Replaces all candles. `reframe` re-fits zoom and position to the newest candles. */
  setData(candles: Candle[], options: { reframe: boolean }): void {
    const wasFollowing = this.isFollowing();
    const previousCount = this.candles.length;
    this.candles = candles;
    this.hoverIndex = -1;
    if (options.reframe && this.cutIndex !== null) {
      this.cutIndex = null;
      this.cutLocked = false;
      this.callbacks.onCutChange?.(null);
    }
    if (options.reframe || previousCount === 0) {
      if (this.width > 0) this.frameView();
      else this.needsFrame = true;
    } else if (wasFollowing) {
      this.rightEdge += candles.length - previousCount;
    }
    this.clampEdge();
    this.requestDraw();
  }

  /** Replaces the newest candle (same time) or appends a new one. Follows the live edge if it was in view. */
  update(candle: Candle): void {
    const last = this.candles[this.candles.length - 1];
    if (last && last.time === candle.time) {
      this.candles[this.candles.length - 1] = candle;
    } else {
      const wasFollowing = this.isFollowing();
      this.candles.push(candle);
      if (wasFollowing) this.rightEdge += 1;
    }
    this.requestDraw();
  }

  setOverlays(overlays: ChartOverlays): void {
    this.overlays = overlays;
    this.requestDraw();
  }

  /** Cut mode: hovering previews the cut line, a click or tap locks it onto a candle. */
  setCutMode(active: boolean): void {
    if (this.cutMode === active) return;
    this.cutMode = active;
    this.cutIndex = null;
    this.cutLocked = false;
    this.callbacks.onCutChange?.(null);
    this.requestDraw();
  }

  /** Glides back to the newest candle, keeping the current zoom. */
  scrollToLatest(): void {
    this.rightEdge = this.candles.length - 1 + RIGHT_PADDING_BARS;
    this.velocity = 0;
    this.requestDraw();
  }

  /** Repaint (e.g. after web fonts finished loading). */
  redraw(): void {
    this.requestDraw();
  }

  destroy(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.observer.disconnect();
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointercancel', this.onPointerUp);
    this.canvas.removeEventListener('pointerleave', this.onPointerLeave);
    this.canvas.removeEventListener('wheel', this.onWheel as EventListener);
    this.canvas.removeEventListener('dblclick', this.onDoubleClick);
    this.canvas.removeEventListener('keydown', this.onKeyDown as EventListener);
    this.canvas.remove();
  }

  /** Snapshot of the view, for tests. */
  getViewState() {
    return {
      barSpacing: this.barSpacing,
      rightEdge: this.rightEdge,
      candleCount: this.candles.length,
      priceMin: this.priceMin,
      priceMax: this.priceMax,
      atLatest: this.isLatestVisible(),
    };
  }

  // ───────────────────────────── geometry ─────────────────────────────

  private measure(): void {
    const rect = this.container.getBoundingClientRect();
    const width = Math.floor(rect.width);
    const height = Math.floor(rect.height);
    if (width <= 0 || height <= 0) {
      this.width = 0; // hidden: keep the view, redraw when shown again
      return;
    }
    const dpr = globalThis.devicePixelRatio || 1;
    if (width !== this.width || height !== this.height || dpr !== this.dpr) {
      this.width = width;
      this.height = height;
      this.dpr = dpr;
      this.canvas.width = Math.round(width * dpr);
      this.canvas.height = Math.round(height * dpr);
      if (this.needsFrame) this.frameView();
      this.clampEdge();
    }
    this.requestDraw();
  }

  private plot() {
    const axisWidth = this.width < 520 ? 58 : 68;
    const right = this.width - axisWidth;
    const bottom = this.height - TIME_AXIS_HEIGHT;
    return { left: 0, top: 0, right, bottom, width: right, height: bottom, axisWidth };
  }

  private xOf(index: number, plotRight: number): number {
    return plotRight - (this.rightEdge - index) * this.barSpacing;
  }

  private indexAt(x: number, plotRight: number): number {
    return this.rightEdge - (plotRight - x) / this.barSpacing;
  }

  private yOf(price: number, plotHeight: number): number {
    return ((this.priceMax - price) / (this.priceMax - this.priceMin)) * plotHeight;
  }

  private priceAt(y: number, plotHeight: number): number {
    return this.priceMax - (y / plotHeight) * (this.priceMax - this.priceMin);
  }

  private clampEdge(): void {
    const count = this.candles.length;
    if (count === 0 || this.width === 0) return;
    const visibleBars = this.plot().width / this.barSpacing;
    const maxEdge = count - 1 + visibleBars * 0.6; // room for empty space on the right
    const minEdge = Math.min(count - 1, 5); // always keep a few candles in view
    this.rightEdge = clamp(this.rightEdge, minEdge, Math.max(minEdge, maxEdge));
  }

  /** Fit the newest candles at a comfortable density (chunkier candles on small screens). */
  private frameView(): void {
    this.needsFrame = false;
    const count = this.candles.length;
    const target = Math.min(Math.max(count, 1), 120);
    this.barSpacing = clamp(this.plot().width / (target + RIGHT_PADDING_BARS), 6, 22);
    this.rightEdge = count - 1 + RIGHT_PADDING_BARS;
    this.velocity = 0;
    this.snapScale = true;
    this.clampEdge();
  }

  private isLatestVisible(): boolean {
    const last = this.candles.length - 1;
    if (last < 0 || this.width === 0) return true;
    const plot = this.plot();
    return this.xOf(last, plot.right) <= plot.right && this.xOf(last, plot.right) >= plot.left;
  }

  private isFollowing(): boolean {
    return this.candles.length === 0 || this.isLatestVisible();
  }

  private zoomAt(x: number, factor: number): void {
    const plot = this.plot();
    const anchor = this.indexAt(x, plot.right);
    this.barSpacing = clamp(this.barSpacing * factor, MIN_SPACING, MAX_SPACING);
    this.rightEdge = anchor + (plot.right - x) / this.barSpacing;
    this.clampEdge();
    this.requestDraw();
  }

  // ───────────────────────────── input ─────────────────────────────

  private localPoint(event: { clientX: number; clientY: number }): Point {
    const rect = this.canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  private readonly onPointerDown = (event: PointerEvent) => {
    const point = this.localPoint(event);
    this.canvas.setPointerCapture?.(event.pointerId);
    this.pointers.set(event.pointerId, point);
    this.inertiaActive = false;
    this.velocity = 0;

    if (this.pointers.size === 1) {
      this.gesture = { kind: 'pan', startX: point.x, startEdge: this.rightEdge, moved: false, samples: [{ x: point.x, t: event.timeStamp }] };
    } else if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      const midX = (a.x + b.x) / 2;
      this.gesture = {
        kind: 'pinch',
        startDistance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
        startSpacing: this.barSpacing,
        anchorIndex: this.indexAt(midX, this.plot().right),
        anchorX: midX,
      };
      this.hover = null;
    }
  };

  private readonly onPointerMove = (event: PointerEvent) => {
    const point = this.localPoint(event);
    const gesture = this.gesture;

    if (this.pointers.has(event.pointerId)) this.pointers.set(event.pointerId, point);

    if (gesture?.kind === 'pinch' && this.pointers.size >= 2) {
      const [a, b] = [...this.pointers.values()];
      const midX = (a.x + b.x) / 2;
      const distance = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
      const plot = this.plot();
      this.barSpacing = clamp(gesture.startSpacing * (distance / gesture.startDistance), MIN_SPACING, MAX_SPACING);
      this.rightEdge = gesture.anchorIndex + (plot.right - midX) / this.barSpacing;
      this.clampEdge();
      this.requestDraw();
      return;
    }

    if (gesture?.kind === 'pan' && this.pointers.has(event.pointerId)) {
      const dx = point.x - gesture.startX;
      if (!gesture.moved && Math.abs(dx) > TAP_SLOP) {
        gesture.moved = true;
        this.setHover(null);
        this.canvas.style.cursor = 'grabbing';
      }
      if (gesture.moved) {
        this.rightEdge = gesture.startEdge - dx / this.barSpacing;
        this.clampEdge();
        gesture.samples.push({ x: point.x, t: event.timeStamp });
        if (gesture.samples.length > 6) gesture.samples.shift();
        this.requestDraw();
      }
      return;
    }

    if (event.pointerType === 'mouse') this.setHover(point);
  };

  private readonly onPointerUp = (event: PointerEvent) => {
    const gesture = this.gesture;
    const point = this.pointers.get(event.pointerId) ?? this.localPoint(event);
    this.pointers.delete(event.pointerId);
    this.canvas.releasePointerCapture?.(event.pointerId);
    this.canvas.style.cursor = 'crosshair';

    if (gesture?.kind === 'pan') {
      this.gesture = null;
      if (!gesture.moved) {
        this.onTap(point, event.pointerType);
      } else {
        // After a pinch the remaining finger has no movement history, so there is no momentum to carry.
        const first = gesture.samples.find((s) => event.timeStamp - s.t < 120) ?? gesture.samples[0];
        const last = gesture.samples[gesture.samples.length - 1];
        const dt = first && last ? last.t - first.t : 0;
        if (first && last && dt > 0 && Math.abs(last.x - first.x) / dt > 0.25) {
          this.velocity = (last.x - first.x) / dt;
          this.inertiaTime = performance.now();
          this.inertiaActive = true;
          this.requestDraw();
        }
      }
    } else if (gesture?.kind === 'pinch') {
      const [remaining] = [...this.pointers.values()];
      this.gesture = remaining
        ? { kind: 'pan', startX: remaining.x, startEdge: this.rightEdge, moved: true, samples: [] }
        : null;
    }
  };

  private readonly onPointerLeave = (event: PointerEvent) => {
    if (event.pointerType === 'mouse' && !this.gesture) this.setHover(null);
  };

  private onTap(point: Point, pointerType: string): void {
    const plot = this.plot();
    if (point.x > plot.right || point.y > plot.bottom || this.candles.length === 0) return;
    const index = clamp(Math.round(this.indexAt(point.x, plot.right)), 0, this.candles.length - 1);

    if (this.cutMode) {
      this.cutIndex = index;
      this.cutLocked = true;
      this.callbacks.onCutChange?.(this.candles[index]);
      this.requestDraw();
    } else if (pointerType !== 'mouse') {
      // Touch has no hover: a tap places the crosshair, tapping the same candle again removes it.
      this.setHover(this.hoverIndex === index ? null : point);
    }
  }

  private readonly onWheel = (event: WheelEvent) => {
    event.preventDefault();
    const scale = event.deltaMode === 1 ? 16 : 1;
    const dx = event.deltaX * scale;
    const dy = event.deltaY * scale;
    const point = this.localPoint(event);

    if (event.shiftKey || (Math.abs(dx) > Math.abs(dy) && !event.ctrlKey)) {
      this.rightEdge += (Math.abs(dx) > Math.abs(dy) ? dx : dy) / this.barSpacing;
      this.clampEdge();
      this.requestDraw();
    } else {
      this.zoomAt(point.x, Math.exp(-dy * (event.ctrlKey ? 0.01 : 0.0016)));
    }
  };

  private readonly onDoubleClick = () => {
    if (this.cutMode) return;
    this.frameView();
    this.requestDraw();
  };

  private readonly onKeyDown = (event: KeyboardEvent) => {
    const plot = this.plot();
    const handled = ['ArrowLeft', 'ArrowRight', '+', '=', '-', '_', 'Home', 'End'];
    if (!handled.includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'ArrowLeft') this.rightEdge -= 10;
    else if (event.key === 'ArrowRight') this.rightEdge += 10;
    else if (event.key === 'Home') this.rightEdge = Math.min(this.candles.length - 1, 5);
    else if (event.key === 'End') return this.scrollToLatest();
    else return this.zoomAt(plot.right - 1, event.key === '-' || event.key === '_' ? 0.85 : 1.18);
    this.clampEdge();
    this.requestDraw();
  };

  private setHover(point: Point | null): void {
    const plot = this.plot();
    const inside = point !== null && point.x <= plot.right && point.y <= plot.bottom && this.candles.length > 0;
    this.hover = inside ? point : null;
    const index = inside ? clamp(Math.round(this.indexAt(point.x, plot.right)), 0, this.candles.length - 1) : -1;

    if (index !== this.hoverIndex) {
      this.hoverIndex = index;
      this.callbacks.onHover?.(index >= 0 ? this.candles[index] : null);
    }
    if (this.cutMode && !this.cutLocked) this.cutIndex = index >= 0 ? index : null;
    this.requestDraw();
  }

  // ───────────────────────────── rendering ─────────────────────────────

  private requestDraw(): void {
    if (this.raf !== 0 || this.disposed) return;
    this.raf = requestAnimationFrame(this.draw);
  }

  private stepInertia(): boolean {
    if (!this.inertiaActive) return false;
    const now = performance.now();
    const dt = Math.min(now - this.inertiaTime, 50);
    this.inertiaTime = now;
    const before = this.rightEdge;
    this.rightEdge -= (this.velocity * dt) / this.barSpacing;
    this.clampEdge();
    this.velocity *= Math.pow(0.94, dt / 16);
    if (Math.abs(this.velocity) < 0.02 || this.rightEdge === before) this.inertiaActive = false;
    return this.inertiaActive;
  }

  /** Animates the price range toward what the visible candles need. Returns true while still moving. */
  private stepScale(first: number, last: number): boolean {
    let low = Infinity;
    let high = -Infinity;
    for (let i = first; i <= last; i++) {
      const candle = this.candles[i];
      if (candle.low < low) low = candle.low;
      if (candle.high > high) high = candle.high;
    }
    if (!Number.isFinite(low)) return false;

    const range = Math.max(high - low, this.config.pipSize * 4);
    const targetMin = low - range * 0.12;
    const targetMax = high + range * 0.14;

    if (this.snapScale) {
      this.priceMin = targetMin;
      this.priceMax = targetMax;
      this.snapScale = false;
      return false;
    }
    const gap = Math.abs(targetMin - this.priceMin) + Math.abs(targetMax - this.priceMax);
    if (gap < (targetMax - targetMin) * 0.002) {
      this.priceMin = targetMin;
      this.priceMax = targetMax;
      return false;
    }
    this.priceMin += (targetMin - this.priceMin) * 0.3;
    this.priceMax += (targetMax - this.priceMax) * 0.3;
    return true;
  }

  private readonly draw = () => {
    this.raf = 0;
    if (this.disposed || this.width === 0) return;
    const { ctx, theme, dpr } = this;

    let animating = this.stepInertia();
    const plot = this.plot();
    const count = this.candles.length;
    const first = Math.max(0, Math.floor(this.indexAt(plot.left, plot.right)) - 1);
    const last = Math.min(count - 1, Math.ceil(this.indexAt(plot.right, plot.right)) + 1);
    if (count > 0 && last >= first) animating = this.stepScale(first, last) || animating;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = theme.background;
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.textBaseline = 'middle';

    const priceTicks = count > 0 ? niceTicks(this.priceMin, this.priceMax, Math.max(3, Math.floor(plot.height / 58))) : [];
    const timeStep = pickTimeStep(this.barSpacing, this.timeframeSeconds);
    const timeTicks = count > 0 && last >= first ? computeTimeTicks(this.candles, first, last, timeStep) : [];

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, plot.right, plot.bottom);
    ctx.clip();
    this.drawWatermark(plot);
    this.drawGrid(plot, priceTicks, timeTicks.map((tick) => tick.index));
    if (count > 0 && last >= first) {
      this.drawCandles(plot, first, last);
      this.drawOverlayLines(plot);
      this.drawMarkers(plot, first, last);
      this.drawLastPriceLine(plot);
    }
    this.drawCut(plot);
    this.drawCrosshairLines(plot);
    ctx.restore();

    this.drawAxes(plot, priceTicks, timeTicks);
    this.report(plot, first, last);
    if (animating) this.requestDraw();
  };

  private line(value: number, widthCss: number): number {
    const device = Math.max(1, Math.round(widthCss * this.dpr));
    return (device % 2 === 1 ? Math.floor(value * this.dpr) + 0.5 : Math.round(value * this.dpr)) / this.dpr;
  }

  private drawWatermark(plot: ReturnType<CandleChart['plot']>): void {
    if (!this.watermark) return;
    const { ctx } = this;
    ctx.font = `700 ${clamp(plot.width / 9, 28, 76)}px "Inter Variable", system-ui, sans-serif`;
    ctx.fillStyle = this.theme.watermark;
    ctx.textAlign = 'center';
    ctx.fillText(this.watermark, plot.width / 2, plot.height / 2);
  }

  private drawGrid(plot: ReturnType<CandleChart['plot']>, priceTicks: number[], timeIndices: number[]): void {
    const { ctx } = this;
    ctx.strokeStyle = this.theme.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const price of priceTicks) {
      const y = this.line(this.yOf(price, plot.height), 1);
      ctx.moveTo(0, y);
      ctx.lineTo(plot.right, y);
    }
    for (const index of timeIndices) {
      const x = this.line(this.xOf(index, plot.right), 1);
      ctx.moveTo(x, 0);
      ctx.lineTo(x, plot.bottom);
    }
    ctx.stroke();
  }

  private drawCandles(plot: ReturnType<CandleChart['plot']>, first: number, last: number): void {
    const { ctx, dpr, colors } = this;
    let bodyDevice = Math.max(1, Math.floor(this.barSpacing * 0.72 * dpr));
    if (bodyDevice % 2 === 0) bodyDevice += 1; // odd width keeps the wick exactly centred
    const wickDevice = Math.max(1, Math.round(dpr)) % 2 === 0 ? Math.max(1, Math.round(dpr) - 1) : Math.max(1, Math.round(dpr));
    const px = 1 / dpr;
    const snapY = (price: number) => Math.round(this.yOf(price, plot.height) * dpr) / dpr;

    for (let i = first; i <= last; i++) {
      const candle = this.candles[i];
      const up = candle.close >= candle.open;
      const x = (Math.floor(this.xOf(i, plot.right) * dpr) + 0.5) / dpr;
      const high = snapY(candle.high);
      const low = snapY(candle.low);
      const a = snapY(candle.open);
      const b = snapY(candle.close);
      const top = Math.min(a, b);
      const height = Math.max(px, Math.abs(a - b));

      ctx.fillStyle = up ? colors.upWick : colors.downWick;
      ctx.fillRect(x - (wickDevice * px) / 2, high, wickDevice * px, Math.max(px, low - high));

      const width = bodyDevice * px;
      ctx.fillStyle = up ? colors.upBorder : colors.downBorder;
      ctx.fillRect(x - width / 2, top, width, height);
      if (bodyDevice >= 3 && height >= 3 * px) {
        ctx.fillStyle = up ? colors.upBody : colors.downBody;
        ctx.fillRect(x - width / 2 + px, top + px, width - 2 * px, height - 2 * px);
      }
    }
  }

  private drawOverlayLines(plot: ReturnType<CandleChart['plot']>): void {
    const { ctx } = this;
    ctx.lineWidth = 1;
    for (const line of this.overlays.lines) {
      const y = this.yOf(line.price, plot.height);
      if (y < 0 || y > plot.bottom) continue;
      const snapped = this.line(y, 1);
      ctx.strokeStyle = line.color;
      ctx.setLineDash(line.dashed ? [6, 4] : [2, 3]);
      ctx.beginPath();
      ctx.moveTo(0, snapped);
      ctx.lineTo(plot.right, snapped);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.font = UI;
      ctx.textAlign = 'right';
      const width = ctx.measureText(line.title).width + 12;
      ctx.fillStyle = this.theme.background;
      this.roundedRect(plot.right - width - 6, snapped - 17, width, 15, 4);
      ctx.fill();
      ctx.fillStyle = line.color;
      ctx.fillText(line.title, plot.right - 12, snapped - 9.5);
    }
  }

  private drawMarkers(plot: ReturnType<CandleChart['plot']>, first: number, last: number): void {
    const { ctx } = this;
    const size = clamp(this.barSpacing * 0.9, 8, 12);
    for (const marker of this.overlays.markers) {
      const index = this.indexOfTime(marker.time);
      if (index < first || index > last) continue;
      const candle = this.candles[index];
      const x = this.xOf(index, plot.right);
      const buy = marker.side === 'buy';
      const edge = this.yOf(buy ? candle.low : candle.high, plot.height);
      const tip = edge + (buy ? 7 : -7);
      const base = tip + (buy ? size : -size);

      ctx.fillStyle = marker.color;
      ctx.beginPath();
      ctx.moveTo(x, tip);
      ctx.lineTo(x - size * 0.6, base);
      ctx.lineTo(x + size * 0.6, base);
      ctx.closePath();
      ctx.fill();

      ctx.font = UI;
      ctx.textAlign = 'center';
      ctx.fillText(marker.text, x, base + (buy ? 11 : -11));
    }
  }

  private indexOfTime(time: UnixSeconds): number {
    let low = 0;
    let high = this.candles.length - 1;
    while (low <= high) {
      const mid = (low + high) >> 1;
      const value = this.candles[mid].time;
      if (value === time) return mid;
      if (value < time) low = mid + 1;
      else high = mid - 1;
    }
    return -1;
  }

  private lastPriceColor(): string {
    const last = this.candles[this.candles.length - 1];
    return last.close >= last.open ? this.colors.upBorder : this.colors.downBorder;
  }

  private drawLastPriceLine(plot: ReturnType<CandleChart['plot']>): void {
    const last = this.candles[this.candles.length - 1];
    const y = this.yOf(last.close, plot.height);
    if (y < 0 || y > plot.bottom) return;
    const { ctx } = this;
    ctx.strokeStyle = this.lastPriceColor();
    ctx.globalAlpha = 0.65;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(0, this.line(y, 1));
    ctx.lineTo(plot.right, this.line(y, 1));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  private drawCut(plot: ReturnType<CandleChart['plot']>): void {
    if (!this.cutMode || this.cutIndex === null) return;
    const { ctx } = this;
    const x = this.xOf(this.cutIndex, plot.right) + this.barSpacing / 2;
    if (x > plot.right) return;

    ctx.globalAlpha = this.cutLocked ? 0.62 : 0.4;
    ctx.fillStyle = this.theme.background;
    ctx.fillRect(Math.max(0, x), 0, plot.right - Math.max(0, x), plot.bottom);
    ctx.globalAlpha = 1;

    ctx.strokeStyle = this.theme.accent;
    ctx.lineWidth = this.cutLocked ? 2 : 1;
    ctx.setLineDash(this.cutLocked ? [] : [5, 4]);
    ctx.beginPath();
    ctx.moveTo(this.line(x, ctx.lineWidth), 0);
    ctx.lineTo(this.line(x, ctx.lineWidth), plot.bottom);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.font = UI;
    ctx.textAlign = 'center';
    const width = ctx.measureText('CUT HERE').width + 14;
    const left = clamp(x - width / 2, 4, plot.right - width - 4);
    ctx.fillStyle = this.theme.accent;
    this.roundedRect(left, 8, width, 18, 9);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText('CUT HERE', left + width / 2, 17.5);
  }

  private drawCrosshairLines(plot: ReturnType<CandleChart['plot']>): void {
    if (!this.hover || this.hoverIndex < 0 || this.gesture?.kind === 'pinch' || this.cutMode) return;
    const { ctx } = this;
    const x = this.line(this.xOf(this.hoverIndex, plot.right), 1);
    const y = this.line(this.hover.y, 1);
    ctx.strokeStyle = this.theme.crosshair;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, plot.bottom);
    ctx.moveTo(0, y);
    ctx.lineTo(plot.right, y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private roundedRect(x: number, y: number, w: number, h: number, r: number): void {
    const { ctx } = this;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  private priceText(price: number): string {
    return price.toFixed(this.config.pricePrecision);
  }

  private axisPill(plot: ReturnType<CandleChart['plot']>, y: number, text: string, background: string, color: string): void {
    const { ctx } = this;
    const top = clamp(y - PILL_HEIGHT / 2, 0, plot.bottom - PILL_HEIGHT);
    ctx.fillStyle = background;
    this.roundedRect(plot.right + 1, top, plot.axisWidth - 3, PILL_HEIGHT, 4);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.font = MONO;
    ctx.textAlign = 'left';
    ctx.fillText(text, plot.right + 8, top + PILL_HEIGHT / 2 + 0.5);
  }

  private timePill(plot: ReturnType<CandleChart['plot']>, x: number, text: string, background: string, color: string): void {
    const { ctx } = this;
    ctx.font = MONO;
    const width = ctx.measureText(text).width + 16;
    const left = clamp(x - width / 2, 2, plot.right - width - 2);
    ctx.fillStyle = background;
    this.roundedRect(left, plot.bottom + 3, width, TIME_AXIS_HEIGHT - 6, 4);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.fillText(text, left + width / 2, plot.bottom + TIME_AXIS_HEIGHT / 2 + 0.5);
  }

  private drawAxes(
    plot: ReturnType<CandleChart['plot']>,
    priceTicks: number[],
    timeTicks: ReturnType<typeof computeTimeTicks>,
  ): void {
    const { ctx, theme } = this;

    ctx.strokeStyle = theme.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.line(plot.right, 1), 0);
    ctx.lineTo(this.line(plot.right, 1), plot.bottom);
    ctx.moveTo(0, this.line(plot.bottom, 1));
    ctx.lineTo(this.width, this.line(plot.bottom, 1));
    ctx.stroke();

    ctx.fillStyle = theme.text;
    ctx.font = MONO;
    ctx.textAlign = 'left';
    for (const price of priceTicks) {
      const y = this.yOf(price, plot.height);
      if (y > 8 && y < plot.bottom - 8) ctx.fillText(this.priceText(price), plot.right + 8, y);
    }
    ctx.textAlign = 'center';
    for (const tick of timeTicks) {
      const x = this.xOf(tick.index, plot.right);
      if (x < 22 || x > plot.right - 22) continue;
      ctx.font = tick.major ? MONO_BOLD : MONO;
      ctx.fillText(tick.label, x, plot.bottom + TIME_AXIS_HEIGHT / 2 + 0.5);
    }

    if (this.candles.length === 0) return;

    // Price pills: position lines first (nudged apart), then last price, then the crosshair on top.
    const pills = this.overlays.lines
      .map((line) => ({ y: this.yOf(line.price, plot.height), text: this.priceText(line.price), color: line.color }))
      .filter((pill) => pill.y >= 0 && pill.y <= plot.bottom)
      .sort((a, b) => a.y - b.y);
    for (let i = 1; i < pills.length; i++) {
      if (pills[i].y - pills[i - 1].y < PILL_HEIGHT) pills[i].y = pills[i - 1].y + PILL_HEIGHT;
    }
    for (const pill of pills) this.axisPill(plot, pill.y, pill.text, pill.color, '#ffffff');

    const lastCandle = this.candles[this.candles.length - 1];
    const lastY = this.yOf(lastCandle.close, plot.height);
    if (lastY >= 0 && lastY <= plot.bottom) {
      const background = this.lastPriceColor();
      this.axisPill(plot, lastY, this.priceText(lastCandle.close), background, contrastText(background));
    }

    if (this.cutMode && this.cutIndex !== null) {
      this.timePill(plot, this.xOf(this.cutIndex, plot.right) + this.barSpacing / 2, formatCrosshairTime(this.candles[this.cutIndex].time), theme.accent, '#ffffff');
    } else if (this.hover && this.hoverIndex >= 0 && !this.cutMode) {
      this.axisPill(plot, this.hover.y, this.priceText(this.priceAt(this.hover.y, plot.height)), theme.labelBackground, theme.labelText);
      this.timePill(plot, this.xOf(this.hoverIndex, plot.right), formatCrosshairTime(this.candles[this.hoverIndex].time), theme.labelBackground, theme.labelText);
    }
  }

  /** Tell the host about changes it cares about (only when they actually change). */
  private report(plot: ReturnType<CandleChart['plot']>, first: number, last: number): void {
    const visible = this.isLatestVisible();
    if (visible !== this.latestVisible) {
      this.latestVisible = visible;
      this.callbacks.onLatestVisibleChange?.(visible);
    }
    const key = this.candles.length > 0 && last >= first ? `${this.candles[first].time}-${this.candles[last].time}` : '';
    if (key !== this.rangeKey) {
      this.rangeKey = key;
      this.callbacks.onVisibleRangeChange?.(key ? { from: this.candles[first].time, to: this.candles[last].time } : null);
    }
    void plot;
  }
}
