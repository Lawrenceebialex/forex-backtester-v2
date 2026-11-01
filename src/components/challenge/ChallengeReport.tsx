import { Check, Download, Printer, X } from 'lucide-react';
import type { Challenge } from '@/domain/propFirm';
import { downloadText, printText } from '@/lib/exportReport';
import { cn } from '@/lib/cn';
import { formatMoney, formatSignedMoney, pnlTone } from '@/lib/format';
import { formatVirtualTime } from '@/lib/formatTime';
import { buildReport, reportToText, STATUS_LABEL } from '@/lib/propReport';
import type { RuleSnapshot } from '@/lib/propRules';
import { Card } from '@/components/ui/Card';

const STATUS_TONE = { active: 'bg-accent/15 text-accent', failed: 'bg-bear/15 text-bear', passed: 'bg-bull/15 text-bull', ended: 'bg-overlay text-ink-muted' } as const;

interface ChallengeReportProps {
  challenge: Challenge;
  snapshot: RuleSnapshot;
}

/** Every rule, whether it held, and for each breach: when it happened and the numbers. */
export function ChallengeReportCard({ challenge, snapshot }: ChallengeReportProps) {
  const report = buildReport(challenge, snapshot);
  const text = reportToText(report);
  const filename = `challenge-report-${challenge.ruleSetName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.txt`;

  return (
    <Card
      title="Report"
      action={
        <div className="flex gap-2">
          <button type="button" onClick={() => downloadText(filename, text)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line-strong px-2.5 text-xs text-ink-muted transition-colors hover:bg-overlay hover:text-ink coarse:h-10">
            <Download size={14} /> <span className="hidden sm:inline">Download</span>
          </button>
          <button type="button" onClick={() => printText('Challenge report', text)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line-strong px-2.5 text-xs text-ink-muted transition-colors hover:bg-overlay hover:text-ink coarse:h-10">
            <Printer size={14} /> <span className="hidden sm:inline">Print / PDF</span>
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className={cn('rounded-full px-3 py-1 text-xs font-semibold', STATUS_TONE[report.status])}>{STATUS_LABEL[report.status]}</span>
          <span className="text-sm text-ink-muted">{report.ruleSetName}</span>
        </div>

        <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ['Period', `${formatVirtualTime(report.startedAt)} → ${formatVirtualTime(report.until)}`],
            ['Starting balance', formatMoney(report.startingBalance)],
            ['Balance', formatMoney(report.balance)],
            ['Result', formatSignedMoney(report.profit)],
          ].map(([label, value], index) => (
            <div key={label} className={cn('min-w-0', index === 0 && 'col-span-2 md:col-span-1')}>
              <dt className="text-[11px] text-ink-subtle">{label}</dt>
              <dd className={cn('font-mono text-sm tabular-nums', label === 'Result' ? pnlTone(report.profit) : 'text-ink')}>{value}</dd>
            </div>
          ))}
        </dl>

        <section>
          <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-ink-subtle">Rules</h3>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {report.results.map((result) => {
              const broken = result.breaches > 0;
              return (
                <li key={result.rule} className="flex items-center gap-2 text-sm">
                  <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full', broken ? 'bg-bear/15 text-bear' : 'bg-bull/15 text-bull')}>
                    {broken ? <X size={12} /> : <Check size={12} />}
                  </span>
                  <span className="text-ink">{result.title}</span>
                  <span className="text-xs text-ink-subtle">{broken ? `broken ${result.breaches}×` : 'held'}</span>
                </li>
              );
            })}
          </ul>
        </section>

        <section>
          <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-ink-subtle">Breaches ({report.breaches.length})</h3>
          {report.breaches.length === 0 ? (
            <p className="text-sm text-ink-muted">None. Every rule has held so far.</p>
          ) : (
            <ol className="space-y-3">
              {report.breaches.map((breach, index) => (
                <li key={breach.key} className="rounded-xl border border-bear/30 bg-bear/5 p-3.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <p className="text-sm font-semibold text-ink">
                      {index + 1}. {breach.title}
                    </p>
                    <p className="font-mono text-xs tabular-nums text-ink-muted">{formatVirtualTime(breach.time)} UTC</p>
                  </div>
                  <p className="mt-1 text-sm text-ink-muted">{breach.summary}</p>
                  <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 md:grid-cols-4">
                    {breach.facts.map((fact) => (
                      <div key={fact.label} className="min-w-0">
                        <dt className="text-[11px] text-ink-subtle">{fact.label}</dt>
                        <dd className="truncate font-mono text-xs tabular-nums text-ink">{fact.value}</dd>
                      </div>
                    ))}
                  </dl>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </Card>
  );
}
