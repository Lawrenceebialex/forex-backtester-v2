import { create } from 'zustand';

/** Viewport at which the trading panel docks beside the chart (iPad landscape and up). */
export const DESKTOP_QUERY = '(min-width: 1024px)';

export type AppView = 'chart' | 'strategies' | 'performance' | 'comparison';

interface UiState {
  view: AppView;
  setView: (view: AppView) => void;

  tradingPanelOpen: boolean;
  toggleTradingPanel: () => void;
  setTradingPanelOpen: (open: boolean) => void;

  /** True while the user is choosing where to cut the chart (see ChartView). */
  cutMode: boolean;
  setCutMode: (active: boolean) => void;
}

export const useUiStore = create<UiState>()((set) => ({
  view: 'chart',
  setView: (view) => set({ view, cutMode: false }),

  // Docked and open on desktop / iPad landscape; closed (slide-over / bottom sheet) elsewhere.
  tradingPanelOpen: window.matchMedia(DESKTOP_QUERY).matches,
  toggleTradingPanel: () => set((state) => ({ tradingPanelOpen: !state.tradingPanelOpen })),
  setTradingPanelOpen: (tradingPanelOpen) => set({ tradingPanelOpen }),

  cutMode: false,
  setCutMode: (cutMode) => set({ cutMode }),
}));
