import { useState } from 'react';
import { ArrowRight, Inbox } from 'lucide-react';
import { SYMBOL } from '@/data/marketData';
import type { PendingOrder, Position } from '@/domain/trading';
import { useGradual } from '@/hooks/useEasedNumber';
import { cn } from '@/lib/cn';
import { formatPips, formatPrice, formatSignedMoney, pnlTone } from '@/lib/format';
import { closePrice, floatingResult } from '@/lib/trading';
import { useTradingStore } from '@/stores/tradingStore';
import { PanelSection } from './PanelSection';

function LevelChip({ label, price, tone }: { label: string; price: number; tone: string }) {
  return (
    <span className={cn('rounded-md px-1.5 py-0.5 font-mono text-[11px] tabular-nums', tone)}>
      {label} {formatPrice(price, SYMBOL)}
    </span>
  );
}

function ModifyStops({ position }: { position: Position }) {
  const modify = useTradingStore((s) => s.modifyPositionStops);
  const [open, setOpen] = useState(false);
  const [sl, setSl] = useState(position.stopLoss != null ? String(position.stopLoss) : '');
  const [tp, setTp] = useState(position.takeProfit != null ? String(position.takeProfit) : '');

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-8 shrink-0 rounded-lg border border-line px-2 text-[11px] font-medium text-ink-muted hover:bg-overlay hover:text-ink"
      >
        SL/TP
      </button>
    );
  }

  const save = () => {
    const stopLoss = sl.trim() === '' ? null : Number(sl);
    const takeProfit = tp.trim() === '' ? null : Number(tp);
    if (stopLoss !== null && !Number.isFinite(stopLoss)) return;
    if (takeProfit !== null && !Number.isFinite(takeProfit)) return;
    modify(position.id, stopLoss, takeProfit);
    setOpen(false);
  };

  return (
    <div className="mt-2 w-full space-y-1.5 rounded-lg border border-line bg-raised p-2">
      <div className="grid grid-cols-2 gap-1.5">
        <label className="block">
          <span className="text-[10px] text-ink-subtle">SL price</span>
          <input
            value={sl}
            onChange={(e) => setSl(e.target.value)}
            placeholder="None"
            className="mt-0.5 h-8 w-full rounded border border-line bg-surface px-2 font-mono text-xs"
          />
        </label>
        <label className="block">
          <span className="text-[10px] text-ink-subtle">TP price</span>
          <input
            value={tp}
            onChange={(e) => setTp(e.target.value)}
            placeholder="None"
            className="mt-0.5 h-8 w-full rounded border border-line bg-surface px-2 font-mono text-xs"
          />
        </label>
      </div>
      <div className="flex justify-end gap-1.5">
        <button type="button" onClick={() => setOpen(false)} className="h-7 rounded px-2 text-[11px] text-ink-muted">
          Cancel
        </button>
        <button type="button" onClick={save} className="h-7 rounded bg-accent px-2 text-[11px] font-medium text-accent-ink">
          Save
        </button>
      </div>
    </div>
  );
}

