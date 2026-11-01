import { create } from 'zustand';

/** Viewport at which the trading panel docks beside the chart (iPad landscape and up). */
export const DESKTOP_QUERY = '(min-width: 1024px)';

export type AppView = 'chart' | 'markets' | 'strategies' | 'performance' | 'comparison' | 'challenge';

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

  cutMode: boolean;
  setCutMode: (active: boolean) => void;
}

export const useUiStore = create<UiState>()((set) => ({
  view: 'chart',
  setView: (view) => set({ view, cutMode: false }),

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
