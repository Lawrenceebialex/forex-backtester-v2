import {
  ColorType,
  CrosshairMode,
  LineStyle,
  type CandlestickSeriesPartialOptions,
  type ChartOptions,
  type DeepPartial,
} from 'lightweight-charts';
import type { CandleColors } from '@/domain/candleColors';
import { readCssColor } from './cssColor';

export const CHART_FONT = '"JetBrains Mono Variable", ui-monospace, SFMono-Regular, Menlo, monospace';

/** Chart chrome (background, grid, axes, crosshair) taken from the active theme's CSS variables. */
export function chartThemeOptions(): DeepPartial<ChartOptions> {
  const grid = readCssColor('--chart-grid');
  const crosshair = {
    color: readCssColor('--chart-crosshair'),
    labelBackgroundColor: readCssColor('--chart-label'),
    width: 1 as const,
    style: LineStyle.Dashed,
  };
  const border = readCssColor('--line');

  return {
    layout: {
      background: { type: ColorType.Solid, color: readCssColor('--chart-bg') },
      textColor: readCssColor('--chart-text'),
      fontFamily: CHART_FONT,
      fontSize: 11,
    },
    grid: { vertLines: { color: grid }, horzLines: { color: grid } },
    crosshair: { mode: CrosshairMode.Normal, vertLine: crosshair, horzLine: crosshair },
    rightPriceScale: { borderColor: border },
    timeScale: { borderColor: border },
  };
}

/** Maps the user's candle color settings onto the series. */
export function candleSeriesOptions(colors: CandleColors): CandlestickSeriesPartialOptions {
  return {
    upColor: colors.upBody,
    downColor: colors.downBody,
    wickUpColor: colors.upWick,
    wickDownColor: colors.downWick,
    borderUpColor: colors.upBorder,
    borderDownColor: colors.downBorder,
    borderVisible: true,
    wickVisible: true,
  };
}
