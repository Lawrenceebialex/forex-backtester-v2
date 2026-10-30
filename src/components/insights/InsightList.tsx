import { Lightbulb } from 'lucide-react';
import { ADVICE_DISCLAIMER, INSIGHT_LABEL, type Insight, type InsightTone } from '@/lib/advice';
import { cn } from '@/lib/cn';
import { Card } from '@/components/ui/Card';

const TONE: Record<InsightTone, { accent: string; badge: string }> = {
  caution: { accent: 'border-l-warn', badge: 'bg-warn/15 text-warn' },
  positive: { accent: 'border-l-bull', badge: 'bg-bull/15 text-bull' },
  neutral: { accent: 'border-l-line-strong', badge: 'bg-overlay text-ink-muted' },
};

export function InsightList({ insights }: { insights: readonly Insight[] }) {
  if (insights.length === 0) return null;
  return (
    <Card title="What the numbers suggest">
      <ul className="space-y-3">
        {insights.map((insight) => (
          <li key={insight.id} className={cn('rounded-lg border border-line border-l-4 bg-raised/60 p-3.5', TONE[insight.tone].accent)}>
            <span className={cn('mb-2 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider', TONE[insight.tone].badge)}>
              <Lightbulb size={11} aria-hidden />
              {INSIGHT_LABEL}
            </span>
            <h3 className="text-sm font-semibold text-ink">{insight.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">{insight.body}</p>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-ink-subtle">{ADVICE_DISCLAIMER}</p>
    </Card>
  );
}
