import { useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { cn } from '@/lib/cn';
import { niceTicks } from '@/lib/ticks';

export interface ChartSeries {
  id: string;
  label: string;
  /** Any CSS color, including `rgb(var(--accent))` so it follows the theme. */
  color: string;
  points: ReadonlyArray<{ x: number; y: number }>;
}

interface SeriesChartProps {
  series: readonly ChartSeries[];
  ariaLabel: string;
  yFormat: (value: number) => string;
  /** `span` is the width of the whole x range, so labels can pick a suitable precision. */
  xFormat: (x: number, span: number) => string;
  height?: number;
  /** Fill between each line and the baseline. */
  area?: boolean;
  /** A reference value (e.g. starting balance) drawn as a dashed line and included in the y range. */
  baseline?: number;
}

const MARGIN = { top: 10, right: 12, bottom: 24, left: 62 };

/** Value of a step series at x: the last point at or before x. */
function valueAt(points: ChartSeries['points'], x: number): number | null {
  let result: number | null = null;
  for (const point of points) {
    if (point.x > x) break;
    result = point.y;
  }
  return result;
}

/** Lightweight themed SVG chart for equity / drawdown curves (step lines, hover readout). */
export function SeriesChart({ series, ariaLabel, yFormat, xFormat, height = 220, area = false, baseline }: SeriesChartProps) {
  const gradientId = useId().replace(/:/g, '');
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hoverX, setHoverX] = useState<number | null>(null);

  useEffect(() => {
    const element = wrapRef.current;
    if (!element) return;
    setWidth(element.clientWidth);
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const all = series.flatMap((s) => s.points);
  if (all.length === 0) return null;

  const xMin = Math.min(...all.map((p) => p.x));
  let xMax = Math.max(...all.map((p) => p.x));
  if (xMax === xMin) xMax = xMin + 86_400;
  const span = xMax - xMin;

  const ys = all.map((p) => p.y);
  if (baseline !== undefined) ys.push(baseline);
  let yMin = Math.min(...ys);
  let yMax = Math.max(...ys);
  if (yMax === yMin) {
    yMin -= 1;
    yMax += 1;
  }
  const pad = (yMax - yMin) * 0.08;
  yMin -= pad;
  yMax += pad;

  const plotWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
  const plotHeight = height - MARGIN.top - MARGIN.bottom;
  const sx = (x: number) => MARGIN.left + ((x - xMin) / span) * plotWidth;
  const sy = (y: number) => MARGIN.top + ((yMax - y) / (yMax - yMin)) * plotHeight;
  const baseY = sy(baseline ?? yMin);
  const xEnd = sx(xMax);

  const stepPath = (points: ChartSeries['points']) => {
    const [first, ...rest] = points;
    return `M${sx(first.x)},${sy(first.y)}${rest.map((p) => `H${sx(p.x)}V${sy(p.y)}`).join('')}H${xEnd}`;
  };

  const yTicks = niceTicks(yMin, yMax, 4);
  const xTicks = [0, 1 / 3, 2 / 3, 1].map((fraction) => xMin + fraction * span);
  const readoutX = hoverX ?? xMax;

  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = event.clientX - rect.left;
    if (px < MARGIN.left || px > MARGIN.left + plotWidth) return setHoverX(null);
    setHoverX(xMin + ((px - MARGIN.left) / plotWidth) * span);
  };

  return (
    <div ref={wrapRef} className="w-full">
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs tabular-nums">
        <span className="text-ink-subtle">{xFormat(readoutX, span)}</span>
        {series.map((s) => {
          const value = valueAt(s.points, readoutX);
          return (
            <span key={s.id} className="flex items-center gap-1.5 text-ink">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="font-sans text-ink-muted">{s.label}</span>
              {value === null ? '—' : yFormat(value)}
            </span>
          );
        })}
      </div>

      {width > 0 && (
        <svg
          role="img"
          aria-label={ariaLabel}
          width={width}
          height={height}
          className={cn('block touch-pan-y select-none')}
          onPointerMove={onPointerMove}
          onPointerLeave={() => setHoverX(null)}
        >
          {area && (
            <defs>
              {series.map((s) => (
                <linearGradient key={s.id} id={`${gradientId}-${s.id}`} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" style={{ stopColor: s.color, stopOpacity: 0.28 }} />
                  <stop offset="100%" style={{ stopColor: s.color, stopOpacity: 0.02 }} />
                </linearGradient>
              ))}
            </defs>
          )}

          {yTicks.map((tick) => (
            <g key={tick}>
              <line x1={MARGIN.left} x2={MARGIN.left + plotWidth} y1={sy(tick)} y2={sy(tick)} className="stroke-line" strokeWidth={1} />
              <text x={MARGIN.left - 8} y={sy(tick)} textAnchor="end" dominantBaseline="middle" className="fill-ink-subtle font-mono text-[10px]">
                {yFormat(tick)}
              </text>
            </g>
          ))}
          {xTicks.map((tick, i) => (
            <text
              key={tick}
              x={sx(tick)}
              y={height - 6}
              textAnchor={i === 0 ? 'start' : i === xTicks.length - 1 ? 'end' : 'middle'}
              className="fill-ink-subtle font-mono text-[10px]"
            >
              {xFormat(tick, span)}
            </text>
          ))}

          {baseline !== undefined && (
            <line x1={MARGIN.left} x2={MARGIN.left + plotWidth} y1={sy(baseline)} y2={sy(baseline)} className="stroke-line-strong" strokeDasharray="4 4" />
          )}

          {series.map((s) => {
            if (s.points.length === 0) return null;
            const line = stepPath(s.points);
            return (
              <g key={s.id}>
                {area && <path d={`${line}V${baseY}H${sx(s.points[0].x)}Z`} fill={`url(#${gradientId}-${s.id})`} />}
                <path d={line} fill="none" strokeWidth={2} strokeLinejoin="round" style={{ stroke: s.color }} />
              </g>
            );
          })}

          {hoverX !== null && (
            <line x1={sx(hoverX)} x2={sx(hoverX)} y1={MARGIN.top} y2={MARGIN.top + plotHeight} className="stroke-ink-subtle" strokeDasharray="3 3" />
          )}
        </svg>
      )}
    </div>
  );
}
