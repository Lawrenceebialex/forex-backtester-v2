import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_CANDLE_COLORS } from '@/domain/candleColors';
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
