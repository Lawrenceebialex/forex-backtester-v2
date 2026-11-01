import { FIB_LEVELS, type ChartPoint, type Drawing } from '@/domain/drawings';
import type { UnixSeconds } from '@/domain/market';
import { formatDuration } from '@/lib/format';
import type { ChartTheme } from './theme';

/** What the drawing code needs to know about the chart's current view. */
export interface DrawingView {
  x: (time: UnixSeconds) => number;
  y: (price: number) => number;
  plot: { left: number; top: number; right: number; bottom: number };
  pipSize: number;
  precision: number;
  /** Candles between two times on the current timeframe. */
  barsBetween: (from: UnixSeconds, to: UnixSeconds) => number;
}

export interface Pt {
  x: number;
  y: number;
}

export type HitPart = 'a' | 'b' | 'body';

const FONT = '600 11px "JetBrains Mono Variable", ui-monospace, SFMono-Regular, Menlo, monospace';
const toScreen = (point: ChartPoint, view: DrawingView): Pt => ({ x: view.x(point.time), y: view.y(point.price) });

export function distanceToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** The point where a ray from `a` through `b` leaves the plot (clipping does the rest). */
export function rayEnd(a: Pt, b: Pt, plot: DrawingView['plot']): Pt {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) return b;
  const scale = (Math.hypot(plot.right - plot.left, plot.bottom - plot.top) * 2) / length;
  return { x: a.x + dx * scale, y: a.y + dy * scale };
}

/** Retracement levels: 0 at the end point, 1 at the start point. */
export function fibLevels(a: ChartPoint, b: ChartPoint): Array<{ ratio: number; price: number }> {
  return FIB_LEVELS.map((ratio) => ({ ratio, price: b.price - (b.price - a.price) * ratio }));
}

export function measureStats(a: ChartPoint, b: ChartPoint, pipSize: number, bars: number) {
  const priceDelta = b.price - a.price;
  return {
    priceDelta,
    pips: priceDelta / pipSize,
    percent: a.price !== 0 ? (priceDelta / a.price) * 100 : 0,
    seconds: Math.abs(b.time - a.time),
    bars: Math.abs(bars),
  };
}

/** Which part of the drawing is under the pointer, if any. Handles win over the body. */
export function hitTest(drawing: Drawing, view: DrawingView, px: number, py: number, tolerance = 9): HitPart | null {
  const a = toScreen(drawing.a, view);
  const b = drawing.b ? toScreen(drawing.b, view) : null;
  if (b) {
    if (Math.hypot(px - a.x, py - a.y) <= tolerance + 3) return 'a';
    if (Math.hypot(px - b.x, py - b.y) <= tolerance + 3) return 'b';
  }
  switch (drawing.kind) {
    case 'trend':
      return b && distanceToSegment(px, py, a.x, a.y, b.x, b.y) <= tolerance ? 'body' : null;
    case 'ray': {
      if (!b) return null;
      const end = rayEnd(a, b, view.plot);
      return distanceToSegment(px, py, a.x, a.y, end.x, end.y) <= tolerance ? 'body' : null;
    }
    case 'hline':
      return Math.abs(py - a.y) <= tolerance ? 'body' : null;
    case 'vline':
      return Math.abs(px - a.x) <= tolerance ? 'body' : null;
    case 'rect':
    case 'fib': {
      if (!b) return null;
      const inside =
        px >= Math.min(a.x, b.x) - tolerance && px <= Math.max(a.x, b.x) + tolerance &&
        py >= Math.min(a.y, b.y) - tolerance && py <= Math.max(a.y, b.y) + tolerance;
      return inside ? 'body' : null;
    }
    case 'text': {
      const width = (drawing.text?.length ?? 0) * 7 + 18;
      return px >= a.x - 4 && px <= a.x + width && py >= a.y - 13 && py <= a.y + 13 ? 'body' : null;
    }
  }
}

/** The drawing after dragging `part` from `grab` to `now` (both snapped chart points). */
export function movedDrawing(origin: Drawing, part: HitPart, grab: ChartPoint, now: ChartPoint): Drawing {
  const dt = now.time - grab.time;
  const dp = now.price - grab.price;
  if (origin.kind === 'hline') return { ...origin, a: { time: origin.a.time, price: origin.a.price + dp } };
  if (origin.kind === 'vline') return { ...origin, a: { time: origin.a.time + dt, price: origin.a.price } };
  if (part === 'a' && origin.b) return { ...origin, a: now };
  if (part === 'b' && origin.b) return { ...origin, b: now };
  const shift = (point: ChartPoint): ChartPoint => ({ time: point.time + dt, price: point.price + dp });
  return { ...origin, a: shift(origin.a), b: origin.b ? shift(origin.b) : undefined };
}

function pill(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, background: string, color: string, align: 'left' | 'center' | 'right' = 'left') {
  ctx.font = FONT;
  const width = ctx.measureText(text).width + 14;
  const left = align === 'left' ? x : align === 'center' ? x - width / 2 : x - width;
  ctx.fillStyle = background;
  ctx.beginPath();
  const r = 5;
  ctx.moveTo(left + r, y - 10);
  ctx.arcTo(left + width, y - 10, left + width, y + 10, r);
  ctx.arcTo(left + width, y + 10, left, y + 10, r);
  ctx.arcTo(left, y + 10, left, y - 10, r);
  ctx.arcTo(left, y - 10, left + width, y - 10, r);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, left + 7, y + 0.5);
}

