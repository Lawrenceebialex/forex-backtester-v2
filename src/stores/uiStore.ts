import { create } from 'zustand';

/** Viewport at which the trading panel docks beside the chart (iPad landscape and up). */
export const DESKTOP_QUERY = '(min-width: 1024px)';
/** Sidebar visible as a persistent column. */
export const SIDEBAR_QUERY = '(min-width: 1024px)';

/**
 * Primary product views (Part 3 IA).
 * `workspace` is the live chart backtesting session — not a top-level marketing page.
 */
export type AppView =
  | 'dashboard'
  | 'new-backtest'
  | 'backtests'
  | 'strategies'
  | 'analytics'
  | 'settings'
  | 'workspace'
  | 'comparison'
  | 'challenge';

export type SettingsTab = 'general' | 'chart' | 'trading' | 'challenge' | 'account';
export type Dialog = 'settings' | 'shortcuts' | null;

interface UiState {
  view: AppView;
  setView: (view: AppView) => void;

  /** Mobile/tablet: sidebar drawer open. */
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
  // Product home is Dashboard, not the chart terminal.
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
