import { create } from 'zustand';

export type ChartTradeMode = null | 'limit-price' | 'stop-price' | 'sl' | 'tp';

interface ChartTradeState {
  /** When set, the next chart tap captures a price into the active field. */
  mode: ChartTradeMode;
  /** Optional position id when adjusting SL/TP on an open trade. */
  positionId: string | null;
  /** Last price tapped on the chart (OrderTicket reads this). */
  pickedPrice: number | null;
  setMode: (mode: ChartTradeMode, positionId?: string | null) => void;
  pick: (price: number) => void;
  clearPick: () => void;
}

export const useChartTradeStore = create<ChartTradeState>((set) => ({
  mode: null,
  positionId: null,
  pickedPrice: null,
  setMode: (mode, positionId = null) => set({ mode, positionId: mode ? positionId : null, pickedPrice: null }),
  pick: (price) => set({ pickedPrice: price }),
  clearPick: () => set({ pickedPrice: null, mode: null, positionId: null }),
}));
