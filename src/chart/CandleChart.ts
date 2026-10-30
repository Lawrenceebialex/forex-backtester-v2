import type { CandleColors } from '@/domain/candleColors';
import type { Candle, TimeRange, UnixSeconds } from '@/domain/market';
import type { ChartTheme } from './theme';

export interface OverlayLine { price: number; color: string; title: string; dashed: boolean; }
export interface OverlayMarker { time: UnixSeconds; side: 'buy' | 'sell'; text: string; color: string; }
export interface ChartOverlays { lines: readonly OverlayLine[]; markers: readonly OverlayMarker[]; }
export interface ChartConfig { pricePrecision: number; pipSize: number; }
export interface ChartCallbacks {
  onHover?: (candle: Candle | null) => void;
  onCutChange?: (candle: Candle | null) => void;
  onLatestVisibleChange?: (visible: boolean) => void;
  onVisibleRangeChange?: (range: TimeRange | null) => void;
}

/** Temporary stub — re-upload full src/chart/CandleChart.ts from your custom-chart zip. */
export class CandleChart {
  constructor(
    private readonly container: HTMLElement,
    _config: ChartConfig,
    _theme: ChartTheme,
    _colors: CandleColors,
    _callbacks: ChartCallbacks = {},
  ) {
    const el = document.createElement('div');
    el.style.cssText =
      'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:14px system-ui;opacity:0.7;text-align:center;padding:1rem';
    el.textContent =
      'Chart engine needs restore. Upload src/chart/CandleChart.ts from your custom-chart zip into the repo.';
    this.container.style.position = 'relative';
    this.container.appendChild(el);
  }
  setTheme(_t: ChartTheme): void {}
  setCandleColors(_c: CandleColors): void {}
  setTimeframe(_s: number, _l: string): void {}
  setData(_c: Candle[], _o: { reframe: boolean }): void {}
  update(_c: Candle): void {}
  setOverlays(_o: ChartOverlays): void {}
  setCutMode(_a: boolean): void {}
  scrollToLatest(): void {}
  redraw(): void {}
  destroy(): void {
    this.container.replaceChildren();
  }
  getViewState() {
    return { barSpacing: 8, rightEdge: 0, candleCount: 0, priceMin: 0, priceMax: 1, atLatest: true };
  }
}
