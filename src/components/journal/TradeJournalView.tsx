import { useMemo, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { SYMBOL } from '@/data/marketData';
import { SUGGESTED_TAGS } from '@/domain/journal';
import type { ClosedTrade } from '@/domain/trading';
import { formatMoney } from '@/lib/format';
import { formatVirtualTime } from '@/lib/formatTime';
import { rMultiple } from '@/lib/statistics';
import { cn } from '@/lib/cn';
import { useJournalStore } from '@/stores/journalStore';
import { useStrategyStore } from '@/stores/strategyStore';
import { useTradingStore } from '@/stores/tradingStore';
import { useUiStore } from '@/stores/uiStore';
import { EmptyState } from '@/components/ui/EmptyState';
import { Card } from '@/components/ui/Card';

function outcome(t: ClosedTrade): string {
  if (t.pnl > 0) return 'Win';
  if (t.pnl < 0) return 'Loss';
  return 'Breakeven';
}

export function TradeJournalView() {
  const trades = useTradingStore((s) => s.closedTrades);
  const strategies = useStrategyStore((s) => s.strategies);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const setView = useUiStore((s) => s.setView);

  const ordered = useMemo(() => [...trades].sort((a, b) => b.exitTime - a.exitTime), [trades]);
  const selected = ordered.find((t) => t.id === selectedId) ?? ordered[0] ?? null;

  if (trades.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6 pb-24 lg:px-8">
        <h1 className="text-xl font-semibold text-ink">Trade journal</h1>
        <Card className="mt-6">
          <EmptyState
            icon={BookOpen}
            title="No closed trades yet"
            action={
              <button
                type="button"
                onClick={() => setView('workspace')}
                className="h-9 rounded-md bg-accent px-3 text-sm font-medium text-accent-ink"
              >
                Open chart session
              </button>
            }
          >
            Close simulated trades in the workspace, then review them here with tags and reasoning.
          </EmptyState>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-4 px-4 py-6 pb-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:px-8">
      <div>
        <h1 className="text-xl font-semibold text-ink">Trade journal</h1>
        <p className="mt-1 text-sm text-ink-muted">Review decisions, not only P&amp;L.</p>
        <ul className="mt-4 max-h-[70vh] space-y-1 overflow-y-auto">
          {ordered.map((t) => {
            const active = (selected?.id ?? '') === t.id;
            const strat = strategies.find((s) => s.id === t.strategyId)?.name ?? '—';
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(t.id)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm',
                    active ? 'border-accent bg-accent/10' : 'border-line bg-surface hover:bg-raised',
                  )}
                >
                  <span>
                    <span className="font-medium text-ink">#{t.number}</span>
                    <span className="ml-2 text-ink-muted">
                      {t.side.toUpperCase()} · {strat}
                    </span>
                  </span>
                  <span
                    className={cn(
                      'font-mono text-xs tabular-nums',
                      t.pnl > 0 ? 'text-bull' : t.pnl < 0 ? 'text-bear' : 'text-ink-muted',
                    )}
                  >
                    {formatMoney(t.pnl)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {selected && <TradeDetail trade={selected} />}
    </div>
  );
}

function TradeDetail({ trade }: { trade: ClosedTrade }) {
  const entry = useJournalStore((s) => s.getEntry(trade.id));
  const updateEntry = useJournalStore((s) => s.updateEntry);
  const addTag = useJournalStore((s) => s.addTag);
  const removeTag = useJournalStore((s) => s.removeTag);
  const customTags = useJournalStore((s) => s.customTags);
  const addCustomTag = useJournalStore((s) => s.addCustomTag);
  const [tagInput, setTagInput] = useState('');
  const strategies = useStrategyStore((s) => s.strategies);
  const strat = strategies.find((s) => s.id === trade.strategyId)?.name ?? '—';
  const r = rMultiple(trade, SYMBOL);

  const field = (key: 'whyEntered' | 'confirmation' | 'whyStop' | 'whyTarget' | 'wouldChange' | 'notes', label: string, rows = 2) => (
    <label className="block">
      <span className="text-[11px] font-medium uppercase tracking-wide text-ink-subtle">{label}</span>
      <textarea
        rows={rows}
        value={String(entry[key] ?? '')}
        onChange={(e) => updateEntry(trade.id, { [key]: e.target.value })}
        className="mt-1 w-full rounded-md border border-line bg-raised px-3 py-2 text-sm text-ink outline-none focus:border-accent"
      />
    </label>
  );

  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-ink">
            Trade #{trade.number} · {trade.side.toUpperCase()}
          </h2>
          <p className="text-xs text-ink-muted">
            {strat} · {outcome(trade)} · {trade.reason}
          </p>
        </div>
        <p
          className={cn(
            'font-mono text-sm font-semibold tabular-nums',
            trade.pnl > 0 ? 'text-bull' : trade.pnl < 0 ? 'text-bear' : 'text-ink',
          )}
        >
          {formatMoney(trade.pnl)}
        </p>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-3">
        {(
          [
            ['Instrument', SYMBOL.symbol],
            ['Lots', String(trade.lots)],
            ['Entry', `${trade.entryPrice} @ ${formatVirtualTime(trade.entryTime)}`],
            ['Exit', `${trade.exitPrice} @ ${formatVirtualTime(trade.exitTime)}`],
            ['Stop', trade.stopLoss == null ? '—' : String(trade.stopLoss)],
            ['Target', trade.takeProfit == null ? '—' : String(trade.takeProfit)],
            ['Pips', trade.pips.toFixed(1)],
            ['R-multiple', r == null ? '—' : r.toFixed(2)],
          ] as const
        ).map(([k, v]) => (
          <div key={k}>
            <dt className="text-ink-subtle">{k}</dt>
            <dd className="font-mono tabular-nums text-ink">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-ink-subtle">Tags</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {entry.tags.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => removeTag(trade.id, t)}
              className="rounded-full border border-line bg-raised px-2 py-0.5 text-[11px] text-ink"
              title="Remove tag"
            >
              {t} ×
            </button>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {[...SUGGESTED_TAGS, ...customTags].filter((t) => !entry.tags.includes(t)).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                addTag(trade.id, t);
                addCustomTag(t);
              }}
              className="rounded-full border border-dashed border-line px-2 py-0.5 text-[11px] text-ink-muted hover:border-accent hover:text-ink"
            >
              + {t}
            </button>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="Custom tag"
            className="h-8 flex-1 rounded-md border border-line bg-raised px-2 text-xs text-ink outline-none focus:border-accent"
          />
          <button
            type="button"
            onClick={() => {
              addTag(trade.id, tagInput);
              addCustomTag(tagInput);
              setTagInput('');
            }}
            className="h-8 rounded-md border border-line px-2 text-xs text-ink"
          >
            Add
          </button>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <label className="block">
          <span className="text-[11px] font-medium uppercase tracking-wide text-ink-subtle">Setup category</span>
          <input
            value={entry.setupCategory}
            onChange={(e) => updateEntry(trade.id, { setupCategory: e.target.value })}
            className="mt-1 h-9 w-full rounded-md border border-line bg-raised px-3 text-sm text-ink outline-none focus:border-accent"
          />
        </label>
        <label className="block">
          <span className="text-[11px] font-medium uppercase tracking-wide text-ink-subtle">Trading session</span>
          <input
            value={entry.tradingSession}
            onChange={(e) => updateEntry(trade.id, { tradingSession: e.target.value })}
            placeholder="e.g. London, New York"
            className="mt-1 h-9 w-full rounded-md border border-line bg-raised px-3 text-sm text-ink outline-none focus:border-accent"
          />
        </label>
        {field('whyEntered', 'Why did you enter?')}
        {field('confirmation', 'What confirmation did you observe?')}
        {field('whyStop', 'Why this stop loss?')}
        {field('whyTarget', 'Why this take profit?')}
        <label className="block">
          <span className="text-[11px] font-medium uppercase tracking-wide text-ink-subtle">Followed strategy?</span>
          <select
            value={entry.followedStrategy}
            onChange={(e) =>
              updateEntry(trade.id, {
                followedStrategy: e.target.value as typeof entry.followedStrategy,
              })
            }
            className="mt-1 h-9 w-full rounded-md border border-line bg-raised px-3 text-sm text-ink outline-none focus:border-accent"
          >
            <option value="">—</option>
            <option value="yes">Yes</option>
            <option value="partial">Partial</option>
            <option value="no">No</option>
          </select>
        </label>
        {field('wouldChange', 'What would you change?')}
        {field('notes', 'Additional notes', 3)}
      </div>
    </div>
  );
}
