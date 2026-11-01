import type { Candle, UnixSeconds } from '@/domain/market';

/** Candidate spacings between time-axis labels, in seconds. */
const STEPS = [60, 300, 900, 1800, 3600, 7200, 14_400, 21_600, 43_200, 86_400, 604_800, 1_209_600, 2_592_000];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY = 86_400;

/** West Africa Time = UTC+1 (Nigeria year-round, no DST). */
const WAT_OFFSET_SECONDS = 3600;

const pad = (value: number) => String(value).padStart(2, '0');

/** Instant in WAT for labeling (data stays Unix; display only shifts). */
function watParts(time: UnixSeconds) {
  const d = new Date((time + WAT_OFFSET_SECONDS) * 1000);
  // Use UTC getters after offset so we are not affected by the device locale.
  return {
    weekday: WEEKDAYS[d.getUTCDay()],
    day: d.getUTCDate(),
    month: MONTHS[d.getUTCMonth()],
    year2: String(d.getUTCFullYear()).slice(2),
    hours: pad(d.getUTCHours()),
    minutes: pad(d.getUTCMinutes()),
  };
}

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
 * Labels for the candles in [first, last]. Axis is index-based (weekend gaps compressed).
 * Labels are shown in WAT (UTC+1).
 */
export function computeTimeTicks(candles: readonly Candle[], first: number, last: number, step: number): TimeTick[] {
  const ticks: TimeTick[] = [];
  for (let i = Math.max(1, first); i <= last && i < candles.length; i++) {
    const time = candles[i].time;
    const previous = candles[i - 1].time;
    if (Math.floor(time / step) === Math.floor(previous / step)) continue;
    const major = step >= DAY || Math.floor(time / DAY) !== Math.floor(previous / DAY);
    const p = watParts(time);
    const label = major ? `${p.day} ${p.month}` : `${p.hours}:${p.minutes}`;
    ticks.push({ index: i, label, major });
  }
  return ticks;
}

/** e.g. "Mon 17 Aug '26  09:32 WAT" */
export function formatCrosshairTime(time: UnixSeconds): string {
  const p = watParts(time);
  return `${p.weekday} ${p.day} ${p.month} '${p.year2}  ${p.hours}:${p.minutes} WAT`;
}
