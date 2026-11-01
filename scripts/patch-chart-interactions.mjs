/**
 * Build-time patch: TradingView-style price-axis zoom + crosshair magnet.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const file = join(root, 'src/chart/CandleChart.ts');
let text = readFileSync(file, 'utf8');

if (text.includes("kind: 'priceScale'")) {
  console.log('[patch-chart] already patched');
  process.exit(0);
}

const oldGesture = `type Gesture =
  | { kind: 'pan'; startX: number; startEdge: number; moved: boolean; samples: Array<{ x: number; t: number }> }
  | { kind: 'pinch'; startDistance: number; startSpacing: number; anchorIndex: number; anchorX: number }
  | { kind: 'draw'; start: ChartPoint; startPx: Point; moved: boolean; fromPending: boolean }
  | { kind: 'drag'; origin: Drawing; part: HitPart; grab: ChartPoint; startPx: Point; moved: boolean };`;

const newGesture = `type Gesture =
  | { kind: 'pan'; startX: number; startEdge: number; moved: boolean; samples: Array<{ x: number; t: number }> }
  | { kind: 'pinch'; startDistance: number; startSpacing: number; anchorIndex: number; anchorX: number }
  | { kind: 'priceScale'; startY: number; startMin: number; startMax: number; moved: boolean }
  | { kind: 'draw'; start: ChartPoint; startPx: Point; moved: boolean; fromPending: boolean }
  | { kind: 'drag'; origin: Drawing; part: HitPart; grab: ChartPoint; startPx: Point; moved: boolean };`;

if (!text.includes(oldGesture)) {
  console.error('[patch-chart] gesture type not found');
  process.exit(1);
}
text = text.replace(oldGesture, newGesture);

const oldDown = `    if (this.pointers.size === 1) {
      if (!this.beginDrawingGesture(point)) {
        this.gesture = { kind: 'pan', startX: point.x, startEdge: this.rightEdge, moved: false, samples: [{ x: point.x, t: event.timeStamp }] };
      }
    } else if (this.pointers.size === 2) {`;

const newDown = `    if (this.pointers.size === 1) {
      const plot = this.plot();
      if (point.x >= plot.right - 2) {
        this.snapScale = false;
        this.gesture = {
          kind: 'priceScale',
          startY: point.y,
          startMin: this.priceMin,
          startMax: this.priceMax,
          moved: false,
        };
        this.canvas.style.cursor = 'ns-resize';
      } else if (!this.beginDrawingGesture(point)) {
        this.gesture = { kind: 'pan', startX: point.x, startEdge: this.rightEdge, moved: false, samples: [{ x: point.x, t: event.timeStamp }] };
      }
    } else if (this.pointers.size === 2) {`;

if (!text.includes(oldDown)) {
  console.error('[patch-chart] pointerdown block not found');
  process.exit(1);
}
text = text.replace(oldDown, newDown);

const oldPan = `    if (gesture?.kind === 'pan' && this.pointers.has(event.pointerId)) {`;
const newPan = `    if (gesture?.kind === 'priceScale' && this.pointers.has(event.pointerId)) {
      const dy = point.y - gesture.startY;
      if (!gesture.moved && Math.abs(dy) > TAP_SLOP) {
        gesture.moved = true;
        this.clearNewsFocus();
        this.setHover(null);
      }
      if (gesture.moved) {
        const plot = this.plot();
        const mid = (gesture.startMin + gesture.startMax) / 2;
        const half = Math.max((gesture.startMax - gesture.startMin) / 2, 1e-8);
        const factor = Math.exp(dy / Math.max(80, plot.height * 0.35));
        const newHalf = Math.max(half * factor, half * 0.05);
        this.priceMin = mid - newHalf;
        this.priceMax = mid + newHalf;
        this.snapScale = false;
        this.requestDraw();
      }
      return;
    }

    if (gesture?.kind === 'pan' && this.pointers.has(event.pointerId)) {`;

if (!text.includes(oldPan)) {
  console.error('[patch-chart] pan move not found');
  process.exit(1);
}
text = text.replace(oldPan, newPan);

const oldCross = `  private drawCrosshairLines(plot: ReturnType<CandleChart['plot']>): void {
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
  }`;

const newCross = `  private drawCrosshairLines(plot: ReturnType<CandleChart['plot']>): void {
    if (!this.hover || this.hoverIndex < 0 || this.gesture?.kind === 'pinch' || this.gesture?.kind === 'priceScale' || this.cutMode) return;
    const { ctx } = this;
    const candle = this.candles[this.hoverIndex];
    if (!candle) return;
    const x = this.line(this.xOf(this.hoverIndex, plot.right), 1);
    const closeY = this.yOf(candle.close, plot.height);
    const magnet = Math.abs(this.hover.y - closeY) <= 8;
    const y = this.line(magnet ? closeY : this.hover.y, 1);
    ctx.save();
    ctx.strokeStyle = this.theme.crosshair;
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, plot.bottom);
    ctx.moveTo(0, y);
    ctx.lineTo(plot.right, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.fillStyle = this.theme.crosshair;
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }`;

if (text.includes(oldCross)) text = text.replace(oldCross, newCross);
else console.warn('[patch-chart] crosshair block not exact; price scale still applied');

writeFileSync(file, text);
console.log('[patch-chart] applied');