function handle(ctx: CanvasRenderingContext2D, p: Pt, color: string, theme: ChartTheme) {
  ctx.fillStyle = theme.background;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

/** Draws one drawing. `selected` adds handles; `preview` draws it dashed and lighter while being placed. */
export function drawDrawing(ctx: CanvasRenderingContext2D, drawing: Drawing, view: DrawingView, theme: ChartTheme, options: { selected?: boolean; preview?: boolean } = {}): void {
  const { plot } = view;
  const a = toScreen(drawing.a, view);
  const b = drawing.b ? toScreen(drawing.b, view) : null;
  const color = drawing.color;
  const handles: Pt[] = [];

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.75;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (options.preview) ctx.setLineDash([6, 4]);

  switch (drawing.kind) {
    case 'trend':
    case 'ray': {
      if (!b) break;
      const end = drawing.kind === 'ray' ? rayEnd(a, b, plot) : b;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      handles.push(a, b);
      break;
    }
    case 'hline': {
      ctx.beginPath();
      ctx.moveTo(plot.left, a.y);
      ctx.lineTo(plot.right, a.y);
      ctx.stroke();
      ctx.setLineDash([]);
      pill(ctx, drawing.a.price.toFixed(view.precision), plot.right - 8, a.y - 14, color, '#ffffff', 'right');
      handles.push({ x: plot.left + 36, y: a.y });
      break;
    }
    case 'vline': {
      ctx.beginPath();
      ctx.moveTo(a.x, plot.top);
      ctx.lineTo(a.x, plot.bottom);
      ctx.stroke();
      handles.push({ x: a.x, y: plot.top + 72 });
      break;
    }
    case 'rect': {
      if (!b) break;
      const x = Math.min(a.x, b.x);
      const y = Math.min(a.y, b.y);
      ctx.globalAlpha = 0.14;
      ctx.fillRect(x, y, Math.abs(b.x - a.x), Math.abs(b.y - a.y));
      ctx.globalAlpha = 1;
      ctx.strokeRect(x, y, Math.abs(b.x - a.x), Math.abs(b.y - a.y));
      handles.push(a, b);
      break;
    }
    case 'fib': {
      if (!b || !drawing.b) break;
      const left = Math.min(a.x, b.x);
      const right = Math.max(a.x, b.x);
      const levels = fibLevels(drawing.a, drawing.b);
      ctx.lineWidth = 1;
      levels.forEach((level, i) => {
        const y = view.y(level.price);
        const next = levels[i + 1];
        if (next) {
          ctx.globalAlpha = i % 2 === 0 ? 0.1 : 0.05;
          ctx.fillRect(left, Math.min(y, view.y(next.price)), right - left, Math.abs(view.y(next.price) - y));
        }
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.moveTo(left, y);
        ctx.lineTo(right, y);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.font = FONT;
        ctx.fillStyle = color;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`${level.ratio} (${level.price.toFixed(view.precision)})`, left - 6, y + 4);
      });
      ctx.setLineDash([4, 4]);
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      handles.push(a, b);
      break;
    }
    case 'text': {
      pill(ctx, drawing.text ?? '', a.x, a.y, theme.background, color);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.strokeRect(a.x + 0.5, a.y - 9.5, ctx.measureText(drawing.text ?? '').width + 13, 19);
      handles.push(a);
      break;
    }
  }
  ctx.restore();

  if (options.selected) {
    ctx.save();
    handles.forEach((point) => handle(ctx, point, color, theme));
    ctx.restore();
  }
}

/** Measure tool: shaded box between two points with the price, pips, percent, bars and time spanned. */
export function drawMeasure(ctx: CanvasRenderingContext2D, a: ChartPoint, b: ChartPoint, view: DrawingView, theme: ChartTheme): void {
  const stats = measureStats(a, b, view.pipSize, view.barsBetween(a.time, b.time));
  const pa = toScreen(a, view);
  const pb = toScreen(b, view);
  const color = stats.priceDelta >= 0 ? theme.bull : theme.bear;
  const sign = stats.priceDelta >= 0 ? '+' : '';

  ctx.save();
  ctx.globalAlpha = 0.14;
  ctx.fillStyle = color;
  ctx.fillRect(Math.min(pa.x, pb.x), Math.min(pa.y, pb.y), Math.abs(pb.x - pa.x), Math.abs(pb.y - pa.y));
  ctx.globalAlpha = 1;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(pa.x, pa.y);
  ctx.lineTo(pb.x, pb.y);
  ctx.stroke();
  ctx.setLineDash([]);

  const lines = [
    `${sign}${stats.pips.toFixed(1)} pips · ${sign}${stats.priceDelta.toFixed(view.precision)}`,
    `${sign}${stats.percent.toFixed(2)}% · ${stats.bars} bars · ${formatDuration(stats.seconds)}`,
  ];
  ctx.font = FONT;
  const width = Math.max(...lines.map((line) => ctx.measureText(line).width)) + 16;
  const left = Math.min(Math.max(pb.x - width / 2, view.plot.left + 4), view.plot.right - width - 4);
  const below = pb.y >= pa.y;
  const top = Math.min(Math.max(below ? pb.y + 10 : pb.y - 50, 4), view.plot.bottom - 44);
  ctx.fillStyle = color;
  ctx.fillRect(left, top, width, 40);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  lines.forEach((line, i) => ctx.fillText(line, left + 8, top + 12 + i * 16));
  ctx.restore();
}
