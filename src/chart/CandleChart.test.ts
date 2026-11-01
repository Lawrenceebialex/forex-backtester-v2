import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_CANDLE_COLORS } from '@/domain/candleColors';
import type { Drawing, NewDrawing } from '@/domain/drawings';
import type { Candle } from '@/domain/market';
import { generateMockM1 } from '@/data/mockCandles';
import { CandleChart, type ChartCallbacks } from './CandleChart';
import type { ChartTheme } from './theme';
import { computeTimeTicks, formatCrosshairTime, pickTimeStep } from './timeAxis';

const WIDTH = 800;
const HEIGHT = 500;
const theme: ChartTheme = {
  background: 'rgb(9, 11, 16)', grid: 'rgb(24, 28, 39)', text: 'rgb(134, 143, 162)', border: 'rgb(35, 41, 56)',
  crosshair: 'rgb(118, 127, 148)', labelBackground: 'rgb(43, 50, 68)', labelText: '#ffffff', accent: 'rgb(61, 112, 242)', watermark: 'rgba(230, 234, 242, 0.05)',
  bull: 'rgb(34, 197, 140)', bear: 'rgb(244, 84, 96)',
};
const m1 = generateMockM1({ startTime: Date.UTC(2026, 7, 3) / 1000, tradingDays: 3, startPrice: 1.085, seed: 5 });

// A tiny stand-in for the browser: a recording 2D context, a canvas, animation frames and events.
const calls = { fillRect: 0, fillText: 0 };
let listeners: Record<string, Array<(event: unknown) => void>> = {};
let frames: Array<() => void> = [];

function installBrowser() {
  calls.fillRect = 0;
  calls.fillText = 0;
  listeners = {};
  frames = [];
  const ctx = new Proxy({}, {
    get: (_target, prop) => {
      if (prop === 'measureText') return (text: string) => ({ width: String(text).length * 6.5 });
      if (prop === 'fillRect') return () => { calls.fillRect++; };
      if (prop === 'fillText') return () => { calls.fillText++; };
      return () => undefined;
    },
    set: () => true,
  });
  const rect = () => ({ left: 0, top: 0, width: WIDTH, height: HEIGHT });
  const canvas = {
    style: {}, width: 0, height: 0, tabIndex: 0,
    getContext: () => ctx,
    setAttribute: () => undefined,
    addEventListener: (type: string, fn: (event: unknown) => void) => { (listeners[type] ??= []).push(fn); },
    removeEventListener: () => undefined,
    getBoundingClientRect: rect,
    setPointerCapture: () => undefined, releasePointerCapture: () => undefined, remove: () => undefined,
  };
  Object.assign(globalThis, {
    document: { createElement: () => canvas },
    requestAnimationFrame: (fn: () => void) => { frames.push(fn); return frames.length; },
    cancelAnimationFrame: () => undefined,
    ResizeObserver: class { observe() {} disconnect() {} },
    devicePixelRatio: 2,
  });
  return { appendChild: () => undefined, getBoundingClientRect: rect } as unknown as HTMLElement;
}

/** Runs queued animation frames until the chart settles. */
function settle() {
  for (let guard = 0; guard < 300 && frames.length > 0; guard++) frames.shift()!();
}
const fire = (type: string, event: Record<string, unknown>) =>
  listeners[type]?.forEach((fn) => fn({ preventDefault: () => undefined, pointerType: 'mouse', pointerId: 1, timeStamp: 0, ...event }));

function create(callbacks: ChartCallbacks = {}, candles: Candle[] = m1.slice(0, 600)) {
  const chart = new CandleChart(installBrowser(), { pricePrecision: 5, pipSize: 0.0001 }, theme, DEFAULT_CANDLE_COLORS, callbacks);
  chart.setTimeframe(60, 'EURUSD · 1m');
  chart.setData(candles.slice(), { reframe: true });
  settle();
  return chart;
}

describe('time axis', () => {
  it('chooses wider label spacing for tighter candles', () => {
    expect(pickTimeStep(8, 60)).toBe(900);
    expect(pickTimeStep(2, 60)).toBeGreaterThan(900);
    expect(pickTimeStep(8, 86_400)).toBe(1_209_600);
  });

  it('puts ticks on the first candle of each bucket and marks day changes', () => {
    const ticks = computeTimeTicks(m1, 0, 1500, 3600);
    expect(ticks.length).toBeGreaterThan(20);
    expect(ticks.filter((t) => t.major)).toHaveLength(1); // 00:00 of the second day
    expect(ticks.find((t) => !t.major)?.label).toMatch(/^\d\d:00$/);
  });

  it('formats the crosshair time in UTC', () => {
    expect(formatCrosshairTime(Date.UTC(2026, 7, 17, 9, 32) / 1000)).toBe("Mon 17 Aug '26  09:32");
  });
});

