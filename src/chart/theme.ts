import { readCssColor } from '@/lib/cssColor';

/** Colors the chart needs, resolved from the active theme's CSS variables. */
export interface ChartTheme {
  background: string;
  grid: string;
  text: string;
  border: string;
  crosshair: string;
  labelBackground: string;
  labelText: string;
  accent: string;
  watermark: string;
}

export function readChartTheme(): ChartTheme {
  return {
    background: readCssColor('--chart-bg'),
    grid: readCssColor('--chart-grid'),
    text: readCssColor('--chart-text'),
    border: readCssColor('--line'),
    crosshair: readCssColor('--chart-crosshair'),
    labelBackground: readCssColor('--chart-label'),
    labelText: '#ffffff',
    accent: readCssColor('--accent'),
    watermark: readCssColor('--ink', 0.045),
  };
}
