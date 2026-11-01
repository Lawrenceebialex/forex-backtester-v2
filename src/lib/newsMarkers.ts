import type { NewsMarker } from '@/chart/CandleChart';
import type { NewsEvent } from '@/domain/news';

/** One chart marker per candle: events that fall on the same candle share it ("CPI +1"). */
export function groupNewsMarkers(
  events: readonly NewsEvent[],
  bucketSeconds: number,
  colors: { high: string; medium: string },
): NewsMarker[] {
  const groups = new Map<number, NewsEvent[]>();
  for (const event of events) {
    const time = Math.floor(event.time / bucketSeconds) * bucketSeconds;
    const group = groups.get(time);
    if (group) group.push(event);
    else groups.set(time, [event]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([time, group]) => ({
      time,
      label: group.length > 1 ? `${group[0].short} +${group.length - 1}` : group[0].short,
      color: group.some((event) => event.impact === 'high') ? colors.high : colors.medium,
      ids: group.map((event) => event.id),
    }));
}
