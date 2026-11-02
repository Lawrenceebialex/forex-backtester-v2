import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Persists chart viewport so leaving the workspace and returning
 * keeps the same time window and price-scale zoom.
 */
interface ChartViewState {
  /** Logical right-edge index (fractional) */
  rightEdge: number | null;
  barSpacing: number | null;
  /** Manual price scale; null = auto */
  priceMin: number | null;
  priceMax: number | null;
  autoPriceScale: boolean;
  setTimeView: (rightEdge: number, barSpacing: number) => void;
  setPriceScale: (min: number, max: number, auto: boolean) => void;
  clearPriceScale: () => void;
}

export const useChartViewStore = create<ChartViewState>()(
  persist(
    (set) => ({
      rightEdge: null,
      barSpacing: null,
      priceMin: null,
      priceMax: null,
      autoPriceScale: true,
      setTimeView: (rightEdge, barSpacing) => set({ rightEdge, barSpacing }),
      setPriceScale: (priceMin, priceMax, autoPriceScale) =>
        set({ priceMin, priceMax, autoPriceScale }),
      clearPriceScale: () =>
        set({ priceMin: null, priceMax: null, autoPriceScale: true }),
    }),
    { name: 'fb-chart-view' },
  ),
);
