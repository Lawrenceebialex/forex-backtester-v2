import { useState, type ReactNode } from 'react';
import { DEFAULT_RULES, type LimitRule, type LimitUnit, type RuleSet, type Rules } from '@/domain/propFirm';
import { Card } from '@/components/ui/Card';
import { NumberStepper } from '@/components/ui/NumberStepper';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Switch } from '@/components/ui/Switch';

const UNITS = [
  { value: 'percent', label: '%' },
  { value: 'amount', label: '$' },
] as const;

function Row({ title, hint, enabled, onToggle, children }: { title: string; hint: string; enabled: boolean; onToggle: (on: boolean) => void; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-raised/60 p-3.5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">{title}</p>
          <p className="text-xs text-ink-subtle">{hint}</p>
        </div>
        <Switch label={title} checked={enabled} onChange={onToggle} />
      </div>
      {enabled && children && <div className="mt-3 flex flex-wrap items-center gap-3">{children}</div>}
    </div>
  );
}

function LimitRow({ title, hint, rule, onChange }: { title: string; hint: string; rule: LimitRule; onChange: (rule: LimitRule) => void }) {
  const percent = rule.unit === 'percent';
  return (
    <Row title={title} hint={hint} enabled={rule.enabled} onToggle={(enabled) => onChange({ ...rule, enabled })}>
      <SegmentedControl<LimitUnit>
        label={`${title} unit`}
        options={UNITS}
        value={rule.unit}
        onChange={(unit) => onChange({ ...rule, unit, value: unit === 'percent' ? 5 : 500 })}
      />
      <NumberStepper
        label={`${title} value`}
        value={rule.value}
        min={percent ? 0.1 : 1}
        max={percent ? 100 : 10_000_000}
        step={percent ? 0.5 : 100}
        decimals={percent ? 1 : 0}
        onChange={(value) => onChange({ ...rule, value })}
        className="w-40"
      />
      <span className="text-xs text-ink-subtle">{percent ? 'of the starting balance' : 'in account currency'}</span>
    </Row>
  );
}

interface RuleSetEditorProps {
  initial: RuleSet | null;
  onSave: (name: string, rules: Rules) => void;
  onCancel: () => void;
}

/** Create or edit a saved rule set. Every rule can be switched off; nothing is required. */
export function RuleSetEditor({ initial, onSave, onCancel }: RuleSetEditorProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [rules, setRules] = useState<Rules>(() => JSON.parse(JSON.stringify(initial?.rules ?? DEFAULT_RULES)) as Rules);
  const patch = <K extends keyof Rules>(key: K, value: Rules[K]) => setRules((current) => ({ ...current, [key]: value }));

  return (
    <Card title={initial ? 'Edit rule set' : 'New rule set'}>
      <div className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-[11px] text-ink-subtle">Name</span>
          <input
            value={name}
            maxLength={50}
            placeholder="e.g. 100K two-step, phase 1"
            onChange={(event) => setName(event.target.value)}
            className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-subtle focus:border-accent coarse:h-11 coarse:text-base"
          />
        </label>

        <LimitRow title="Maximum daily loss" hint="Equity may not fall this far below where the day started (UTC)." rule={rules.dailyLoss} onChange={(rule) => patch('dailyLoss', rule)} />
        <LimitRow title="Maximum total loss" hint="Equity may not fall this far below the starting balance." rule={rules.totalLoss} onChange={(rule) => patch('totalLoss', rule)} />
        <LimitRow title="Trailing drawdown (optional)" hint="Equity may not fall this far below its highest point so far." rule={rules.trailingDrawdown} onChange={(rule) => patch('trailingDrawdown', rule)} />
        <LimitRow title="Profit target" hint="The challenge is passed when closed profit reaches this, with no rule broken." rule={rules.profitTarget} onChange={(rule) => patch('profitTarget', rule)} />

        <Row title="Maximum lot size" hint="No single trade may be larger than this." enabled={rules.maxLotSize.enabled} onToggle={(enabled) => patch('maxLotSize', { ...rules.maxLotSize, enabled })}>
          <NumberStepper label="Maximum lots" value={rules.maxLotSize.lots} min={0.01} max={100} step={0.5} decimals={2} className="w-40" onChange={(lots) => patch('maxLotSize', { ...rules.maxLotSize, lots })} />
          <span className="text-xs text-ink-subtle">lots</span>
        </Row>

        <Row title="Lot-size consistency" hint="Each trade must stay close to the average size of your previous trades (needs 3 earlier trades)." enabled={rules.lotConsistency.enabled} onToggle={(enabled) => patch('lotConsistency', { ...rules.lotConsistency, enabled })}>
          <NumberStepper label="Tolerance" value={rules.lotConsistency.tolerancePercent} min={5} max={500} step={5} decimals={0} className="w-40" onChange={(tolerancePercent) => patch('lotConsistency', { ...rules.lotConsistency, tolerancePercent })} />
          <span className="text-xs text-ink-subtle">% either side of the average</span>
        </Row>

        <Row title="Profit consistency" hint="No single trade may make up more than this share of your total profit (checked when the target is reached)." enabled={rules.profitConsistency.enabled} onToggle={(enabled) => patch('profitConsistency', { ...rules.profitConsistency, enabled })}>
          <NumberStepper label="Maximum share" value={rules.profitConsistency.maxSharePercent} min={10} max={100} step={5} decimals={0} className="w-40" onChange={(maxSharePercent) => patch('profitConsistency', { ...rules.profitConsistency, maxSharePercent })} />
          <span className="text-xs text-ink-subtle">% of total profit</span>
        </Row>

        <Row title="Block news trading" hint="Opening or manually closing a trade near a high-impact event breaks the rule." enabled={rules.newsTrading.blocked} onToggle={(blocked) => patch('newsTrading', { ...rules.newsTrading, blocked })}>
          <NumberStepper label="News window" value={rules.newsTrading.windowMinutes} min={1} max={60} step={1} decimals={0} className="w-40" onChange={(windowMinutes) => patch('newsTrading', { ...rules.newsTrading, windowMinutes })} />
          <span className="text-xs text-ink-subtle">minutes before and after</span>
        </Row>

        <Row title="Block weekend holding" hint="A position still open when the market closes for the weekend breaks the rule." enabled={rules.weekendHolding.blocked} onToggle={(blocked) => patch('weekendHolding', { blocked })} />

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={() => onSave(name, rules)} className="h-10 flex-1 rounded-lg bg-accent text-sm font-medium text-accent-ink transition hover:brightness-110 coarse:h-11">
            Save rule set
          </button>
          <button type="button" onClick={onCancel} className="h-10 flex-1 rounded-lg border border-line-strong text-sm text-ink-muted transition-colors hover:bg-overlay hover:text-ink coarse:h-11">
            Cancel
          </button>
        </div>
      </div>
    </Card>
  );
}
