import { useEffect } from 'react';
import { PLAYBACK_SPEEDS, TIMEFRAMES } from '@/domain/market';
import type { Side } from '@/domain/trading';
import { resolveShortcut, type ShortcutAction } from '@/lib/shortcuts';
import { useDrawingStore } from '@/stores/drawingStore';
import { usePlaybackStore } from '@/stores/playbackStore';
import { usePreferencesStore } from '@/stores/preferencesStore';
import { useThemeStore } from '@/stores/themeStore';
import { useToastStore } from '@/stores/toastStore';
import { useTradingStore } from '@/stores/tradingStore';
import { useUiStore } from '@/stores/uiStore';

/** Market order at the default lot size, no stops. */
function quickTrade(side: Side) {
  const result = useTradingStore.getState().placeOrder({ side, lots: usePreferencesStore.getState().defaultLots, stopLoss: null, takeProfit: null });
  if (!result.ok) useToastStore.getState().push({ tone: 'bear', title: 'Order rejected', description: result.error });
}

function shiftSpeed(direction: 1 | -1) {
  const { speed, setSpeed } = usePlaybackStore.getState();
  const next = PLAYBACK_SPEEDS[PLAYBACK_SPEEDS.indexOf(speed) + direction];
  if (next !== undefined) setSpeed(next);
}

/** Actions that only make sense while the chart is on screen. */
const CHART_ONLY = new Set<string>(['togglePlay', 'stepForward', 'stepBackward', 'buy', 'sell', 'speedUp', 'speedDown', 'restart', 'togglePanel', 'toggleCut', 'deleteSelected']);

function run(action: ShortcutAction): void {
  const playback = usePlaybackStore.getState();
  const ui = useUiStore.getState();
  const drawing = useDrawingStore.getState();

  if (action.startsWith('timeframe:')) return playback.setTimeframe(TIMEFRAMES[Number(action.split(':')[1]) - 1]);
  switch (action) {
    case 'togglePlay': return playback.togglePlay();
    case 'stepForward': return playback.stepForward();
    case 'stepBackward': return playback.stepBackward();
    case 'buy': return quickTrade('buy');
    case 'sell': return quickTrade('sell');
    case 'toggleTheme': return useThemeStore.getState().toggleTheme();
    case 'speedUp': return shiftSpeed(1);
    case 'speedDown': return shiftSpeed(-1);
    case 'restart': return playback.reset();
    case 'togglePanel': return ui.toggleTradingPanel();
    case 'toggleCut':
      playback.pause();
      return ui.setCutMode(!ui.cutMode);
    case 'help': return ui.openShortcuts();
    case 'settings': return ui.openSettings();
    case 'deleteSelected': return drawing.removeSelected();
    case 'escape':
      if (ui.cutMode) ui.setCutMode(false);
      else if (drawing.tool !== 'cursor') drawing.setTool('cursor');
      else drawing.select(null);
  }
}

/** Global keyboard shortcuts. Mount once at the app root. */
export function useShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const action = resolveShortcut(event);
      if (!action || event.defaultPrevented) return;

      const target = event.target as HTMLElement | null;
      if (target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return;
      if (event.key === ' ' && target?.closest('button, a, [role="switch"], [role="tab"], summary')) return; // Space activates focused controls
      if (document.querySelector('[aria-modal="true"]')) return; // a dialog is open: it owns the keyboard
      if (event.repeat && event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      if (useUiStore.getState().view !== 'chart' && (CHART_ONLY.has(action) || action.startsWith('timeframe:'))) return;

      event.preventDefault();
      run(action);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
