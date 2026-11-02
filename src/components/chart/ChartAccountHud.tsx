import { cn } from '@/lib/cn';
import { formatMoney, formatSignedMoney, pnlTone } from '@/lib/format';
import { useGradual } from '@/hooks/useEasedNumber';
import { useTradingStore } from '@/stores/tradingStore';

/**
 * Compact account strip on the chart so balance / floating P&L stay visible
 * without opening the Trade panel (MT5-style always-on numbers).
 */
export function ChartAccountHud() {
  const balance = useGradual(useTradingStore((s) => s.balance));
  const equity = useGradual(useTradingStore((s) => s.equity));
  const floating = useGradual(useTradingStore((s) => s.floatingPnl));
  const free = useGradual(useTradingStore((s) => s.freeMargin));
  const openCount = useTradingStore((s) => s.positions.length);
  const pendingCount = useTradingStore((s) => s.pendingOrders.length);

  return (
    <div className="pointer-events-none absolute right-2 top-2 z-30 flex max-w-[min(100%,18rem)] flex-wrap justify-end gap-x-2.5 gap-y-0.5 rounded-lg border border-line/80 bg-surface/95 px-2.5 py-1.5 text-[11px] shadow-overlay backdrop-blur-sm sm:right-3 sm:top-3">
      <span className="font-mono tabular-nums text-ink">
        <span className="text-ink-subtle">Bal </span>
        {formatMoney(balance)}
      </span>
      <span className="font-mono tabular-nums text-ink">
        <span className="text-ink-subtle">Eq </span>
        {formatMoney(equity)}
      </span>
      <span className={cn('font-mono font-medium tabular-nums', pnlTone(floating))}>
        <span className="font-normal text-ink-subtle">P&L </span>
        {formatSignedMoney(floating)}
      </span>
      <span className="hidden font-mono tabular-nums text-ink-muted sm:inline">
        Free {formatMoney(free)}
      </span>
      {(openCount > 0 || pendingCount > 0) && (
        <span className="text-ink-subtle">
          {openCount > 0 && `${openCount} open`}
          {openCount > 0 && pendingCount > 0 && ' · '}
          {pendingCount > 0 && `${pendingCount} pending`}
        </span>
      )}
    </div>
  );
}
