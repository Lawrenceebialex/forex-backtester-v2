import { describe, expect, it } from 'vitest';
import type { Drawing } from '@/domain/drawings';
import { distanceToSegment, fibLevels, hitTest, measureStats, movedDrawing, rayEnd, type DrawingView } from './drawingLayer';

// A simple view: 1 second = 1px horizontally, price 1.0 = 1000px, origin at (0, 0) for time 0 / price 1.1.
const view: DrawingView = {
  x: (time) => time,
  y: (price) => (1.1 - price) * 1000,
  plot: { left: 0, top: 0, right: 600, bottom: 400 },
  pipSize: 0.0001,
  precision: 5,
  barsBetween: (from, to) => (to - from) / 60,
};
const make = (overrides: Partial<Drawing>): Drawing => ({ id: 'd', symbol: 'EURUSD', kind: 'trend', color: '#3d70f2', a: { time: 100, price: 1.08 }, ...overrides });

describe('drawing geometry', () => {
  it('measures distance to a segment', () => {
    expect(distanceToSegment(5, 5, 0, 0, 10, 0)).toBe(5);
    expect(distanceToSegment(-3, 0, 0, 0, 10, 0)).toBe(3); // beyond the end: distance to the end point
  });

  it('computes Fibonacci retracement levels from the end point back to the start', () => {
    const levels = fibLevels({ time: 0, price: 1.08 }, { time: 1, price: 1.09 });
    expect(levels[0]).toEqual({ ratio: 0, price: 1.09 });
    expect(levels[levels.length - 1].price).toBeCloseTo(1.08, 12);
    expect(levels.find((level) => level.ratio === 0.5)?.price).toBeCloseTo(1.085, 12);
    expect(levels.find((level) => level.ratio === 0.618)?.price).toBeCloseTo(1.08382, 12);
  });

  it('measures price, pips, percent, bars and time', () => {
    const stats = measureStats({ time: 0, price: 1.08 }, { time: 3600, price: 1.0864 }, 0.0001, 60);
    expect(stats.pips).toBeCloseTo(64, 9);
    expect(stats.percent).toBeCloseTo((0.0064 / 1.08) * 100, 9);
    expect(stats.seconds).toBe(3600);
    expect(stats.bars).toBe(60);
  });

  it('extends a ray beyond its second point in the same direction', () => {
    const end = rayEnd({ x: 0, y: 0 }, { x: 10, y: 5 }, view.plot);
    expect(end.x).toBeGreaterThan(600);
    expect(end.y / end.x).toBeCloseTo(0.5, 9);
  });
});

describe('hit testing and moving', () => {
  const trend = make({ kind: 'trend', a: { time: 100, price: 1.08 }, b: { time: 300, price: 1.07 } });

  it('finds handles before the body, and misses far away', () => {
    expect(hitTest(trend, view, 100, 20)).toBe('a'); // a is at (100, 20)
    expect(hitTest(trend, view, 300, 30)).toBe('b');
    expect(hitTest(trend, view, 200, 25)).toBe('body');
    expect(hitTest(trend, view, 200, 200)).toBeNull();
  });

  it('hits horizontal and vertical lines, rectangles and text', () => {
    expect(hitTest(make({ kind: 'hline' }), view, 450, 24)).toBe('body');
    expect(hitTest(make({ kind: 'hline' }), view, 450, 80)).toBeNull();
    expect(hitTest(make({ kind: 'vline' }), view, 103, 200)).toBe('body');
    const rect = make({ kind: 'rect', a: { time: 100, price: 1.08 }, b: { time: 300, price: 1.06 } });
    expect(hitTest(rect, view, 200, 30)).toBe('body');
    expect(hitTest(make({ kind: 'text', text: 'Support' }), view, 130, 20)).toBe('body');
  });

  it('moves handles, whole drawings, and keeps lines on their axis', () => {
    const grab = { time: 200, price: 1.075 };
    const now = { time: 260, price: 1.08 };
    const body = movedDrawing(trend, 'body', grab, now);
    expect(body.a.time).toBe(160);
    expect(body.a.price).toBeCloseTo(1.085, 9);
    expect(body.b?.time).toBe(360);
    expect(movedDrawing(trend, 'a', grab, now).a).toEqual(now);
    expect(movedDrawing(trend, 'b', grab, now).b).toEqual(now);
    const h = movedDrawing(make({ kind: 'hline' }), 'body', grab, now);
    expect(h.a.time).toBe(100);
    expect(h.a.price).toBeCloseTo(1.085, 12);
    const v = movedDrawing(make({ kind: 'vline' }), 'body', grab, now);
    expect(v.a.time).toBe(160);
    expect(v.a.price).toBe(1.08);
  });
});
