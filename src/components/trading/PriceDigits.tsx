import { SYMBOL } from '@/data/marketData';

/** A price with the pip digits emphasised, e.g. 1.08 **51** ² — easy to read at a glance. */
export function PriceDigits({ price }: { price: number }) {
  const text = price.toFixed(SYMBOL.pricePrecision);
  return (
    <span className="font-mono tabular-nums leading-none">
      <span className="text-[13px] opacity-80">{text.slice(0, -3)}</span>
      <span className="text-xl font-semibold">{text.slice(-3, -1)}</span>
      <span className="align-top text-[11px] opacity-80">{text.slice(-1)}</span>
    </span>
  );
}
