import type { NewsEvent } from '@/domain/news';

const at = (day: number, hour: number, minute: number) => Date.UTC(2026, 7, day, hour, minute) / 1000;

/**
 * Mock economic calendar covering the mock price data (August 2026). Dates and times follow the
 * usual release schedule; the numbers are made up. Replace with a real calendar feed later —
 * the rest of the app only needs this array.
 */
export const NEWS_EVENTS: readonly NewsEvent[] = [
  { id: 'adp-0805', time: at(5, 12, 15), short: 'ADP', title: 'ADP Non-Farm Employment Change', currency: 'USD', impact: 'medium', actual: '142K', forecast: '155K', previous: '131K' },
  { id: 'ism-0805', time: at(5, 14, 0), short: 'ISM', title: 'ISM Services PMI', currency: 'USD', impact: 'medium', actual: '51.8', forecast: '52.4', previous: '52.0' },
  { id: 'nfp-0807', time: at(7, 12, 30), short: 'NFP', title: 'Non-Farm Payrolls', currency: 'USD', impact: 'high', actual: '187K', forecast: '165K', previous: '152K' },
  { id: 'ur-0807', time: at(7, 12, 30), short: 'UR', title: 'Unemployment Rate', currency: 'USD', impact: 'high', actual: '4.1%', forecast: '4.2%', previous: '4.2%' },
  { id: 'zew-0811', time: at(11, 9, 0), short: 'ZEW', title: 'German ZEW Economic Sentiment', currency: 'EUR', impact: 'medium', actual: '21.4', forecast: '19.0', previous: '17.8' },
  { id: 'cpi-0812', time: at(12, 12, 30), short: 'CPI', title: 'US CPI (YoY)', currency: 'USD', impact: 'high', actual: '3.2%', forecast: '3.0%', previous: '3.1%' },
  { id: 'ccpi-0812', time: at(12, 12, 30), short: 'Core', title: 'US Core CPI (MoM)', currency: 'USD', impact: 'high', actual: '0.4%', forecast: '0.3%', previous: '0.3%' },
  { id: 'claims-0813', time: at(13, 12, 30), short: 'Jobless', title: 'Unemployment Claims', currency: 'USD', impact: 'medium', actual: '231K', forecast: '228K', previous: '226K' },
  { id: 'retail-0814', time: at(14, 12, 30), short: 'Retail', title: 'US Retail Sales (MoM)', currency: 'USD', impact: 'high', actual: '0.2%', forecast: '0.5%', previous: '0.6%' },
  { id: 'emp-0814', time: at(14, 9, 0), short: 'EU GDP', title: 'Eurozone GDP (QoQ)', currency: 'EUR', impact: 'medium', actual: '0.3%', forecast: '0.3%', previous: '0.2%' },
  { id: 'fomc-0819', time: at(19, 18, 0), short: 'FOMC', title: 'FOMC Meeting Minutes', currency: 'USD', impact: 'high', actual: '—', forecast: '—', previous: '—' },
  { id: 'pmi-0821', time: at(21, 7, 0), short: 'EU PMI', title: 'Eurozone Flash Manufacturing PMI', currency: 'EUR', impact: 'medium', actual: '47.6', forecast: '47.9', previous: '47.2' },
  { id: 'jh-0821', time: at(21, 14, 0), short: 'Fed Chair', title: 'Fed Chair Speech (Jackson Hole)', currency: 'USD', impact: 'high', actual: '—', forecast: '—', previous: '—' },
  { id: 'ifo-0824', time: at(24, 8, 0), short: 'Ifo', title: 'German Ifo Business Climate', currency: 'EUR', impact: 'medium', actual: '88.1', forecast: '88.6', previous: '87.4' },
  { id: 'gdp-0827', time: at(27, 12, 30), short: 'GDP', title: 'US GDP (QoQ, second estimate)', currency: 'USD', impact: 'high', actual: '2.1%', forecast: '2.0%', previous: '2.0%' },
  { id: 'pce-0828', time: at(28, 12, 30), short: 'PCE', title: 'US Core PCE Price Index (MoM)', currency: 'USD', impact: 'high', actual: '0.2%', forecast: '0.2%', previous: '0.3%' },
];

/** A high-impact event within `windowMinutes` of `time` (before or after), if any. */
export function findBlockingEvent(events: readonly NewsEvent[], time: number, windowMinutes: number): NewsEvent | null {
  const window = windowMinutes * 60;
  return events.find((event) => event.impact === 'high' && Math.abs(event.time - time) <= window) ?? null;
}

/** Number of events released at or before `time`. */
export function countReleased(events: readonly NewsEvent[], time: number): number {
  return events.reduce((count, event) => (event.time <= time ? count + 1 : count), 0);
}