describe('CandleChart', () => {
  beforeEach(() => installBrowser());

  it('renders candles and frames the newest data', () => {
    const chart = create();
    const state = chart.getViewState();
    expect(calls.fillRect).toBeGreaterThan(100);
    expect(calls.fillText).toBeGreaterThan(5);
    expect(state.atLatest).toBe(true);
    expect(state.rightEdge).toBeCloseTo(599 + 8, 5);
    expect(state.priceMax).toBeGreaterThan(state.priceMin);
  });

  it('zooms around the pointer with the wheel and respects limits', () => {
    const chart = create();
    const before = chart.getViewState().barSpacing;
    fire('wheel', { deltaX: 0, deltaY: -240, deltaMode: 0, clientX: 400, clientY: 200 });
    expect(chart.getViewState().barSpacing).toBeGreaterThan(before);
    for (let i = 0; i < 80; i++) fire('wheel', { deltaX: 0, deltaY: 400, deltaMode: 0, clientX: 400, clientY: 200 });
    expect(chart.getViewState().barSpacing).toBeGreaterThanOrEqual(1);
    for (let i = 0; i < 200; i++) fire('wheel', { deltaX: 0, deltaY: -400, deltaMode: 0, clientX: 400, clientY: 200 });
    expect(chart.getViewState().barSpacing).toBeLessThanOrEqual(48);
    settle();
  });

  it('pans by dragging, reports leaving the live edge, and Home/End navigate', () => {
    let latestVisible = true;
    const chart = create({ onLatestVisibleChange: (visible) => { latestVisible = visible; } });
    fire('pointerdown', { clientX: 300, clientY: 200 });
    for (let x = 300; x <= 700; x += 50) fire('pointermove', { clientX: x, clientY: 200, timeStamp: x });
    fire('pointerup', { clientX: 700, clientY: 200, timeStamp: 2000 }); // slow release: no momentum
    settle();
    expect(chart.getViewState().rightEdge).toBeLessThan(599);
    expect(latestVisible).toBe(false);

    fire('keydown', { key: 'End' });
    settle();
    expect(latestVisible).toBe(true);
    fire('keydown', { key: 'Home' });
    expect(chart.getViewState().rightEdge).toBeLessThanOrEqual(5);
  });

  it('keeps gliding after a fast flick, then stops', () => {
    const chart = create();
    fire('pointerdown', { clientX: 200, clientY: 200, timeStamp: 0 });
    fire('pointermove', { clientX: 260, clientY: 200, timeStamp: 16 });
    fire('pointermove', { clientX: 340, clientY: 200, timeStamp: 32 });
    fire('pointerup', { clientX: 340, clientY: 200, timeStamp: 40 });
    const released = chart.getViewState().rightEdge;
    settle();
    expect(chart.getViewState().rightEdge).toBeLessThan(released);
  });

  it('pinch zooms with two fingers', () => {
    const chart = create();
    const before = chart.getViewState().barSpacing;
    fire('pointerdown', { pointerId: 1, pointerType: 'touch', clientX: 350, clientY: 200 });
    fire('pointerdown', { pointerId: 2, pointerType: 'touch', clientX: 450, clientY: 200 });
    fire('pointermove', { pointerId: 2, pointerType: 'touch', clientX: 650, clientY: 200 });
    expect(chart.getViewState().barSpacing).toBeGreaterThan(before * 1.5);
    fire('pointerup', { pointerId: 2, pointerType: 'touch', clientX: 650, clientY: 200 });
    fire('pointerup', { pointerId: 1, pointerType: 'touch', clientX: 350, clientY: 200 });
    settle();
  });

  it('snaps the crosshair to a candle and reports it', () => {
    const seen: Array<number | null> = [];
    create({ onHover: (candle) => seen.push(candle ? candle.time : null) });
    fire('pointermove', { clientX: 400, clientY: 250 });
    settle();
    expect(seen[0]).not.toBeNull();
    fire('pointerleave', {});
    expect(seen[seen.length - 1]).toBeNull();
  });

  it('follows the live edge on update() only while the newest candle is in view', () => {
    const candles = m1.slice(0, 600);
    const chart = create({}, candles);
    chart.update(m1[600]);
    expect(chart.getViewState().candleCount).toBe(601);
    expect(chart.getViewState().rightEdge).toBeCloseTo(600 + 8, 5);

    chart.update({ ...m1[600], close: m1[600].close + 0.0002 }); // same time: replaces, no shift
    expect(chart.getViewState().candleCount).toBe(601);

    chart.scrollToLatest();
    fire('keydown', { key: 'Home' });
    const away = chart.getViewState().rightEdge;
    chart.update(m1[601]);
    expect(chart.getViewState().rightEdge).toBe(away);
  });

  it('cut mode: hover previews, tap locks a candle, leaving cut mode clears it', () => {
    const cuts: Array<number | null> = [];
    const chart = create({ onCutChange: (candle) => cuts.push(candle ? candle.time : null) });
    chart.setCutMode(true);
    fire('pointermove', { clientX: 500, clientY: 200 });
    expect(cuts.filter((c) => c !== null)).toHaveLength(0); // preview alone does not lock
    fire('pointerdown', { clientX: 500, clientY: 200 });
    fire('pointerup', { clientX: 500, clientY: 200 });
    expect(cuts.filter((c) => c !== null)).toHaveLength(1);
    settle();
    chart.setCutMode(false);
    expect(cuts[cuts.length - 1]).toBeNull();
  });

  it('shows a news card on hover (mouse) or tap (touch) and hides it when the view moves', () => {
    const focus: Array<string[] | null> = [];
    const chart = create({ onNewsFocus: (f) => focus.push(f ? f.ids : null) });
    const { barSpacing, rightEdge } = chart.getViewState();
    const x = 732 - (rightEdge - 590) * barSpacing; // plot right edge is 800 − 68 axis px
    chart.setNewsMarkers([{ time: m1[590].time, label: 'NFP', color: 'rgb(244, 84, 96)', ids: ['nfp', 'ur'] }]);
    settle();

    fire('pointermove', { clientX: x, clientY: 18 }); // over the label
    expect(focus[focus.length - 1]).toEqual(['nfp', 'ur']);
    fire('pointermove', { clientX: x, clientY: 250 }); // down in the plot: not on the label
    expect(focus[focus.length - 1]).toBeNull();

    fire('pointerdown', { pointerType: 'touch', clientX: x, clientY: 18 });
    fire('pointerup', { pointerType: 'touch', clientX: x, clientY: 18 });
    expect(focus[focus.length - 1]).toEqual(['nfp', 'ur']);
    fire('wheel', { deltaX: 0, deltaY: -120, deltaMode: 0, clientX: 300, clientY: 200 }); // zooming moves the marker
    expect(focus[focus.length - 1]).toBeNull();

    chart.setNewsMarkers([]);
    settle();
  });

  it('draws position markers and price lines, and survives empty data and hiding', () => {
    const chart = create();
    chart.setOverlays({
      lines: [
        { price: m1[300].close, color: 'rgb(34, 197, 140)', title: 'BUY #1', dashed: false },
        { price: m1[300].close - 0.0004, color: 'rgb(244, 84, 96)', title: 'SL #1', dashed: true },
      ],
      markers: [{ time: m1[590].time, side: 'buy', text: 'BUY 0.10', color: 'rgb(34, 197, 140)' }],
    });
    settle();
    chart.setData([], { reframe: true });
    settle();
    chart.setData(m1.slice(0, 50), { reframe: true });
    settle();
    chart.destroy();
    expect(true).toBe(true);
  });
});

