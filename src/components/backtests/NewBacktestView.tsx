import { useMemo, useState } from 'react';
import { ACTIVE_PAIR, type PairId } from '@/data/marketData';
import type { BacktestConfig } from '@/domain/backtest';
import { TIMEFRAMES, type Timeframe } from '@/domain/market';
import { BALANCE_LIMITS, LEVERAGE_OPTIONS } from '@/domain/trading';
import { cn } from '@/lib/cn';
import { useBacktestStore } from '@/stores/backtestStore';
import { useStrategyStore } from '@/stores/strategyStore';
import { useTradingStore } from '@/stores/tradingStore';
import { useUiStore } from '@/stores/uiStore';

const STEPS = ['Market', 'Account', 'Strategy', 'Review'] as const;

const INSTRUMENTS: { id: PairId; label: string; blurb: string }[] = [
  { id: 'EURUSD', label: 'EURUSD', blurb: 'Euro / US Dollar' },
  { id: 'USDJPY', label: 'USDJPY', blurb: 'US Dollar / Japanese Yen' },
];

export function NewBacktestView() {
  const setView = useUiStore((s) => s.setView);
  const createSession = useBacktestStore((s) => s.createSession);
  const draft = useBacktestStore((s) => s.draftConfig);
  const setDraft = useBacktestStore((s) => s.setDraft);
  const tradingSettings = useTradingStore((s) => s.settings);
  const resetAccount = useTradingStore((s) => s.resetAccount);
  const strategies = useStrategyStore((s) => s.strategies.filter((x) => !x.archived));
  const createStrategy = useStrategyStore((s) => s.createStrategy);
  const setActiveStrategy = useStrategyStore((s) => s.setActive);
  const activeId = useStrategyStore((s) => s.activeId);

  const [step, setStep] = useState(0);
  const [name, setName] = useState(draft?.name ?? `Backtest ${new Date().toLocaleDateString()}`);
  const [instrument, setInstrument] = useState<PairId>(draft?.instrument ?? ACTIVE_PAIR);
  const [timeframe, setTimeframe] = useState<Timeframe>(draft?.timeframe ?? '1H');
  const [balance, setBalance] = useState(draft?.initialBalance ?? tradingSettings.initialBalance);
  const [riskPct, setRiskPct] = useState(draft?.riskPerTradePercent ?? 1);
  const [leverage, setLeverage] = useState(draft?.leverage ?? tradingSettings.leverage);
  const [spread, setSpread] = useState(draft?.spreadPips ?? tradingSettings.spreadPips);
  const [commission, setCommission] = useState(draft?.commissionPerLot ?? 0);
  const [strategyId, setStrategyId] = useState(draft?.strategyId ?? activeId);
  const [newStrategyName, setNewStrategyName] = useState('');
  const [notes, setNotes] = useState('');

  const minutes = TIMEFRAMES.filter((t) => t.endsWith('m'));
  const hours = TIMEFRAMES.filter((t) => t.endsWith('H'));
  const daily = TIMEFRAMES.filter((t) => t === 'D');

  const config: BacktestConfig = useMemo(
    () => ({
      name: name.trim() || 'Untitled backtest',
      instrument,
      timeframe,
      rangeFrom: null,
      rangeTo: null,
      initialBalance: balance,
      currency: 'USD',
      riskPerTradePercent: riskPct,
      leverage,
      spreadPips: spread,
      commissionPerLot: commission,
      strategyId,
    }),
    [name, instrument, timeframe, balance, riskPct, leverage, spread, commission, strategyId],
  );

  const persistDraft = () => setDraft(config);

  const launch = () => {
    persistDraft();
    setActiveStrategy(strategyId);
    resetAccount({ initialBalance: balance, leverage });
    useTradingStore.getState().setSpreadPips(spread);
    createSession(config);
    setView('workspace');
  };

  const addStrategy = () => {
    const result = createStrategy(newStrategyName.trim() || 'New strategy');
    if (result.ok) {
      const id = useStrategyStore.getState().activeId;
      setStrategyId(id);
      setNewStrategyName('');
    }
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
          <div className="space-y-5">
            <label className="block">
              <span className="text-[11px] font-medium uppercase tracking-wide text-ink-subtle">Backtest name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-line bg-raised px-3 text-sm text-ink outline-none focus:border-accent"
              />
            </label>
            <div>
              <span className="text-[11px] font-medium uppercase tracking-wide text-ink-subtle">Instrument</span>
              <div className="mt-2 space-y-2">
                {INSTRUMENTS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setInstrument(item.id)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-md border px-3 py-2.5 text-left',
                      instrument === item.id ? 'border-accent bg-accent/10' : 'border-line',
                    )}
                  >
                    <span>
                      <span className="block text-sm font-semibold text-ink">{item.label}</span>
                      <span className="text-xs text-ink-muted">{item.blurb}</span>
                    </span>
                    <span className="text-[11px] text-ink-subtle">Available</span>
                  </button>
                ))}
                <div className="rounded-md border border-dashed border-line px-3 py-2.5 text-left opacity-70">
                  <span className="block text-sm font-medium text-ink-muted">XAUUSD</span>
                  <span className="text-xs text-ink-subtle">Gold — coming later</span>
                </div>
              </div>
            </div>
            <div>
              <span className="text-[11px] font-medium uppercase tracking-wide text-ink-subtle">Timeframe</span>
              <div className="mt-2 space-y-2">
                {[
                  { label: 'Minutes', list: minutes },
                  { label: 'Hours', list: hours },
                  { label: 'Daily', list: daily },
                ].map((group) =>
                  group.list.length ? (
                    <div key={group.label}>
                      <p className="mb-1 text-[10px] uppercase tracking-wide text-ink-subtle">{group.label}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {group.list.map((tf) => (
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
                  ) : null,
                )}
              </div>
              <p className="mt-2 text-xs text-ink-subtle">
                Historical range uses the full R2 dataset for this instrument. Partial date bounds arrive with session
                persistence upgrades.
              </p>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <label className="block">
              <span className="text-[11px] font-medium uppercase tracking-wide text-ink-subtle">Starting balance (USD)</span>
              <input
                type="number"
                min={BALANCE_LIMITS.min}
                max={BALANCE_LIMITS.max}
                step={BALANCE_LIMITS.step}
                value={balance}
                onChange={(e) => setBalance(Number(e.target.value) || BALANCE_LIMITS.min)}
                className="mt-1 h-10 w-full rounded-md border border-line bg-raised px-3 font-mono text-sm text-ink outline-none focus:border-accent"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-medium uppercase tracking-wide text-ink-subtle">Risk per trade (%)</span>
              <input
                type="number"
                min={0.1}
                max={10}
                step={0.1}
                value={riskPct}
                onChange={(e) => setRiskPct(Number(e.target.value) || 1)}
                className="mt-1 h-10 w-full rounded-md border border-line bg-raised px-3 font-mono text-sm text-ink outline-none focus:border-accent"
              />
              <span className="mt-1 block text-[11px] text-ink-subtle">
                The percentage of your account balance you are willing to risk on each trade.
              </span>
            </label>
            <div>
              <span className="text-[11px] font-medium uppercase tracking-wide text-ink-subtle">Leverage</span>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {LEVERAGE_OPTIONS.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setLeverage(v)}
                    className={cn(
                      'h-8 rounded-md border px-2.5 text-xs font-medium',
                      leverage === v ? 'border-accent bg-accent/10 text-ink' : 'border-line text-ink-muted',
                    )}
                  >
                    1:{v}
                  </button>
                ))}
              </div>
            </div>
            <label className="block">
              <span className="text-[11px] font-medium uppercase tracking-wide text-ink-subtle">Spread (pips)</span>
              <input
                type="number"
                min={0}
                max={20}
                step={0.1}
                value={spread}
                onChange={(e) => setSpread(Number(e.target.value) || 0)}
                className="mt-1 h-10 w-full rounded-md border border-line bg-raised px-3 font-mono text-sm text-ink outline-none focus:border-accent"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-medium uppercase tracking-wide text-ink-subtle">Commission per lot (USD)</span>
              <input
                type="number"
                min={0}
                step={0.5}
                value={commission}
                onChange={(e) => setCommission(Number(e.target.value) || 0)}
                className="mt-1 h-10 w-full rounded-md border border-line bg-raised px-3 font-mono text-sm text-ink outline-none focus:border-accent"
              />
            </label>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-ink-muted">
              Associate a discretionary methodology. You are not forced into rigid automation rules.
            </p>
            <div className="space-y-2">
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
            <div className="flex gap-2">
              <input
                value={newStrategyName}
                onChange={(e) => setNewStrategyName(e.target.value)}
                placeholder="New strategy name (e.g. ICT model)"
                className="h-9 flex-1 rounded-md border border-line bg-raised px-3 text-sm text-ink outline-none focus:border-accent"
              />
              <button type="button" onClick={addStrategy} className="h-9 rounded-md border border-line px-3 text-sm text-ink">
                Add
              </button>
            </div>
            <label className="block">
              <span className="text-[11px] font-medium uppercase tracking-wide text-ink-subtle">Notes (optional)</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Entry ideas, sessions, risk notes…"
                className="mt-1 w-full rounded-md border border-line bg-raised px-3 py-2 text-sm text-ink outline-none focus:border-accent"
              />
            </label>
          </div>
        )}

        {step === 3 && (
          <dl className="space-y-2 text-sm">
            {(
              [
                ['Name', config.name],
                ['Instrument', config.instrument],
                ['Timeframe', config.timeframe],
                ['Balance', `${config.initialBalance.toLocaleString()} ${config.currency}`],
                ['Risk / trade', `${config.riskPerTradePercent}%`],
                ['Leverage', `1:${config.leverage}`],
                ['Spread', `${config.spreadPips} pips`],
                ['Commission', `$${config.commissionPerLot}/lot`],
                ['Strategy', strategies.find((s) => s.id === strategyId)?.name ?? '—'],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-line/60 py-1.5">
                <dt className="text-ink-subtle">{k}</dt>
                <dd className="text-right font-medium text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      <div className="mt-4 flex justify-between gap-2">
        <button
          type="button"
          disabled={step === 0}
          onClick={() => {
            persistDraft();
            setStep((s) => Math.max(0, s - 1));
          }}
          className="h-9 rounded-md border border-line px-3 text-sm text-ink-muted disabled:opacity-40"
        >
          Back
        </button>
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => {
              persistDraft();
              setStep((s) => s + 1);
            }}
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
