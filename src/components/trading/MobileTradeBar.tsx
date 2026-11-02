import { SYMBOL } from '@/data/marketData';
import { formatPrice } from '@/lib/format';
import { usePreferencesStore } from '@/stores/preferencesStore';
import { useTradingStore } from '@/stores/tradingStore';

/**
 * Always-visible buy/sell strip on phones (MT5 one-tap style).
 * Full Limit/Stop + SL/TP live in the Trade panel Order ticket.
 */
export function MobileTradeBar() {
  const quote = useTradingStore((s) => s.quote);
  const placeOrder = useTradingStore((s) => s.placeOrder);
  const lots = usePreferencesStore((s) => s.defaultLots ?? 0.1);
  const setDefaultLots = usePreferencesStore((s) => (s as { setDefaultLots?: (n: number) => void }).setDefaultLots);

  const buy = () => {
    placeOrder({ side: 'buy', lots, stopLoss: null, takeProfit: null });
  };
  const sell = () => {
    placeOrder({ side: 'sell', lots, stopLoss: null, takeProfit: null });
  };

  const bumpLots = (dir: 1 | -1) => {
    if (!setDefaultLots) return;
    const next = Math.max(0.01, Math.round((lots + dir * 0.01) * 100) / 100);
    setDefaultLots(next);
  };

  return (
    <div className="flex shrink-0 items-stretch gap-2 border-t border-line bg-surface px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden">
      <button
        type="button"
        onClick={sell}
        className="flex h-14 min-w-0 flex-1 flex-col items-center justify-center rounded-lg bg-bear text-white active:brightness-90"
      >
        <span className="text-[11px] font-semibold uppercase tracking-wide opacity-95">Market Sell</span>
        <span className="font-mono text-sm font-bold tabular-nums leading-tight">
          {formatPrice(quote.bid, SYMBOL)}
        </span>
      </button>

      <div className="flex w-16 shrink-0 flex-col items-center justify-center gap-0.5">
        <button
          type="button"
          onClick={() => bumpLots(1)}
          className="flex h-5 w-full items-center justify-center rounded text-[10px] text-ink-muted hover:bg-overlay"
          aria-label="Increase lots"
        >
          ▲
        </button>
        <span className="font-mono text-xs font-semibold tabular-nums text-ink">{lots.toFixed(2)}</span>
        <button
          type="button"
          onClick={() => bumpLots(-1)}
          className="flex h-5 w-full items-center justify-center rounded text-[10px] text-ink-muted hover:bg-overlay"
          aria-label="Decrease lots"
        >
          ▼
        </button>
      </div>

      <button
        type="button"
        onClick={buy}
        className="flex h-14 min-w-0 flex-1 flex-col items-center justify-center rounded-lg bg-bull text-white active:brightness-90"
      >
        <span className="text-[11px] font-semibold uppercase tracking-wide opacity-95">Market Buy</span>
        <span className="font-mono text-sm font-bold tabular-nums leading-tight">
          {formatPrice(quote.ask, SYMBOL)}
        </span>
      </button>
    </div>
  );
}
