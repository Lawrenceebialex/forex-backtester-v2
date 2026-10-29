import { create } from 'zustand';

/** Viewport at which the trading panel docks beside the chart (iPad landscape and up). */
export const DESKTOP_QUERY = '(min-width: 1024px)';

interface UiState {
  tradingPanelOpen: boolean;
  toggleTradingPanel: () => void;
  setTradingPanelOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>()((set) => ({
  // Docked and open on desktop / iPad landscape; closed (slide-over / bottom sheet) elsewhere.
  tradingPanelOpen: window.matchMedia(DESKTOP_QUERY).matches,
  toggleTradingPanel: () => set((state) => ({ tradingPanelOpen: !state.tradingPanelOpen })),
  setTradingPanelOpen: (tradingPanelOpen) => set({ tradingPanelOpen }),
}));
