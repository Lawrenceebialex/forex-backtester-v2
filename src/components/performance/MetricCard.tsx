import type { Statistics } from '@/domain/statistics';
import { TONE_CLASS, type MetricDef } from '@/lib/metrics';
import { cn } from '@/lib/cn';

interface MetricCardProps {
  metric: MetricDef;
  stats: Statistics;
  large?: boolean;
}

export function MetricCard({ metric, stats, large = false }: MetricCardProps) {
  const tone = metric.tone?.(stats) ?? 'neutral';
  return (
    <div className="rounded-xl border border-line bg-surface p-3.5" title={metric.hint}>
      <p className="text-[11px] font-medium uppercase tracking-wider text-ink-subtle">{metric.label}</p>
      <p className={cn('mt-1 font-mono font-semibold tabular-nums', large ? 'text-xl md:text-2xl' : 'text-base md:text-lg', TONE_CLASS[tone])}>
        {metric.format(stats)}
      </p>
      {large && <p className="mt-1 text-xs text-ink-subtle">{metric.hint}</p>}
    </div>
  );
}
