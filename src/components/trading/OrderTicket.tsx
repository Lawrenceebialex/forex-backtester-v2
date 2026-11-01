import { useEffect, useState } from 'react';
import { SYMBOL } from '@/data/marketData';
import { LOT_LIMITS, type Side, type StopInput, type StopUnit } from '@/domain/trading';
import { cn } from '@/lib/cn';
import { formatMoney } from '@/lib/format';
import { marginFor, pipValue } from '@/lib/trading';
import { usePreferencesStore } from '@/stores/preferencesStore';
import { useStrategyStore } from '@/stores/strategyStore';
import { useTradingStore } from '@/stores/tradingStore';
import { NumberStepper } from '@/components/ui/NumberStepper';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Select } from '@/components/ui/Select';
import { PanelSection } from './PanelSection';
import { PriceDigits } from './PriceDigits';

const LOT_PRESETS = [0.01, 0.05, 0.1, 0.5, 1] as const;
const UNIT_OPTIONS = [
  { value: 'pips', label: 'Pips' },
  { value: 'price', label: 'Price' },
] as const;

/** "" → no stop; a valid number → a stop; anything else → undefined (invalid). */
function parseStop(text: string, unit: StopUnit): StopInput | null | undefined {
  if (text.trim() === '') return null;
  const value = Number(text.replace(',', '.'));
  if (!Number.isFinite(value) || value <= 0) return undefined;
  return { unit, value };
}

function TradeButton({ side, price, onClick }: { side: Side; price: number; onClick: () => void }) {
  const isBuy = side === 'buy';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${isBuy ? 'Buy' : 'Sell'} at ${price.toFixed(SYMBOL.pricePrecision)}`}
      className={cn(
        'flex h-16 flex-col items-center justify-center gap-1 rounded-xl text-white shadow-sm transition',
        'hover:brightness-110 active:scale-[0.98] coarse:h-[4.5rem]',
        isBuy ? 'bg-bull' : 'bg-bear',
      )}
    >
      <span className="text-[11px] font-semibold uppercase tracking-wider opacity-90">{isBuy ? 'Buy' : 'Sell'}</span>
      <PriceDigits price={price} />
    </button>
  );
}

interface StopFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint: string;
}

function StopField({ label, value, onChange, hint }: StopFieldProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] text-ink-subtle">{label}</span>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        placeholder="Optional"
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-line bg-surface px-3 font-mono text-sm tabular-nums text-ink outline-none transition-colors placeholder:text-ink-subtle focus:border-accent coarse:h-11 coarse:text-base"
      />
      <span className="mt-1 block min-h-4 font-mono text-[11px] tabular-nums text-ink-subtle">{hint}</span>
    </label>
  );
}

export function OrderTicket() {
  const quote = useTradingStore((state) => state.quote);
  const placeOrder = useTradingStore((state) => state.placeOrder);
  const leverage = useTradingStore((state) => state.settings.leverage);
  const strategies = useStrategyStore((state) => state.strategies);
  const activeId = useStrategyStore((state) => state.activeId);
  const setActive = useStrategyStore((state) => state.setActive);

  const defaultLots = usePreferencesStore((state) => state.defaultLots);
  const [lots, setLots] = useState(defaultLots);
  useEffect(() => setLots(defaultLots), [defaultLots]);
  const [unit, setUnit] = useState<StopUnit>('pips');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [error, setError] = useState<string | null>(null);

  const stopHint = (text: string) => {
    const stop = parseStop(text, unit);
    if (!stop) return '';
    const pips = stop.unit === 'pips' ? stop.value : Math.abs(stop.value - quote.bid) / SYMBOL.pipSize;
    return `${pips.toFixed(1)} pips${stop.unit === 'price' ? ' from market' : ''} · ${formatMoney(pips * pipValue(lots, SYMBOL))}`;
  };

  const submit = (side: Side) => {
    const sl = parseStop(stopLoss, unit);
    const tp = parseStop(takeProfit, unit);
    if (sl === undefined) return setError('Stop loss must be a number greater than zero.');
    if (tp === undefined) return setError('Take profit must be a number greater than zero.');

    const result = placeOrder({ side, lots, stopLoss: sl, takeProfit: tp });
    if (result.ok) {
      setError(null);
      setStopLoss('');
      setTakeProfit('');
    } else {
      setError(result.error);
    }
  };

  const clearError = () => setError(null);

  return (
    <PanelSection title="Order ticket" badge="Market">
      <div className="space-y-3.5">
        <div>
          <span className="mb-1 block text-[11px] text-ink-subtle">Strategy</span>
          <Select label="Active strategy" value={activeId} onChange={setActive}>
            {strategies
              .filter((strategy) => !strategy.archived)
              .map((strategy) => (
                <option key={strategy.id} value={strategy.id}>
                  {strategy.name}
                </option>
              ))}
          </Select>
        </div>

        <div className="relative grid grid-cols-2 gap-2">
          <TradeButton side="sell" price={quote.bid} onClick={() => submit('sell')} />
          <TradeButton side="buy" price={quote.ask} onClick={() => submit('buy')} />
          <span
            title="Current spread"
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-line bg-surface px-2 py-0.5 font-mono text-[10px] tabular-nums text-ink-muted"
          >
            {quote.spreadPips.toFixed(1)}
          </span>
        </div>

        <div>
          <span className="mb-1 block text-[11px] text-ink-subtle">Lots</span>
          <NumberStepper
            label="Lot size"
            value={lots}
            min={LOT_LIMITS.min}
            max={LOT_LIMITS.max}
            step={LOT_LIMITS.step}
            decimals={2}
            onChange={(next) => {
              setLots(next);
              clearError();
            }}
          />
          <div className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto">
            {LOT_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setLots(preset);
                  clearError();
                }}
                className={cn(
                  'h-7 shrink-0 rounded-md px-2.5 font-mono text-xs tabular-nums transition-colors coarse:h-9',
                  lots === preset ? 'bg-accent/15 text-accent' : 'bg-overlay text-ink-muted hover:text-ink',
                )}
              >
                {preset.toFixed(2)}
              </button>
            ))}
          </div>
          <p className="mt-2 font-mono text-[11px] tabular-nums text-ink-subtle">
            1 pip = {formatMoney(pipValue(lots, SYMBOL))} · Margin {formatMoney(marginFor(lots, quote.ask, SYMBOL, leverage))}
          </p>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] text-ink-subtle">Protection</span>
            <SegmentedControl<StopUnit>
              label="Stop unit"
              options={UNIT_OPTIONS}
              value={unit}
              onChange={(next) => {
                setUnit(next);
                setStopLoss('');
                setTakeProfit('');
                clearError();
              }}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <StopField
              label="Stop loss"
              value={stopLoss}
              hint={stopHint(stopLoss)}
              onChange={(next) => {
                setStopLoss(next);
                clearError();
              }}
            />
            <StopField
              label="Take profit"
              value={takeProfit}
              hint={stopHint(takeProfit)}
              onChange={(next) => {
                setTakeProfit(next);
                clearError();
              }}
            />
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded-lg border border-bear/30 bg-bear/10 px-3 py-2 text-xs text-bear">
            {error}
          </p>
        )}
      </div>
    </PanelSection>
  );
}
