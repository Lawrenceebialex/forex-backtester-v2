import { TIMEFRAMES } from '@/domain/market';

export type ShortcutAction =
  | 'togglePlay' | 'stepForward' | 'stepBackward' | 'buy' | 'sell' | 'toggleTheme'
  | 'speedUp' | 'speedDown' | 'restart' | 'togglePanel' | 'toggleCut'
  | 'help' | 'settings' | 'escape' | 'deleteSelected'
  | `timeframe:${number}`;

export interface KeyEventLike {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
}

const SIMPLE: Record<string, ShortcutAction> = {
  ' ': 'togglePlay',
  ArrowRight: 'stepForward',
  ArrowLeft: 'stepBackward',
  b: 'buy',
  s: 'sell',
  t: 'toggleTheme',
  '[': 'speedDown',
  ']': 'speedUp',
  r: 'restart',
  p: 'togglePanel',
  c: 'toggleCut',
  '?': 'help',
  ',': 'settings',
  Escape: 'escape',
  Delete: 'deleteSelected',
  Backspace: 'deleteSelected',
};

/** Maps a key press to an app action, or null. Combinations with Ctrl / Cmd / Alt are left to the browser. */
export function resolveShortcut(event: KeyEventLike): ShortcutAction | null {
  if (event.ctrlKey || event.metaKey || event.altKey) return null;
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (/^[1-9]$/.test(key)) return Number(key) <= TIMEFRAMES.length ? `timeframe:${Number(key)}` : null;
  return SIMPLE[key] ?? null;
}

export interface ShortcutHelp {
  group: 'Replay' | 'Trading' | 'Chart' | 'App';
  keys: string[];
  label: string;
}

/** Shown in the shortcuts panel (keep in step with SIMPLE above). */
export const SHORTCUT_HELP: readonly ShortcutHelp[] = [
  { group: 'Replay', keys: ['Space'], label: 'Play / pause' },
  { group: 'Replay', keys: ['→'], label: 'Step forward one candle' },
  { group: 'Replay', keys: ['←'], label: 'Step back one candle' },
  { group: 'Replay', keys: ['[', ']'], label: 'Slower / faster' },
  { group: 'Replay', keys: ['R'], label: 'Back to session start' },
  { group: 'Trading', keys: ['B'], label: 'Quick buy (default lot size)' },
  { group: 'Trading', keys: ['S'], label: 'Quick sell (default lot size)' },
  { group: 'Trading', keys: ['P'], label: 'Show / hide the trading panel' },
  { group: 'Chart', keys: ['1', '…', '6'], label: 'Timeframe: 1m, 5m, 15m, 1H, 4H, D' },
  { group: 'Chart', keys: ['C'], label: 'Cut the chart here' },
  { group: 'Chart', keys: ['Esc'], label: 'Stop drawing / cancel the cut' },
  { group: 'Chart', keys: ['Del'], label: 'Delete the selected drawing' },
  { group: 'Chart', keys: ['Home', 'End'], label: 'Jump to the oldest / newest candle' },
  { group: 'Chart', keys: ['+', '−'], label: 'Zoom in / out (chart focused)' },
  { group: 'App', keys: ['T'], label: 'Switch Dark / Light theme' },
  { group: 'App', keys: [','], label: 'Open settings' },
  { group: 'App', keys: ['?'], label: 'Show this list' },
];
