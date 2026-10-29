import { SYMBOL } from '@/data/marketData';
import type { Candle, Timeframe } from '@/domain/market';

export type Ohlc = Pick<Candle, 'open' | 'high' | 'low' | 'close'>;

export function sameOhlc(a: Ohlc | null, b: Ohlc | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.open === b.open && a.high === b.high && a.low === b.low && a.close === b.close;
}

interface ChartLegendProps {
  ohlc: Ohlc;
  timeframe: Timeframe;
}

/** OHLC readout over the chart: the hovered candle, or the forming one when idle. */
export function ChartLegend({ ohlc, timeframe }: ChartLegendProps) {
  const pips = (ohlc.close - ohlc.open) / SYMBOL.pipSize;
  const tone = pips >= 0 ? 'text-bull' : 'text-bear';
  const values = [
    ['O', ohlc.open],
    ['H', ohlc.high],
    ['L', ohlc.low],
    ['C', ohlc.close],
  ] as const;

  return (
    <div className="pointer-events-none absolute left-2 top-2 z-10 flex max-w-[calc(100%-5.5rem)] flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-chart/80 px-2 py-1 font-mono text-[11px] tabular-nums md:left-3 md:text-xs">
      <span className="rounded bg-overlay px-1.5 py-0.5 font-sans text-[11px] font-semibold text-ink">
        {SYMBOL.symbol} · {timeframe}
      </span>
      {values.map(([label, value]) => (
        <span key={label}>
          <span className="mr-1 text-ink-subtle">{label}</span>
          <span className={tone}>{value.toFixed(SYMBOL.pricePrecision)}</span>
        </span>
      ))}
      <span className={tone}>
        {pips >= 0 ? '+' : ''}
        {pips.toFixed(1)} pips
      </span>
    </div>
  );
}
