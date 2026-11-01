import { ArrowRight, Inbox } from 'lucide-react';
import { SYMBOL } from '@/data/marketData';
import type { Position } from '@/domain/trading';
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

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {position.stopLoss !== null && <LevelChip label="SL" price={position.stopLoss} tone="bg-bear/10 text-bear" />}
          {position.takeProfit !== null && <LevelChip label="TP" price={position.takeProfit} tone="bg-bull/10 text-bull" />}
        </div>
        <button
          type="button"
          onClick={() => closePosition(position.id)}
          aria-label={`Close ${position.side} ${position.lots.toFixed(2)} position #${position.number}`}
          className="h-8 shrink-0 rounded-lg border border-line-strong px-3 text-xs font-medium text-ink-muted transition hover:bg-overlay hover:text-ink active:scale-95 coarse:h-10"
        >
          Close
        </button>
      </div>
    </li>
  );
}

export function PositionsList() {
  const positions = useTradingStore((state) => state.positions);
  const closeAll = useTradingStore((state) => state.closeAll);

  return (
    <PanelSection
      title="Positions"
      badge={positions.length}
      action={
        positions.length > 1 && (
          <button
            type="button"
            onClick={closeAll}
            className="h-6 rounded-md px-2 text-[11px] font-medium text-ink-muted transition-colors hover:bg-overlay hover:text-ink coarse:h-8"
          >
            Close all
          </button>
        )
      }
    >
      {positions.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-5 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-overlay text-ink-subtle">
            <Inbox size={18} />
          </span>
          <p className="text-sm font-medium text-ink-muted">No open positions</p>
          <p className="max-w-[16rem] text-xs text-ink-subtle">Buy or sell above and your position will appear here, updating with every candle.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {[...positions].reverse().map((position) => (
            <PositionRow key={position.id} position={position} />
          ))}
        </ul>
      )}
    </PanelSection>
  );
}
