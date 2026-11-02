import { useMemo, useState } from 'react';
import { ACTIVE_PAIR, type PairId, M1_CANDLES } from '@/data/marketData';
import type { BacktestConfig } from '@/domain/backtest';
import { BALANCE_LIMITS, LEVERAGE_OPTIONS } from '@/domain/trading';
import { cn } from '@/lib/cn';
import type { SpreadMode } from '@/lib/spreadModel';
import { useBacktestStore } from '@/stores/backtestStore';
import { useStrategyStore } from '@/stores/strategyStore';
import { useTradingStore } from '@/stores/tradingStore';
import { useUiStore } from '@/stores/uiStore';
import { usePlaybackStore } from '@/stores/playbackStore';

type Mode = 'normal' | 'prop';
type Currency = 'USD' | 'NGN';

const INSTRUMENTS: { id: PairId; label: string }[] = [
  { id: 'EURUSD', label: 'EURUSD' },
  { id: 'USDJPY', label: 'USDJPY' },
];

export function NewBacktestView() {
  const setView = useUiStore((s) => s.setView);
  const createSession = useBacktestStore((s) => s.createSession);
  const resetAccount = useTradingStore((s) => s.resetAccount);
  const setSpreadPips = useTradingStore((s) => s.setSpreadPips);
  const setVariableSpread = useTradingStore((s) => s.setVariableSpread);
  const allStrategies = useStrategyStore((s) => s.strategies);
  const strategies = useMemo(() => allStrategies.filter((x) => !x.archived), [allStrategies]);
  const activeId = useStrategyStore((s) => s.activeId);
  const setActiveStrategy = useStrategyStore((s) => s.setActive);

  const [mode, setMode] = useState<Mode>('normal');
  const [name, setName] = useState(`Backtest ${new Date().toLocaleDateString()}`);
  const [instrument, setInstrument] = useState<PairId>(ACTIVE_PAIR);
  const [currency, setCurrency] = useState<Currency>('USD');
  const [balance, setBalance] = useState(10_000);
  const [leverage, setLeverage] = useState(100);
  const [spreadMode, setSpreadMode] = useState<SpreadMode>('simulated');
  const [fixedSpread, setFixedSpread] = useState(0.2);
  const [commissionOn, setCommissionOn] = useState(false);
  const [commission, setCommission] = useState(7);
  const [riskOn, setRiskOn] = useState(false);
  const [riskPct, setRiskPct] = useState(1);
  const [strategyId, setStrategyId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');

  const dataMin = M1_CANDLES[0] ? new Date(M1_CANDLES[0].time * 1000).toISOString().slice(0, 10) : '';
  const dataMax = M1_CANDLES.length
    ? new Date(M1_CANDLES[M1_CANDLES.length - 1].time * 1000).toISOString().slice(0, 10)
    : '';

  const launch = () => {
    const config: BacktestConfig = {
      name: name.trim() || 'Untitled',
      instrument,
      timeframe: '5m',
      rangeFrom: startDate || null,
      rangeTo: null,
      initialBalance: balance,
      currency,
      riskPerTradePercent: riskOn ? riskPct : 0,
      leverage,
      spreadPips: spreadMode === 'off' ? 0 : spreadMode === 'fixed' ? fixedSpread : 0.2,
      commissionPerLot: commissionOn ? commission : 0,
      strategyId: strategyId || activeId || '',
    };

    if (strategyId) setActiveStrategy(strategyId);
    resetAccount({ initialBalance: config.initialBalance, leverage });
    if (spreadMode === 'off') {
      setSpreadPips(0);
      setVariableSpread(false);
    } else if (spreadMode === 'fixed') {
      setSpreadPips(fixedSpread);
      setVariableSpread(false);
    } else {
      setSpreadPips(0.2);
      setVariableSpread(true);
    }

    createSession(config);

    if (startDate) {
      const t = Math.floor(Date.parse(`${startDate}T00:00:00Z`) / 1000);
      if (Number.isFinite(t)) {
        usePlaybackStore.getState().jumpTo(t);
        usePlaybackStore.getState().pause();
      }
    }

    setView('workspace');
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-6 pb-24 lg:px-8">
      <h1 className="text-xl font-semibold text-ink">New backtest</h1>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {([
          ['normal', 'Normal'],
          ['prop', 'Prop firm'],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            className={cn(
              'h-10 rounded-md border text-sm font-medium',
              mode === id ? 'border-accent bg-accent/10 text-ink' : 'border-line text-ink-muted',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-4 rounded-lg border border-line bg-surface p-4">
        <label className="block">
          <span className="text-[11px] font-medium uppercase text-ink-subtle">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-line bg-raised px-3 text-sm text-ink outline-none focus:border-accent"
          />
        </label>

        <div>
          <span className="text-[11px] font-medium uppercase text-ink-subtle">Pair</span>
          <div className="mt-2 flex gap-2">
            {INSTRUMENTS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setInstrument(item.id)}
                className={cn(
                  'h-9 flex-1 rounded-md border text-sm font-medium',
                  instrument === item.id ? 'border-accent bg-accent/10 text-ink' : 'border-line text-ink-muted',
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="text-[11px] font-medium uppercase text-ink-subtle">Start date</span>
          <input
            type="date"
            min={dataMin}
            max={dataMax}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-line bg-raised px-3 text-sm text-ink outline-none focus:border-accent"
          />
        </label>

        <div>
          <span className="text-[11px] font-medium uppercase text-ink-subtle">Currency</span>
          <div className="mt-2 flex gap-2">
            {(['USD', 'NGN'] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCurrency(c)}
                className={cn(
                  'h-9 flex-1 rounded-md border text-sm font-medium',
                  currency === c ? 'border-accent bg-accent/10 text-ink' : 'border-line text-ink-muted',
                )}
              >
                {c === 'USD' ? 'USD ($)' : 'NGN (₦)'}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="text-[11px] font-medium uppercase text-ink-subtle">Starting balance</span>
          <input
            type="number"
            min={currency === 'NGN' ? 50_000 : BALANCE_LIMITS.min}
            step={currency === 'NGN' ? 10_000 : 100}
            value={balance}
            onChange={(e) => setBalance(Number(e.target.value) || 0)}
            className="mt-1 h-10 w-full rounded-md border border-line bg-raised px-3 font-mono text-sm text-ink outline-none focus:border-accent"
          />
        </label>

        <div>
          <span className="text-[11px] font-medium uppercase text-ink-subtle">Leverage</span>
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

        <div>
          <span className="text-[11px] font-medium uppercase text-ink-subtle">Spread</span>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {(
              [
                ['off', 'Off'],
                ['fixed', 'Fixed'],
                ['simulated', 'Simulated'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setSpreadMode(id)}
                className={cn(
                  'h-9 rounded-md border text-xs font-medium',
                  spreadMode === id ? 'border-accent bg-accent/10 text-ink' : 'border-line text-ink-muted',
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {spreadMode === 'fixed' && (
            <input
              type="number"
              min={0}
              max={5}
              step={0.1}
              value={fixedSpread}
              onChange={(e) => setFixedSpread(Number(e.target.value) || 0)}
              className="mt-2 h-9 w-full rounded-md border border-line bg-raised px-3 font-mono text-sm text-ink"
              placeholder="Pips"
            />
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-ink">Commission</span>
          <button
            type="button"
            role="switch"
            aria-checked={commissionOn}
            onClick={() => setCommissionOn((v) => !v)}
            className={cn('h-7 w-12 rounded-full transition', commissionOn ? 'bg-accent' : 'bg-line')}
          >
            <span
              className={cn(
                'block h-6 w-6 translate-y-0.5 rounded-full bg-white transition',
                commissionOn ? 'translate-x-5' : 'translate-x-0.5',
              )}
            />
          </button>
        </div>
        {commissionOn && (
          <input
            type="number"
            min={0}
            step={0.5}
            value={commission}
            onChange={(e) => setCommission(Number(e.target.value) || 0)}
            className="h-9 w-full rounded-md border border-line bg-raised px-3 font-mono text-sm text-ink"
            placeholder="USD per lot"
          />
        )}

        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-ink">Risk % (lot sizing)</span>
          <button
            type="button"
            role="switch"
            aria-checked={riskOn}
            onClick={() => setRiskOn((v) => !v)}
            className={cn('h-7 w-12 rounded-full transition', riskOn ? 'bg-accent' : 'bg-line')}
          >
            <span
              className={cn(
                'block h-6 w-6 translate-y-0.5 rounded-full bg-white transition',
                riskOn ? 'translate-x-5' : 'translate-x-0.5',
              )}
            />
          </button>
        </div>
        {riskOn && (
          <input
            type="number"
            min={0.1}
            max={10}
            step={0.1}
            value={riskPct}
            onChange={(e) => setRiskPct(Number(e.target.value) || 1)}
            className="h-9 w-full rounded-md border border-line bg-raised px-3 font-mono text-sm text-ink"
          />
        )}

        <div>
          <span className="text-[11px] font-medium uppercase text-ink-subtle">Strategy (optional)</span>
          <div className="mt-2 space-y-1.5">
            <button
              type="button"
              onClick={() => setStrategyId(null)}
              className={cn(
                'flex w-full rounded-md border px-3 py-2 text-left text-sm',
                strategyId === null ? 'border-accent bg-accent/10' : 'border-line',
              )}
            >
              None
            </button>
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
                <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                {s.name}
              </button>
            ))}
          </div>
        </div>

        {mode === 'prop' && (
          <p className="rounded-md bg-overlay px-3 py-2 text-xs text-ink-muted">
            Prop rules apply after you start a challenge under Prop firm in the sidebar. Chart access does not require a challenge.
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={launch}
        className="mt-4 h-11 w-full rounded-md bg-accent text-sm font-medium text-accent-ink"
      >
        Open chart
      </button>
    </div>
  );
}
