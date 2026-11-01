import type { UnixSeconds } from './market';

export type NewsImpact = 'high' | 'medium';

export interface NewsEvent {
  id: string;
  time: UnixSeconds;
  /** Short label for the chart ("NFP"). */
  short: string;
  title: string;
  currency: 'USD' | 'EUR';
  impact: NewsImpact;
  /** Shown as text so units stay with the numbers ("3.2%", "187K"). */
  actual: string;
  forecast: string;
  previous: string;
}
