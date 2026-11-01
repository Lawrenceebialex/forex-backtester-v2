import { create } from 'zustand';

export const DESKTOP_QUERY = '(min-width: 1024px)';
export const SIDEBAR_QUERY = '(min-width: 1024px)';

export type AppView =
  | 'dashboard'
  | 'new-backtest'
  | 'backtests'
  | 'strategies'
  | 'analytics'
  | 'journal'
  | 'settings'
  | 'workspace'
  | 'comparison'
  | 'challenge';

export type SettingsTab = 'general' | 'chart' | 'trading' | 'challenge' | 'account';
export type Dialog = 'settings' | 'shortcuts' | null;

interface UiState {
  view: AppView;
  setView: (view: AppView) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
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
  view: 'dashboard',
  setView: (view) => set({ view, cutMode: false, sidebarOpen: false }),
  sidebarOpen: false,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
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
