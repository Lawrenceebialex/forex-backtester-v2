import type { UnixSeconds } from './market';

export type DrawingTool = 'cursor' | 'trend' | 'ray' | 'hline' | 'vline' | 'fib' | 'rect' | 'text' | 'measure' | 'eraser';

/** A spot on the chart in market terms, so it survives timeframe changes. */
export interface ChartPoint {
  time: UnixSeconds;
  price: number;
}

export type DrawingKind = 'trend' | 'ray' | 'hline' | 'vline' | 'fib' | 'rect' | 'text';

export interface Drawing {
  id: string;
  symbol: string;
  kind: DrawingKind;
  /** Any CSS color; the palette below reads well on both themes. */
  color: string;
  a: ChartPoint;
  /** Second anchor for trend, ray, fib and rect. */
  b?: ChartPoint;
  text?: string;
}

/** What the chart hands over when the user finishes drawing (the store adds id and symbol). */
export type NewDrawing = Omit<Drawing, 'id' | 'symbol'>;

export const DRAWING_COLORS = ['#3d70f2', '#10b981', '#f59e0b', '#ef4444', '#a855f7', '#94a3b8'] as const;
export const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1] as const;
export const TWO_POINT_KINDS: readonly DrawingKind[] = ['trend', 'ray', 'fib', 'rect'];

export const isDrawingKind = (value: unknown): value is DrawingKind =>
  value === 'trend' || value === 'ray' || value === 'hline' || value === 'vline' || value === 'fib' || value === 'rect' || value === 'text';
