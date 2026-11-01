import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { emptyJournal, type TradeJournalEntry } from '@/domain/journal';

interface JournalState {
  entries: Record<string, TradeJournalEntry>;
  getEntry: (tradeId: string) => TradeJournalEntry;
  updateEntry: (tradeId: string, patch: Partial<TradeJournalEntry>) => void;
  addTag: (tradeId: string, tag: string) => void;
  removeTag: (tradeId: string, tag: string) => void;
  customTags: string[];
  addCustomTag: (tag: string) => void;
}

export const useJournalStore = create<JournalState>()(
  persist(
    (set, get) => ({
      entries: {},
      customTags: [],

      getEntry: (tradeId) => get().entries[tradeId] ?? emptyJournal(tradeId),

      updateEntry: (tradeId, patch) =>
        set((s) => {
          const prev = s.entries[tradeId] ?? emptyJournal(tradeId);
          return {
            entries: {
              ...s.entries,
              [tradeId]: { ...prev, ...patch, tradeId, updatedAt: Date.now() },
            },
          };
        }),

      addTag: (tradeId, tag) => {
        const cleaned = tag.trim();
        if (!cleaned) return;
        const prev = get().getEntry(tradeId);
        if (prev.tags.includes(cleaned)) return;
        get().updateEntry(tradeId, { tags: [...prev.tags, cleaned] });
      },

      removeTag: (tradeId, tag) => {
        const prev = get().getEntry(tradeId);
        get().updateEntry(tradeId, { tags: prev.tags.filter((t) => t !== tag) });
      },

      addCustomTag: (tag) => {
        const cleaned = tag.trim();
        if (!cleaned) return;
        set((s) => (s.customTags.includes(cleaned) ? s : { customTags: [...s.customTags, cleaned] }));
      },
    }),
    { name: 'fb-journal' },
  ),
);
