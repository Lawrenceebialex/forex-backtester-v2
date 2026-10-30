import type { SymbolInfo } from '@/domain/market';

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/** Avoids "-0.00" / "-0.0": anything that rounds to zero is shown as zero. */
const noNegativeZero = (value: number) => value || 0;

export function formatMoney(value: number): string {
  return money.format(noNegativeZero(Math.round(value * 100) / 100));
}

/** "+$12.40", "-$3.10", "$0.00" */
export function formatSignedMoney(value: number): string {
  const rounded = noNegativeZero(Math.round(value * 100) / 100);
  return `${rounded > 0 ? '+' : ''}${money.format(rounded)}`;
}

/** "+12.4", "-3.0", "0.0" */
export function formatPips(pips: number): string {
  const rounded = noNegativeZero(Math.round(pips * 10) / 10);
  return `${rounded > 0 ? '+' : ''}${rounded.toFixed(1)}`;
}

export function formatPrice(price: number, symbol: SymbolInfo): string {
  return price.toFixed(symbol.pricePrecision);
}

/** Tailwind text color for a profit / loss figure. */
export function pnlTone(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  if (rounded > 0) return 'text-bull';
  if (rounded < 0) return 'text-bear';
  return 'text-ink-muted';
}

export function formatPercent(value: number, digits = 1): string {
  return `${(Math.round(value * 10 ** digits) / 10 ** digits || 0).toFixed(digits)}%`;
}

/** "2d 4h", "3h 20m", "45m", "<1m" */
export function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 1) return '<1m';
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const rest = minutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${rest}m`;
  return `${rest}m`;
}