function PositionRow({ position }: { position: Position }) {
  const quote = useTradingStore((state) => state.quote);
  const closePosition = useTradingStore((state) => state.closePosition);
  const live = floatingResult(position, quote, SYMBOL);
  const pips = useGradual(live.pips);
  const pnl = useGradual(live.pnl);
  const tone = pnlTone(pnl);
  const isBuy = position.side === 'buy';

  return (
    <li className="rounded-xl border border-line bg-surface p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                isBuy ? 'bg-bull/15 text-bull' : 'bg-bear/15 text-bear',
              )}
            >
              {position.side}
            </span>
            <span className="font-mono text-sm tabular-nums text-ink">{position.lots.toFixed(2)}</span>
            <span className="truncate text-xs text-ink-subtle">
              {SYMBOL.symbol} · #{position.number}
            </span>
          </div>
          <p className="mt-1.5 flex items-center gap-1.5 font-mono text-xs tabular-nums text-ink-muted">
            {formatPrice(position.entryPrice, SYMBOL)}
            <ArrowRight size={11} aria-hidden className="shrink-0 text-ink-subtle" />
            <span className="text-ink">{formatPrice(closePrice(position.side, quote), SYMBOL)}</span>
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className={cn('font-mono text-base font-semibold tabular-nums', tone)}>{formatSignedMoney(pnl)}</p>
          <p className={cn('font-mono text-xs tabular-nums', tone)}>{formatPips(pips)} pips</p>
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {position.stopLoss != null && (
            <LevelChip label="SL" price={position.stopLoss} tone="bg-bear/10 text-bear" />
          )}
          {position.takeProfit != null && (
            <LevelChip label="TP" price={position.takeProfit} tone="bg-bull/10 text-bull" />
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <ModifyStops position={position} />
          <button
            type="button"
            onClick={() => closePosition(position.id)}
            className="h-8 rounded-lg bg-overlay px-2.5 text-[11px] font-medium text-ink hover:bg-line"
          >
            Close
          </button>
        </div>
      </div>
    </li>
  );
}

function PendingRow({ order }: { order: PendingOrder }) {
  const cancel = useTradingStore((s) => s.cancelPending);
  const isBuy = order.side === 'buy';

  return (
    <li className="rounded-xl border border-dashed border-line bg-surface/60 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="rounded bg-overlay px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-muted">
              {order.orderType}
            </span>
            <span
              className={cn(
                'rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                isBuy ? 'bg-bull/15 text-bull' : 'bg-bear/15 text-bear',
              )}
            >
              {order.side}
            </span>
            <span className="font-mono text-sm tabular-nums text-ink">{order.lots.toFixed(2)}</span>
            <span className="truncate text-xs text-ink-subtle">#{order.number}</span>
          </div>
          <p className="mt-1.5 font-mono text-xs tabular-nums text-ink-muted">
            @ {formatPrice(order.price, SYMBOL)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => cancel(order.id)}
          className="h-8 shrink-0 rounded-lg border border-line px-2.5 text-[11px] font-medium text-ink-muted hover:bg-overlay hover:text-ink"
        >
          Cancel
        </button>
      </div>
      {(order.stopLoss != null || order.takeProfit != null) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {order.stopLoss != null && <LevelChip label="SL" price={order.stopLoss} tone="bg-bear/10 text-bear" />}
          {order.takeProfit != null && (
            <LevelChip label="TP" price={order.takeProfit} tone="bg-bull/10 text-bull" />
          )}
        </div>
      )}
    </li>
  );
}

export function PositionsList() {
  const positions = useTradingStore((state) => state.positions);
  const pending = useTradingStore((state) => state.pendingOrders);
  const closeAll = useTradingStore((state) => state.closeAll);

  return (
    <div className="space-y-4">
      <PanelSection
        title="Open positions"
        badge={positions.length}
        action={
          positions.length > 0 ? (
            <button
              type="button"
              onClick={closeAll}
              className="text-[11px] font-medium text-ink-muted hover:text-ink"
            >
              Close all
            </button>
          ) : undefined
        }
      >
        {positions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-ink-subtle">
            <Inbox size={20} />
            <p className="text-xs">No open positions</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {positions.map((position) => (
              <PositionRow key={position.id} position={position} />
            ))}
          </ul>
        )}
      </PanelSection>

      {(pending.length > 0 || positions.length > 0) && (
        <PanelSection title="Pending orders" badge={pending.length}>
          {pending.length === 0 ? (
            <p className="py-3 text-center text-xs text-ink-subtle">No pending orders</p>
          ) : (
            <ul className="space-y-2">
              {pending.map((order) => (
                <PendingRow key={order.id} order={order} />
              ))}
            </ul>
          )}
        </PanelSection>
      )}
    </div>
  );
}
