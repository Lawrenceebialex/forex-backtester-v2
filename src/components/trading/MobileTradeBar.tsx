import { useTradingStore } from '@/stores/tradingStore';
import { usePreferencesStore } from '@/stores/preferencesStore';
import { formatPrice } from '@/lib/format';
import { SYMBOL } from '@/data/marketData';

/** Always-visible Buy / Sell strip for phones (MT5-style). */
export function MobileTradeBar() {
  const quote = useTradingStore((s) => s.quote);
  const placeOrder = useTradingStore((s) => s.placeOrder);
  const lots = usePreferencesStore((s) => s.defaultLots);

  const buy = () => {
    placeOrder({ side: 'buy', lots, stopLoss: null, takeProfit: null });
  };
  const sell = () => {
    placeOrder({ side: 'sell', lots, stopLoss: null, takeProfit: null });
  };

  return (
    <div className="flex shrink-0 gap-2 border-t border-line bg-surface px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden">
      <button
        type="button"
        onClick={sell}
        className="flex h-12 flex-1 flex-col items-center justify-center rounded-lg bg-bear text-white active:brightness-90"
      >
        <span className="text-[11px] font-medium uppercase opacity-90">Sell</span>
        <span className="font-mono text-sm font-semibold tabular-nums">{formatPrice(quote.bid, SYMBOL)}</span>
      </button>
      <button
        type="button"
        onClick={buy}
        className="flex h-12 flex-1 flex-col items-center justify-center rounded-lg bg-bull text-white active:brightness-90"
      >
        <span className="text-[11px] font-medium uppercase opacity-90">Buy</span>
        <span className="font-mono text-sm font-semibold tabular-nums">{formatPrice(quote.ask, SYMBOL)}</span>
      </button>
    </div>
  );
}
