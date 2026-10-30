import type { CandleColors } from '@/domain/candleColors';
import { readCssColor } from './cssColor';

export const CHART_FONT = '"JetBrains Mono Variable", ui-monospace, SFMono-Regular, Menlo, monospace';

/** Chart chrome colors from the active theme CSS variables (custom canvas chart). */
export function chartThemeColors() {
  return {
    background: readCssColor('--chart-bg'),
    text: readCssColor('--chart-text'),
    grid: readCssColor('--chart-grid'),
    crosshair: readCssColor('--chart-crosshair'),
    label: readCssColor('--chart-label'),
    border: readCssColor('--line'),
    fontFamily: CHART_FONT,
  };
}

/** Maps user candle color settings for the custom canvas series. */
export function candleSeriesColors(colors: CandleColors) {
  return {
    upBody: colors.upBody,
    downBody: colors.downBody,
    upWick: colors.upWick,
    downWick: colors.downWick,
    upBorder: colors.upBorder,
    downBorder: colors.downBorder,
  };
}
