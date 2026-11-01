import { useMemo, useState } from 'react';
import { Copy, Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import type { Challenge, RuleSet } from '@/domain/propFirm';
import { cn } from '@/lib/cn';
import { formatMoney } from '@/lib/format';
import { formatVirtualTime } from '@/lib/formatTime';
import { describeRules, computeGauges, type Gauge, type RuleSnapshot } from '@/lib/propRules';
import { usePlaybackStore } from '@/stores/playbackStore';
import { usePreferencesStore } from '@/stores/preferencesStore';
import { usePropStore } from '@/stores/propStore';
import { useTradingStore } from '@/stores/tradingStore';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Select } from '@/components/ui/Select';
import { ChallengeReportCard } from './ChallengeReport';
import { RuleSetEditor } from './RuleSetEditor';

const BUTTON = 'inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong px-3 text-[13px] text-ink-muted transition-colors hover:bg-overlay hover:text-ink coarse:h-11';
const PRIMARY = 'inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-accent-ink transition hover:brightness-110 disabled:opacity-40 coarse:h-11';

function GaugeBar({ gauge, kind }: { gauge: Gauge; kind: 'risk' | 'target' }) {
  const tone = kind === 'target' ? 'bg-bull' : gauge.fill >= 0.85 ? 'bg-bear' : gauge.fill >= 0.6 ? 'bg-warn' : 'bg-accent';
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-sm text-ink">{gauge.label}</span>
        <span className="font-mono text-xs tabular-nums text-ink-muted">
          {formatMoney(gauge.used)} <span className="text-ink-subtle">/ {formatMoney(gauge.limit)}</span>
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={gauge.label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(gauge.fill * 100)}
        className="h-2 overflow-hidden rounded-full bg-overlay"
      >
        <div className={cn('h-full rounded-full transition-[width] duration-300', tone)} style={{ width: `${gauge.fill * 100}%` }} />
      </div>
    </div>
  );
}

