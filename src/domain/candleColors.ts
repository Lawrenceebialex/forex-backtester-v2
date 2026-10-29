export type CandleColorKey =
  | 'upBody'
  | 'downBody'
  | 'upWick'
  | 'downWick'
  | 'upBorder'
  | 'downBorder';

export type CandleColors = Record<CandleColorKey, string>;

export const CANDLE_COLOR_KEYS: readonly CandleColorKey[] = [
  'upBody',
  'downBody',
  'upWick',
  'downWick',
  'upBorder',
  'downBorder',
];

export interface CandlePreset {
  id: string;
  name: string;
  hint?: string;
  colors: CandleColors;
}

/** Same colour for body, wick and border — the common case. */
function solid(up: string, down: string): CandleColors {
  return {
    upBody: up,
    downBody: down,
    upWick: up,
    downWick: down,
    upBorder: up,
    downBorder: down,
  };
}

// Presets are chosen to read well on both the dark and the light chart background.
export const CANDLE_PRESETS: readonly CandlePreset[] = [
  { id: 'classic', name: 'Classic', hint: 'Green / Red', colors: solid('#089981', '#f23645') },
  { id: 'blue-red', name: 'Blue / Red', colors: solid('#3b82f6', '#ef4444') },
  { id: 'blue-orange', name: 'Blue / Orange', hint: 'Color-blind safe', colors: solid('#3b82f6', '#f59e0b') },
  { id: 'emerald-rose', name: 'Emerald / Rose', colors: solid('#10b981', '#f43f5e') },
  {
    id: 'monochrome',
    name: 'Monochrome',
    colors: {
      upBody: '#f3f4f6',
      downBody: '#374151',
      upWick: '#6b7280',
      downWick: '#6b7280',
      upBorder: '#6b7280',
      downBorder: '#6b7280',
    },
  },
];

export const DEFAULT_CANDLE_COLORS: CandleColors = CANDLE_PRESETS[0].colors;

const HEX_6 = /^#[0-9a-f]{6}$/;
const HEX_3 = /^#[0-9a-f]{3}$/;

/** Returns a lowercase `#rrggbb` string, or null when the input is not a valid hex colour. */
export function normalizeHex(input: string): string | null {
  let value = input.trim().toLowerCase();
  if (!value.startsWith('#')) value = `#${value}`;
  if (HEX_6.test(value)) return value;
  if (HEX_3.test(value)) return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`;
  return null;
}

export function sameColors(a: CandleColors, b: CandleColors): boolean {
  return CANDLE_COLOR_KEYS.every((key) => a[key] === b[key]);
}

/** The preset the colors currently equal, or null when the user has customised them. */
export function matchPreset(colors: CandleColors): CandlePreset | null {
  return CANDLE_PRESETS.find((preset) => sameColors(preset.colors, colors)) ?? null;
}

/** Repairs persisted data: any missing or malformed entry falls back to the default. */
export function sanitizeColors(value: unknown): CandleColors {
  const source = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>;
  const result = { ...DEFAULT_CANDLE_COLORS };
  for (const key of CANDLE_COLOR_KEYS) {
    const raw = source[key];
    const hex = typeof raw === 'string' ? normalizeHex(raw) : null;
    if (hex) result[key] = hex;
  }
  return result;
}
