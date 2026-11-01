import { useState } from 'react';
import { BALANCE_LIMITS, GRADUAL_SECONDS_OPTIONS, LEVERAGE_OPTIONS, SPREAD_LIMITS } from '@/domain/trading';
import { formatMoney } from '@/lib/format';
import { usePlaybackStore } from '@/stores/playbackStore';
import { usePropStore } from '@/stores/propStore';
import { useTradingStore } from '@/stores/tradingStore';
import { NumberStepper } from '@/components/ui/NumberStepper';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Switch } from '@/components/ui/Switch';
import { PanelSection } from './PanelSection';

const LEVERAGE_CHOICES = LEVERAGE_OPTIONS.map((value) => ({ value, label: `1:${value}` }));

export function ExecutionSection() {
  const settings = useTradingStore((state) => state.settings);
  const quote = useTradingStore((state) => state.quote);
  const setSpreadPips = useTradingStore((state) => state.setSpreadPips);
  const setVariableSpread = useTradingStore((state) => state.setVariableSpread);

  return (
    <PanelSection title="Execution" badge={`now ${quote.spreadPips.toFixed(1)} pips`}>
      <div className="space-y-3.5">
        <div>
          <span className="mb-1 block text-[11px] text-ink-subtle">Spread (pips)</span>
          <NumberStepper
            label="Spread in pips"
            value={settings.spreadPips}
            min={SPREAD_LIMITS.min}
            max={SPREAD_LIMITS.max}
            step={SPREAD_LIMITS.step}
            decimals={1}
            onChange={setSpreadPips}
          />
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-ink">Variable spread</p>
            <p className="text-xs text-ink-subtle">Wider in Asian hours and at rollover, ±20% otherwise.</p>
          </div>
          <Switch label="Variable spread" checked={settings.variableSpread} onChange={setVariableSpread} />
        </div>
      </div>
    </PanelSection>
  );
}

export function AccountSection() {
  const settings = useTradingStore((state) => state.settings);
  const resetAccount = useTradingStore((state) => state.resetAccount);
  const [balance, setBalance] = useState(settings.initialBalance);
  const [leverage, setLeverage] = useState(settings.leverage);
  const [confirming, setConfirming] = useState(false);

  return (
    <PanelSection title="Account setup">
      <div className="space-y-3.5">
        <div>
          <span className="mb-1 block text-[11px] text-ink-subtle">Starting balance (USD)</span>
          <NumberStepper
            label="Starting balance"
            value={balance}
            min={BALANCE_LIMITS.min}
            max={BALANCE_LIMITS.max}
            step={BALANCE_LIMITS.step}
            decimals={0}
            onChange={(value) => {
              setBalance(value);
              setConfirming(false);
            }}
          />
        </div>
        <div>
          <span className="mb-1 block text-[11px] text-ink-subtle">Leverage</span>
          <div className="no-scrollbar overflow-x-auto">
            <SegmentedControl
              label="Leverage"
              options={LEVERAGE_CHOICES}
              value={leverage}
              onChange={(value) => {
                setLeverage(value);
                setConfirming(false);
              }}
            />
          </div>
        </div>

        {confirming ? (
          <div className="rounded-lg border border-bear/30 bg-bear/10 p-3">
            <p className="text-xs text-ink">
              This clears every open position, trade and statistic and starts again with {formatMoney(balance)} at 1:{leverage}. Strategies are kept.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  resetAccount({ initialBalance: balance, leverage });
                  // A running challenge restarts on the fresh account.
                  const account = useTradingStore.getState();
                  usePropStore.getState().restartChallenge({
                    time: usePlaybackStore.getState().currentTime,
                    balance: account.balance,
                    equity: account.equity,
                    nextTradeNumber: account.nextNumber,
                  });
                  setConfirming(false);
                }}
                className="h-9 flex-1 rounded-lg bg-bear text-[13px] font-medium text-white transition hover:brightness-110 coarse:h-11"
              >
                Reset account
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="h-9 flex-1 rounded-lg border border-line-strong text-[13px] text-ink-muted transition-colors hover:bg-overlay coarse:h-11"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="h-9 w-full rounded-lg border border-line-strong text-[13px] font-medium text-ink-muted transition-colors hover:bg-overlay hover:text-ink coarse:h-11"
          >
            Apply &amp; reset account…
          </button>
        )}
        <p className="text-xs text-ink-subtle">
          Moving through time — rewinding, jumping to a date or cutting the chart — never changes your account.
        </p>
      </div>
    </PanelSection>
  );
}

const SECONDS_CHOICES = GRADUAL_SECONDS_OPTIONS.map((value) => ({ value, label: `${value}s` }));

export function TrainingSection() {
  const settings = useTradingStore((state) => state.settings);
  const setGradualOutcome = useTradingStore((state) => state.setGradualOutcome);

  return (
    <PanelSection title="Patience training">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-ink">Gradual outcome</p>
            <p className="text-xs text-ink-subtle">P&amp;L and equity glide to their new values instead of jumping, so you sit with the result.</p>
          </div>
          <Switch label="Gradual outcome" checked={settings.gradualOutcome} onChange={(on) => setGradualOutcome(on)} />
        </div>
        {settings.gradualOutcome && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-ink-subtle">Takes about</span>
            <SegmentedControl
              label="Glide duration"
              options={SECONDS_CHOICES}
              value={settings.gradualSeconds}
              onChange={(seconds) => setGradualOutcome(true, seconds)}
            />
          </div>
        )}
      </div>
    </PanelSection>
  );
}
