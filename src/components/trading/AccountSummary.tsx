import { formatMoney, formatSignedMoney, pnlTone } from '@/lib/format';
import { cn } from '@/lib/cn';
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
  const floatingPnl = useTradingStore((state) => state.floatingPnl);

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
        <Stat label="Balance" value={formatMoney(balance)} />
        <Stat label="Equity" value={formatMoney(equity)} />
        <Stat label="Free margin" value={formatMoney(freeMargin)} />
        <Stat label="Used margin" value={formatMoney(usedMargin)} />
      </dl>
    </PanelSection>
  );
}
