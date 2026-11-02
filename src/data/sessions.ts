/**
 * Standard forex sessions and ICT-style killzones in UTC (winter / EST+5 baseline).
 * Killzones are approximate institutional windows traders use for confluence —
 * not a guarantee of direction.
 */

export interface SessionWindow {
  id: string;
  label: string;
  /** Start hour inclusive, UTC 0–23 */
  startHourUtc: number;
  /** End hour exclusive, UTC 0–24 */
  endHourUtc: number;
  color: string;
}

/** Full trading sessions */
export const MARKET_SESSIONS: SessionWindow[] = [
  { id: 'asia', label: 'Asia', startHourUtc: 0, endHourUtc: 9, color: 'rgba(99,102,241,0.12)' },
  { id: 'london', label: 'London', startHourUtc: 7, endHourUtc: 16, color: 'rgba(34,197,94,0.12)' },
  { id: 'newyork', label: 'New York', startHourUtc: 12, endHourUtc: 21, color: 'rgba(239,68,68,0.10)' },
  { id: 'overlap', label: 'London–NY', startHourUtc: 12, endHourUtc: 16, color: 'rgba(234,179,8,0.14)' },
];

/** ICT-style killzones (NY-local mapped to UTC winter) */
export const KILLZONES: SessionWindow[] = [
  { id: 'kz-asia', label: 'Asia KZ', startHourUtc: 1, endHourUtc: 3, color: 'rgba(99,102,241,0.18)' },
  { id: 'kz-london', label: 'London KZ', startHourUtc: 7, endHourUtc: 10, color: 'rgba(34,197,94,0.18)' },
  { id: 'kz-ny', label: 'New York KZ', startHourUtc: 12, endHourUtc: 15, color: 'rgba(239,68,68,0.16)' },
  { id: 'kz-london-close', label: 'London Close', startHourUtc: 15, endHourUtc: 17, color: 'rgba(168,85,247,0.16)' },
];

export interface CustomCrossTime {
  id: string;
  label: string;
  /** Minutes from midnight UTC 0–1439 */
  minuteUtc: number;
}

export function hourUtcFromUnix(time: number): number {
  return Math.floor(((time % 86_400) + 86_400) % 86_400 / 3_600);
}

export function formatUtcHm(minuteUtc: number): string {
  const h = Math.floor(minuteUtc / 60) % 24;
  const m = minuteUtc % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} UTC`;
}

/** WAT = UTC+1 */
export function formatWatHm(minuteUtc: number): string {
  const total = (minuteUtc + 60) % (24 * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} WAT`;
}
