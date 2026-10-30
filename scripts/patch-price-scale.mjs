import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const file = join(dirname(fileURLToPath(import.meta.url)), '../src/chart/CandleChart.ts');
let t = readFileSync(file, 'utf8');

if (t.includes("kind: 'priceScale'")) {
  console.log('[patch-price-scale] already applied');
  process.exit(0);
}

const steps = [];

function replaceOnce(label, old, neu) {
  if (!t.includes(old)) {
    console.error('[patch-price-scale] missing block:', label);
    process.exit(1);
  }
  t = t.replace(old, neu);
  steps.push(label);
}

replaceOnce(
  'gesture',
  `type Gesture =
  | { kind: 'pan'; startX: number; startEdge: number; moved: boolean; samples: Array<{ x: number; t: number }> }
  | { kind: 'pinch'; startDistance: number; startSpacing: number; anchorIndex: number; anchorX: number };`,
  `type Gesture =
  | { kind: 'pan'; startX: number; startEdge: number; moved: boolean; samples: Array<{ x: number; t: number }> }
  | { kind: 'pinch'; startDistance: number; startSpacing: number; anchorIndex: number; anchorX: number }
  | { kind: 'priceScale'; startY: number; startMin: number; startMax: number; moved: boolean };`,
);

replaceOnce('manualScale', '  private snapScale = true;\n', '  private snapScale = true;\n  private manualScale = false;\n');

replaceOnce(
  'pointerdown',
  `    this.inertiaActive = false;
    this.velocity = 0;

    if (this.pointers.size === 1) {
      this.gesture = { kind: 'pan', startX: point.x, startEdge: this.rightEdge, moved: false, samples: [{ x: point.x, t: event.timeStamp }] };
    } else if (this.pointers.size === 2) {`,
  `    this.inertiaActive = false;
    this.velocity = 0;

    const plot = this.plot();
    if (this.pointers.size === 1 && point.x > plot.right) {
      this.gesture = { kind: 'priceScale', startY: point.y, startMin: this.priceMin, startMax: this.priceMax, moved: false };
      this.canvas.style.cursor = 'ns-resize';
      return;
    }

    if (this.pointers.size === 1) {
      this.gesture = { kind: 'pan', startX: point.x, startEdge: this.rightEdge, moved: false, samples: [{ x: point.x, t: event.timeStamp }] };
    } else if (this.pointers.size === 2) {`,
);

replaceOnce(
  'pointermove',
  `    if (this.pointers.has(event.pointerId)) this.pointers.set(event.pointerId, point);

    if (gesture?.kind === 'pinch' && this.pointers.size >= 2) {`,
  `    if (this.pointers.has(event.pointerId)) this.pointers.set(event.pointerId, point);

    if (gesture?.kind === 'priceScale' && this.pointers.has(event.pointerId)) {
      const dy = point.y - gesture.startY;
      if (!gesture.moved && Math.abs(dy) > TAP_SLOP) gesture.moved = true;
      if (gesture.moved) {
        const mid = (gesture.startMin + gesture.startMax) / 2;
        const half = (gesture.startMax - gesture.startMin) / 2;
        const newHalf = Math.max(this.config.pipSize * 2, half * Math.exp(dy * 0.004));
        this.priceMin = mid - newHalf;
        this.priceMax = mid + newHalf;
        this.manualScale = true;
        this.requestDraw();
      }
      return;
    }

    if (gesture?.kind === 'pinch' && this.pointers.size >= 2) {`,
);

replaceOnce(
  'pointerup',
  `    if (gesture?.kind === 'pan') {
      this.gesture = null;
      if (!gesture.moved) {
        this.onTap(point, event.pointerType);
      } else {`,
  `    if (gesture?.kind === 'priceScale') {
      this.gesture = null;
      this.canvas.style.cursor = 'crosshair';
      return;
    }

    if (gesture?.kind === 'pan') {
      this.gesture = null;
      if (!gesture.moved) {
        this.onTap(point, event.pointerType);
      } else {`,
);

replaceOnce(
  'dblclick',
  `  private readonly onDoubleClick = () => {
    if (this.cutMode) return;
    this.frameView();
    this.requestDraw();
  };`,
  `  private readonly onDoubleClick = (event: MouseEvent) => {
    if (this.cutMode) return;
    const point = this.localPoint(event);
    if (point.x > this.plot().right) {
      this.manualScale = false;
      this.snapScale = true;
      this.requestDraw();
      return;
    }
    this.frameView();
    this.manualScale = false;
    this.requestDraw();
  };`,
);

replaceOnce(
  'stepScale',
  `  private stepScale(first: number, last: number): boolean {
    let low = Infinity;
    let high = -Infinity;`,
  `  private stepScale(first: number, last: number): boolean {
    if (this.manualScale) return false;
    let low = Infinity;
    let high = -Infinity;`,
);

replaceOnce(
  'hover',
  `    if (event.pointerType === 'mouse') this.setHover(point);
  };`,
  `    if (event.pointerType === 'mouse') {
      const plot = this.plot();
      this.canvas.style.cursor = point.x > plot.right ? 'ns-resize' : 'crosshair';
      this.setHover(point.x > plot.right ? null : point);
    }
  };`,
);

replaceOnce(
  'frameView',
  `    this.velocity = 0;
    this.snapScale = true;
    this.clampEdge();
  }`,
  `    this.velocity = 0;
    this.snapScale = true;
    this.manualScale = false;
    this.clampEdge();
  }`,
);

writeFileSync(file, t);
console.log('[patch-price-scale] applied:', steps.join(', '));
