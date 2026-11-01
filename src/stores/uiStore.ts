import { create } from 'zustand';

/** Viewport at which the trading panel docks beside the chart (iPad landscape and up). */
export const DESKTOP_QUERY = '(min-width: 1024px)';

export type AppView = 'chart' | 'strategies' | 'performance' | 'comparison' | 'challenge';

export type SettingsTab = 'general' | 'chart' | 'trading' | 'challenge';
export type Dialog = 'settings' | 'shortcuts' | null;

interface UiState {
  view: AppView;
  setView: (view: AppView) => void;

  tradingPanelOpen: boolean;
  toggleTradingPanel: () => void;
  setTradingPanelOpen: (open: boolean) => void;

  dialog: Dialog;
  settingsTab: SettingsTab;
  openSettings: (tab?: SettingsTab) => void;
  openShortcuts: () => void;
  closeDialog: () => void;

  /** True while the user is choosing where to cut the chart (see ChartView). */
  cutMode: boolean;
  setCutMode: (active: boolean) => void;
}

export const useUiStore = create<UiState>()((set) => ({
  view: 'chart',
  setView: (view) => set({ view, cutMode: false }),

  // Docked and open on desktop / iPad landscape; closed (slide-over / bottom sheet) elsewhere.
  tradingPanelOpen: typeof window !== 'undefined' ? window.matchMedia(DESKTOP_QUERY).matches : false,
  toggleTradingPanel: () => set((state) => ({ tradingPanelOpen: !state.tradingPanelOpen })),
  setTradingPanelOpen: (tradingPanelOpen) => set({ tradingPanelOpen }),

  dialog: null,
  settingsTab: 'general',
  openSettings: (tab) => set((state) => ({ dialog: 'settings', settingsTab: tab ?? state.settingsTab })),
  openShortcuts: () => set({ dialog: 'shortcuts' }),
  closeDialog: () => set({ dialog: null }),

  cutMode: false,
  setCutMode: (cutMode) => set({ cutMode }),
}));
