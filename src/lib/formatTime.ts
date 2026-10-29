import type { UnixSeconds } from '@/domain/market';

const virtualClockFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  weekday: 'short',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** e.g. "Mon, 17 Aug 2026, 07:00" — always in UTC, independent of the viewer's time zone. */
export function formatVirtualTime(time: UnixSeconds): string {
  return virtualClockFormat.format(new Date(time * 1000));
}
