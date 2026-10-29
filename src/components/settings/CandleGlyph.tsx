import type { CandleColors } from '@/domain/candleColors';

/** Three stylised candles (up, down, up) painted with the given colors. */
const CANDLES = [
  { x: 10, wickTop: 6, wickBottom: 27, bodyTop: 11, bodyBottom: 22, up: true },
  { x: 24, wickTop: 3, wickBottom: 29, bodyTop: 8, bodyBottom: 23, up: false },
  { x: 38, wickTop: 8, wickBottom: 27, bodyTop: 12, bodyBottom: 21, up: true },
] as const;

export function CandleGlyph({ colors, className }: { colors: CandleColors; className?: string }) {
  return (
    <svg viewBox="0 0 48 32" className={className} aria-hidden>
      {CANDLES.map((candle) => {
        const wick = candle.up ? colors.upWick : colors.downWick;
        return (
          <g key={candle.x}>
            <line x1={candle.x} x2={candle.x} y1={candle.wickTop} y2={candle.wickBottom} stroke={wick} strokeWidth={1.6} strokeLinecap="round" />
            <rect
              x={candle.x - 4}
              y={candle.bodyTop}
              width={8}
              height={candle.bodyBottom - candle.bodyTop}
              rx={1.4}
              fill={candle.up ? colors.upBody : colors.downBody}
              stroke={candle.up ? colors.upBorder : colors.downBorder}
              strokeWidth={1.6}
            />
          </g>
        );
      })}
    </svg>
  );
}
