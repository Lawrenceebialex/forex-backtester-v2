import { useState } from 'react';
import { ACTIVE_PAIR, type PairId } from '@/data/marketData';
import { TIMEFRAMES, type Timeframe } from '@/domain/market';
import { useUiStore } from '@/stores/uiStore';
import { useTradingStore } from '@/stores/tradingStore';
import { useStrategyStore } from '@/stores/strategyStore';
import { cn } from '@/lib/cn';

const STEPS = ['Market', 'Account', 'Strategy', 'Review'] as const;

export function NewBacktestView() {
  const setView = useUiStore((s) => s.setView);
  const [step, setStep] = useState(0);
  const [pair, setPair] = useState<PairId>(ACTIVE_PAIR);
  const [timeframe, setTimeframe] = useState<Timeframe>('1H');
  const balance = useTradingStore((s) => s.settings.initialBalance);
  const strategies = useStrategyStore((s) => s.strategies.filter((x) => !x.archived));
  const activeId = useStrategyStore((s) => s.activeId);
  const [strategyId, setStrategyId] = useState(activeId);

  const launch = () => {
    setView('workspace');
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 pb-24 lg:px-8">
      <h1 className="text-xl font-semibold tracking-tight text-ink">New Backtest</h1>
      <p className="mt-1 text-sm text-ink-muted">Configure the experiment before opening the chart workspace.</p>

      <ol className="mt-6 flex gap-2">
        {STEPS.map((label, i) => (
          <li
            key={label}
            className={cn(
              'flex-1 rounded-md border px-2 py-1.5 text-center text-[11px] font-medium',
              i === step ? 'border-accent bg-accent/10 text-ink' : 'border-line text-ink-subtle',
              i < step && 'border-line-strong text-ink-muted',
            )}
          >
            {i + 1}. {label}
          </li>
        ))}
      </ol>

      <div className="mt-6 rounded-lg border border-line bg-surface p-5">
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-medium uppercase tracking-wide text-ink-subtle">Instrument</label>
              <div className="mt-2 flex gap-2">
                {(['EURUSD', 'USDJPY'] as PairId[]).map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setPair(id)}
                    className={cn(
                      'h-9 rounded-md border px-3 text-sm font-medium',
                      pair === id ? 'border-accent bg-accent/10 text-ink' : 'border-line text-ink-muted',
                    )}
                  >
                    {id}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-ink-subtle">Only instruments with R2 history are listed. More markets later.</p>
            </div>
            <div>
              <label className="text-[11px] font-medium uppercase tracking-wide text-ink-subtle">Timeframe</label>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {TIMEFRAMES.map((tf) => (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => setTimeframe(tf)}
                    className={cn(
                      'h-8 rounded-md border px-2.5 text-xs font-medium',
                      timeframe === tf ? 'border-accent bg-accent/10 text-ink' : 'border-line text-ink-muted',
                    )}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3 text-sm text-ink-muted">
            <p>
              Starting balance is managed in Settings → Trading (currently{' '}
              <span className="font-mono tabular-nums text-ink">{balance.toLocaleString()} USD</span>).
            </p>
            <p>Spread, leverage and gradual-outcome training remain available in the workspace trade panel.</p>
            <button type="button" onClick={() => setView('settings')} className="text-sm font-medium text-accent hover:underline">
              Open account settings
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-2">
            <p className="text-sm text-ink-muted">Tag this session with an existing strategy methodology.</p>
            {strategies.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStrategyId(s.id)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm',
                  strategyId === s.id ? 'border-accent bg-accent/10' : 'border-line',
                )}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                <span className="font-medium text-ink">{s.name}</span>
              </button>
            ))}
          </div>
        )}

        {step === 3 && (
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-subtle">Instrument</dt>
              <dd className="font-medium text-ink">{pair}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-subtle">Timeframe</dt>
              <dd className="font-medium text-ink">{timeframe}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-subtle">Strategy</dt>
              <dd className="font-medium text-ink">{strategies.find((s) => s.id === strategyId)?.name ?? '—'}</dd>
            </div>
            <p className="pt-2 text-xs text-ink-subtle">
              Launch opens the existing replay workspace. Named session persistence is added in a later phase; trades still
              save on this device.
            </p>
          </dl>
        )}
      </div>

      <div className="mt-4 flex justify-between gap-2">
        <button
          type="button"
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          className="h-9 rounded-md border border-line px-3 text-sm text-ink-muted disabled:opacity-40"
        >
          Back
        </button>
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            className="h-9 rounded-md bg-accent px-4 text-sm font-medium text-accent-ink"
          >
            Continue
          </button>
        ) : (
          <button type="button" onClick={launch} className="h-9 rounded-md bg-accent px-4 text-sm font-medium text-accent-ink">
            Start backtest
          </button>
        )}
      </div>
    </div>
  );
}
