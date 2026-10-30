import type { Candle, UnixSeconds } from '@/domain/market';

/** Candidate spacings between time-axis labels, in seconds. */
const STEPS = [60, 300, 900, 1800, 3600, 7200, 14_400, 21_600, 43_200, 86_400, 604_800, 1_209_600, 2_592_000];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY = 86_400;

const pad = (value: number) => String(value).padStart(2, '0');

/** The smallest label spacing that keeps labels at least `minPixels` apart. */
export function pickTimeStep(barSpacing: number, timeframeSeconds: number, minPixels = 88): number {
  for (const step of STEPS) {
    if (step < timeframeSeconds) continue;
    if ((step / timeframeSeconds) * barSpacing >= minPixels) return step;
  }
  return STEPS[STEPS.length - 1];
}

export interface TimeTick {
  index: number;
  label: string;
  /** A day boundary (or coarser): drawn bolder. */
  major: boolean;
}

/**
 * Labels for the candles in [first, last]. The axis is index-based (weekend gaps are compressed),
 * so a tick lands on the first candle of each new `step` bucket.
 */
export function computeTimeTicks(candles: readonly Candle[], first: number, last: number, step: number): TimeTick[] {
  const ticks: TimeTick[] = [];
  for (let i = Math.max(1, first); i <= last && i < candles.length; i++) {
    const time = candles[i].time;
    const previous = candles[i - 1].time;
    if (Math.floor(time / step) === Math.floor(previous / step)) continue;
    const major = step >= DAY || Math.floor(time / DAY) !== Math.floor(previous / DAY);
    const date = new Date(time * 1000);
    const label = major
      ? `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`
      : `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
    ticks.push({ index: i, label, major });
  }
  return ticks;
}

/** "Mon 17 Aug '26  09:32" (UTC) */
export function formatCrosshairTime(time: UnixSeconds): string {
  const d = new Date(time * 1000);
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} '${String(d.getUTCFullYear()).slice(2)}  ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}
