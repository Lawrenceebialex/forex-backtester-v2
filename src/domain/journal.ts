export const SUGGESTED_TAGS = [
  'FVG',
  'Order Block',
  'Liquidity Sweep',
  'Break of Structure',
  'CHoCH',
  'Premium/Discount',
  'London Session',
  'New York Session',
  'Breakout',
  'Reversal',
  'Trend Continuation',
] as const;

export type SuggestedTag = (typeof SUGGESTED_TAGS)[number];

export interface TradeJournalEntry {
  tradeId: string;
  tags: string[];
  setupCategory: string;
  tradingSession: string;
  notes: string;
  whyEntered: string;
  confirmation: string;
  whyStop: string;
  whyTarget: string;
  followedStrategy: 'yes' | 'no' | 'partial' | '';
  wouldChange: string;
  updatedAt: number;
}

export function emptyJournal(tradeId: string): TradeJournalEntry {
  return {
    tradeId,
    tags: [],
    setupCategory: '',
    tradingSession: '',
    notes: '',
    whyEntered: '',
    confirmation: '',
    whyStop: '',
    whyTarget: '',
    followedStrategy: '',
    wouldChange: '',
    updatedAt: Date.now(),
  };
}
