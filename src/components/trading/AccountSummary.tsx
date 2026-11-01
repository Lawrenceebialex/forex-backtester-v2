import { formatMoney, formatSignedMoney, pnlTone } from '@/lib/format';
import { cn } from '@/lib/cn';
import { useGradual } from '@/hooks/useEasedNumber';
import { useTradingStore } from '@/stores/tradingStore';
import { PanelSection } from './PanelSection';

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] text-ink-subtle">{label}</dt>
      <dd className="font-mono text-base tabular-nums text-ink">{value}</dd>
    </div>
  );
}

export function AccountSummary() {
  const balance = useTradingStore((state) => state.balance);
  const equity = useTradingStore((state) => state.equity);
  const freeMargin = useTradingStore((state) => state.freeMargin);
  const usedMargin = useTradingStore((state) => state.usedMargin);
  const floatingPnl = useGradual(useTradingStore((state) => state.floatingPnl));
  const shown = {
    balance: useGradual(balance),
    equity: useGradual(equity),
    freeMargin: useGradual(freeMargin),
    usedMargin: useGradual(usedMargin),
  };

  return (
    <PanelSection
      title="Account"
      action={
        <span className={cn('font-mono text-xs font-medium tabular-nums', pnlTone(floatingPnl))} aria-label="Floating profit and loss">
          {formatSignedMoney(floatingPnl)}
        </span>
      }
    >
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        <Stat label="Balance" value={formatMoney(shown.balance)} />
        <Stat label="Equity" value={formatMoney(shown.equity)} />
        <Stat label="Free margin" value={formatMoney(shown.freeMargin)} />
        <Stat label="Used margin" value={formatMoney(shown.usedMargin)} />
      </dl>
    </PanelSection>
  );
}