describe('drawing tools', () => {
  beforeEach(() => installBrowser());

  /** Screen position of a candle index / price in the 800×500 test chart (plot is 732 × 474). */
  const geometry = (chart: CandleChart) => {
    const state = chart.getViewState();
    return {
      x: (index: number) => 732 - (state.rightEdge - index) * state.barSpacing,
      y: (price: number) => ((state.priceMax - price) / (state.priceMax - state.priceMin)) * 474,
    };
  };
  const trend = (): Drawing => ({
    id: 'd1', symbol: 'EURUSD', kind: 'trend', color: '#3d70f2',
    a: { time: m1[500].time, price: m1[500].close }, b: { time: m1[560].time, price: m1[560].close },
  });
  const press = (x: number, y: number) => fire('pointerdown', { clientX: x, clientY: y });
  const release = (x: number, y: number) => fire('pointerup', { clientX: x, clientY: y });
  const move = (x: number, y: number) => fire('pointermove', { clientX: x, clientY: y });

  it('draws a trend line by dragging, snapped to candles', () => {
    const created: NewDrawing[] = [];
    const chart = create({ onDrawingCreate: (d) => created.push(d) });
    chart.setTool('trend');
    chart.setDrawingColor('#10b981');
    settle();
    const g = geometry(chart);
    press(g.x(500), g.y(m1[500].close));
    move(g.x(530), g.y(m1[530].close));
    move(g.x(560), g.y(m1[560].close));
    release(g.x(560), g.y(m1[560].close));
    settle();
    expect(created).toHaveLength(1);
    expect(created[0].kind).toBe('trend');
    expect(created[0].color).toBe('#10b981');
    expect(created[0].a.time).toBe(m1[500].time);
    expect(created[0].b?.time).toBe(m1[560].time);
  });

  it('also accepts two separate taps, and ignores a tap on the same spot twice', () => {
    const created: NewDrawing[] = [];
    const chart = create({ onDrawingCreate: (d) => created.push(d) });
    chart.setTool('rect');
    settle();
    const g = geometry(chart);
    press(g.x(480), 200);
    release(g.x(480), 200);
    expect(created).toHaveLength(0); // waiting for the second corner
    move(g.x(520), 260); // the preview follows the mouse
    press(g.x(540), 260);
    release(g.x(540), 260);
    expect(created.map((d) => d.kind)).toEqual(['rect']);
    expect(created[0].b?.time).toBe(m1[540].time);
  });

  it('places lines and text with one click', () => {
    const created: NewDrawing[] = [];
    const requests: number[] = [];
    const chart = create({ onDrawingCreate: (d) => created.push(d), onTextRequest: (r) => requests.push(r.point.time) });
    const g = geometry(chart);
    chart.setTool('hline');
    press(400, 220);
    release(400, 220);
    chart.setTool('vline');
    press(g.x(550), 220);
    release(g.x(550), 220);
    chart.setTool('text');
    press(g.x(560), 100);
    release(g.x(560), 100);
    expect(created.map((d) => d.kind)).toEqual(['hline', 'vline']);
    expect(created[1].a.time).toBe(m1[550].time);
    expect(requests).toEqual([m1[560].time]);
  });

  it('selects a drawing and drags it as a whole, saving once at the end', () => {
    const selected: Array<string | null> = [];
    const updated: Drawing[] = [];
    const chart = create({ onDrawingSelect: (id) => selected.push(id), onDrawingUpdate: (d) => updated.push(d) });
    chart.setDrawings([trend()]);
    settle();
    const g = geometry(chart);
    const mid = { x: g.x(530), y: g.y((m1[500].close + m1[560].close) / 2) };
    press(mid.x, mid.y);
    expect(selected).toEqual(['d1']);
    move(mid.x + 30, mid.y);
    move(mid.x + 60, mid.y);
    expect(updated).toHaveLength(0); // nothing saved while dragging
    release(mid.x + 60, mid.y);
    expect(updated).toHaveLength(1);
    expect(updated[0].a.time).toBeGreaterThan(m1[500].time);
    expect(updated[0].b!.time - updated[0].a.time).toBe(m1[560].time - m1[500].time); // shape unchanged

    press(400, 30); // empty space deselects (and pans)
    release(400, 30);
    expect(selected[selected.length - 1]).toBeNull();
  });

  it('erases the drawing that was clicked', () => {
    const erased: string[] = [];
    const chart = create({ onDrawingErase: (id) => erased.push(id) });
    chart.setDrawings([trend()]);
    chart.setTool('eraser');
    settle();
    const g = geometry(chart);
    const mid = { x: g.x(530), y: g.y((m1[500].close + m1[560].close) / 2) };
    press(g.x(100), 400);
    release(g.x(100), 400);
    expect(erased).toHaveLength(0); // clicking empty space erases nothing
    press(mid.x, mid.y);
    release(mid.x, mid.y);
    expect(erased).toEqual(['d1']);
  });

  it('measures without saving anything, and clears when the tool changes', () => {
    const created: NewDrawing[] = [];
    const chart = create({ onDrawingCreate: (d) => created.push(d) });
    chart.setTool('measure');
    settle();
    const g = geometry(chart);
    const before = calls.fillText;
    press(g.x(500), g.y(m1[500].close));
    move(g.x(560), g.y(m1[560].close) - 20);
    release(g.x(560), g.y(m1[560].close) - 20);
    settle();
    expect(created).toHaveLength(0);
    expect(calls.fillText).toBeGreaterThan(before + 2); // the measurement labels were drawn
    chart.setTool('cursor');
    settle();
    chart.destroy();
  });

  it('draws every kind of drawing without errors', () => {
    const chart = create();
    const base = { symbol: 'EURUSD', color: '#a855f7', a: { time: m1[500].time, price: m1[500].close }, b: { time: m1[560].time, price: m1[560].close + 0.0006 } };
    chart.setDrawings(['trend', 'ray', 'hline', 'vline', 'fib', 'rect', 'text'].map((kind, i) => ({ ...base, id: `k${i}`, kind: kind as Drawing['kind'], text: 'Support' })));
    settle();
    chart.setData(m1.slice(0, 40), { reframe: true }); // drawings far outside the data still draw
    settle();
    expect(true).toBe(true);
  });
});