function RuleSetCard({ ruleSet, onEdit, onUse }: { ruleSet: RuleSet; onEdit: () => void; onUse: () => void }) {
  const duplicateRuleSet = usePropStore((state) => state.duplicateRuleSet);
  const deleteRuleSet = usePropStore((state) => state.deleteRuleSet);
  const [confirming, setConfirming] = useState(false);
  const summary = describeRules(ruleSet.rules, 10_000);

  return (
    <li className="rounded-xl border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 truncate text-base font-semibold text-ink">{ruleSet.name}</h3>
        <button type="button" onClick={onUse} className={cn(PRIMARY, 'h-9 shrink-0 px-3 text-[13px] coarse:h-11')}>
          Start challenge
        </button>
      </div>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {summary.map((line) => (
          <li key={line} className="rounded-md bg-overlay px-2 py-1 text-[11px] text-ink-muted">
            {line.replace(/\s*\(\$[\d,.]+\)/, '')}
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={onEdit} className={BUTTON}>
          <Pencil size={14} /> Edit
        </button>
        <button type="button" onClick={() => duplicateRuleSet(ruleSet.id)} className={BUTTON}>
          <Copy size={14} /> Duplicate
        </button>
        {confirming ? (
          <>
            <button type="button" onClick={() => deleteRuleSet(ruleSet.id)} className="inline-flex h-9 items-center rounded-lg bg-bear px-3 text-[13px] font-medium text-white coarse:h-11">
              Delete for good
            </button>
            <button type="button" onClick={() => setConfirming(false)} className={BUTTON}>
              Keep
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} className={BUTTON}>
            <Trash2 size={14} /> Delete
          </button>
        )}
      </div>
    </li>
  );
}

function ActiveChallenge({ challenge, snapshot }: { challenge: Challenge; snapshot: RuleSnapshot }) {
  const endChallenge = usePropStore((state) => state.endChallenge);
  const clearChallenge = usePropStore((state) => state.clearChallenge);
  const restartChallenge = usePropStore((state) => state.restartChallenge);
  const gauges = useMemo(() => computeGauges(challenge, snapshot), [challenge, snapshot]);
  const running = challenge.endedAt === null;

  const restart = () => {
    const account = useTradingStore.getState();
    restartChallenge({ time: usePlaybackStore.getState().currentTime, balance: account.balance, equity: account.equity, nextTradeNumber: account.nextNumber });
  };

  return (
    <Card
      title={challenge.ruleSetName}
      action={
        <div className="flex gap-2">
          {running ? (
            <button type="button" onClick={() => endChallenge(snapshot.time)} className={BUTTON}>
              End &amp; report
            </button>
          ) : (
            <button type="button" onClick={restart} className={BUTTON}>
              Run again
            </button>
          )}
          <button type="button" onClick={clearChallenge} className={BUTTON}>
            Clear
          </button>
        </div>
      }
    >
      <p className="mb-4 text-xs text-ink-subtle">
        Started {formatVirtualTime(challenge.startedAt)} UTC with {formatMoney(challenge.startingBalance)}.
        {running ? ' Monitoring every tick, order and close.' : ' Monitoring stopped.'}
      </p>
      {gauges.risk.length === 0 && !gauges.target ? (
        <p className="text-sm text-ink-muted">This rule set has no loss limits or profit target to track.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {gauges.risk.map((gauge) => (
            <GaugeBar key={gauge.label} gauge={gauge} kind="risk" />
          ))}
          {gauges.target && <GaugeBar gauge={gauges.target} kind="target" />}
        </div>
      )}
    </Card>
  );
}

export function ChallengeView() {
  const ruleSets = usePropStore((state) => state.ruleSets);
  const challenge = usePropStore((state) => state.challenge);
  const saveRuleSet = usePropStore((state) => state.saveRuleSet);
  const startChallenge = usePropStore((state) => state.startChallenge);

  const time = usePlaybackStore((state) => state.currentTime);
  const balance = useTradingStore((state) => state.balance);
  const equity = useTradingStore((state) => state.equity);
  const positions = useTradingStore((state) => state.positions);
  const closedTrades = useTradingStore((state) => state.closedTrades);
  const snapshot = useMemo<RuleSnapshot>(() => ({ time, balance, equity, positions, closedTrades }), [time, balance, equity, positions, closedTrades]);

  const [editing, setEditing] = useState<RuleSet | 'new' | null>(null);
  const [chosen, setChosen] = useState('');
  const preferred = usePreferencesStore((state) => state.defaultRuleSetId);
  const known = (id: string | null) => ruleSets.some((ruleSet) => ruleSet.id === id);
  const choice = known(chosen) ? chosen : known(preferred) ? (preferred as string) : (ruleSets[0]?.id ?? '');

  const start = (ruleSetId: string) => {
    const account = useTradingStore.getState();
    startChallenge(ruleSetId, { time: usePlaybackStore.getState().currentTime, balance: account.balance, equity: account.equity, nextTradeNumber: account.nextNumber });
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 p-3 md:space-y-5 md:p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">Challenge</h1>
        <p className="text-sm text-ink-muted">Trade under prop firm rules. Every rule is watched live, and each breach is recorded with the time and the numbers.</p>
      </div>

      {challenge ? (
        <ActiveChallenge challenge={challenge} snapshot={snapshot} />
      ) : (
        <Card title="Start a challenge">
          {ruleSets.length === 0 ? (
            <p className="text-sm text-ink-muted">Create a rule set below to begin.</p>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="block flex-1">
                <span className="mb-1 block text-[11px] text-ink-subtle">Rule set</span>
                <Select label="Rule set" value={choice} onChange={setChosen}>
                  {ruleSets.map((ruleSet) => (
                    <option key={ruleSet.id} value={ruleSet.id}>
                      {ruleSet.name}
                    </option>
                  ))}
                </Select>
              </label>
              <button type="button" onClick={() => start(choice)} className={PRIMARY}>
                <ShieldCheck size={16} /> Start with {formatMoney(balance)}
              </button>
            </div>
          )}
          <p className="mt-3 text-xs text-ink-subtle">The challenge counts trades from now on, measured against your current balance.</p>
        </Card>
      )}

      {challenge && <ChallengeReportCard challenge={challenge} snapshot={snapshot} />}

      {editing ? (
        <RuleSetEditor
          initial={editing === 'new' ? null : editing}
          onCancel={() => setEditing(null)}
          onSave={(name, rules) => {
            saveRuleSet({ id: editing === 'new' ? undefined : editing.id, name, rules });
            setEditing(null);
          }}
        />
      ) : (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-medium uppercase tracking-wider text-ink-subtle">Saved rule sets</h2>
            <button type="button" onClick={() => setEditing('new')} className={cn(PRIMARY, 'h-9 px-3 text-[13px] coarse:h-11')}>
              <Plus size={15} /> New rule set
            </button>
          </div>
          {ruleSets.length === 0 ? (
            <Card>
              <EmptyState icon={ShieldCheck} title="No rule sets yet">
                Build your own set of prop firm rules, then use it to run a challenge.
              </EmptyState>
            </Card>
          ) : (
            <ul className="space-y-3">
              {ruleSets.map((ruleSet) => (
                <RuleSetCard key={ruleSet.id} ruleSet={ruleSet} onEdit={() => setEditing(ruleSet)} onUse={() => start(ruleSet.id)} />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
