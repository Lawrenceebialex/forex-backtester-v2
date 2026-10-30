import type { UnixSeconds } from '@/domain/market';

const pad = (value: number) => String(value).padStart(2, '0');

/** "2026-08-17" (UTC) — the format <input type="date"> uses. */
export function toDateInputValue(time: UnixSeconds): string {
  const d = new Date(time * 1000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** "07:30" (UTC) — the format <input type="time"> uses. */
export function toTimeInputValue(time: UnixSeconds): string {
  const d = new Date(time * 1000);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/** Parses the values of a date and a time input as UTC. Returns null when either is invalid. */
export function parseUtcDateTime(date: string, time: string): UnixSeconds | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const t = /^(\d{2}):(\d{2})$/.exec(time);
  if (!d || !t) return null;
  const [year, month, day, hour, minute] = [d[1], d[2], d[3], t[1], t[2]].map(Number);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null;
  const ms = Date.UTC(year, month - 1, day, hour, minute);
  return Number.isNaN(ms) ? null : ms / 1000;
}
