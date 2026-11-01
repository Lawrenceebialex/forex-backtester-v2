import { NEWS_EVENTS } from '@/data/newsEvents';
import type { NewsEvent } from '@/domain/news';
import { cn } from '@/lib/cn';
import { formatVirtualTime } from '@/lib/formatTime';

export function ImpactBadge({ impact }: { impact: NewsEvent['impact'] }) {
  return (
    <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide', impact === 'high' ? 'bg-bear/15 text-bear' : 'bg-warn/15 text-warn')}>
      {impact} impact
    </span>
  );
}

export function NewsEventDetails({ event, showActual = true }: { event: NewsEvent; showActual?: boolean }) {
  const values: Array<[string, string]> = [
    ...(showActual ? ([['Actual', event.actual]] as Array<[string, string]>) : []),
    ['Forecast', event.forecast],
    ['Previous', event.previous],
  ];
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <ImpactBadge impact={event.impact} />
        <span className="rounded bg-overlay px-1.5 py-0.5 text-[10px] font-semibold text-ink-muted">{event.currency}</span>
      </div>
      <p className="mt-1.5 text-sm font-semibold text-ink">{event.title}</p>
      <p className="font-mono text-xs tabular-nums text-ink-subtle">{formatVirtualTime(event.time)} UTC</p>
      <dl className="mt-2 grid grid-cols-3 gap-2">
        {values.map(([label, value]) => (
          <div key={label} className="rounded-lg bg-raised px-2 py-1.5">
            <dt className="text-[10px] text-ink-subtle">{label}</dt>
            <dd className={cn('font-mono text-sm font-semibold tabular-nums', label === 'Actual' ? 'text-ink' : 'text-ink-muted')}>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

const CARD_WIDTH = 300;

interface NewsCardProps {
  ids: string[];
  /** Anchor inside the chart, in pixels. */
  x: number;
  y: number;
  containerWidth: number;
}

/** Tooltip card over the chart for the hovered / tapped news marker. */
export function NewsCard({ ids, x, y, containerWidth }: NewsCardProps) {
  const events = NEWS_EVENTS.filter((event) => ids.includes(event.id));
  if (events.length === 0) return null;
  const width = Math.min(CARD_WIDTH, containerWidth - 16);
  const left = Math.min(Math.max(8, x - width / 2), Math.max(8, containerWidth - width - 8));

  return (
    <div
      role="tooltip"
      style={{ left, top: y + 10, width }}
      className="pointer-events-none absolute z-20 max-h-[70%] animate-pop-in space-y-3 overflow-hidden rounded-xl border border-line bg-surface p-3.5 shadow-overlay"
    >
      {events.map((event) => (
        <NewsEventDetails key={event.id} event={event} />
      ))}
    </div>
  );
}
