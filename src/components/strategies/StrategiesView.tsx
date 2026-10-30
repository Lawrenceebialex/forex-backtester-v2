import { useMemo, useState } from 'react';
import { Archive, ArchiveRestore, Check, Pencil, Plus, X } from 'lucide-react';
import { SYMBOL } from '@/data/marketData';
import { MAX_STRATEGY_NAME_LENGTH, type Strategy } from '@/domain/strategy';
import { cn } from '@/lib/cn';
import { formatPercent, formatSignedMoney, pnlTone } from '@/lib/format';
import { computeStatistics } from '@/lib/statistics';
import { useStrategyStore } from '@/stores/strategyStore';
import { useTradingStore } from '@/stores/tradingStore';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';

const FIELD =
  'h-10 min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-subtle focus:border-accent coarse:h-11 coarse:text-base';
const ACTION =
  'inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong px-3 text-[13px] text-ink-muted transition-colors hover:bg-overlay hover:text-ink coarse:h-11';

function StrategyCard({ strategy, active }: { strategy: Strategy; active: boolean }) {
  const closedTrades = useTradingStore((state) => state.closedTrades);
  const initialBalance = useTradingStore((state) => state.settings.initialBalance);
  const renameStrategy = useStrategyStore((state) => state.renameStrategy);
  const archiveStrategy = useStrategyStore((state) => state.archiveStrategy);
  const restoreStrategy = useStrategyStore((state) => state.restoreStrategy);
  const setActive = useStrategyStore((state) => state.setActive);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(strategy.name);
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(
    () => computeStatistics(closedTrades.filter((trade) => trade.strategyId === strategy.id), initialBalance, SYMBOL),
    [closedTrades, strategy.id, initialBalance],
  );

  const save = () => {
    const result = renameStrategy(strategy.id, draft);
    if (result.ok) {
      setEditing(false);
      setError(null);
    } else {
      setError(result.error);
    }
  };
  const cancel = () => {
    setEditing(false);
    setError(null);
    setDraft(strategy.name);
  };

  return (
    <li className={cn('rounded-xl border bg-surface p-4', active ? 'border-accent' : 'border-line')}>
      <div className="flex items-start gap-3">
        <span className="mt-1.5 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: strategy.color }} />
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={draft}
                maxLength={MAX_STRATEGY_NAME_LENGTH}
                aria-label="Strategy name"
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') save();
                  if (event.key === 'Escape') cancel();
                }}
                className={FIELD}
              />
              <IconButton label="Save name" onClick={save}>
                <Check size={17} />
              </IconButton>
              <IconButton label="Cancel" onClick={cancel}>
                <X size={17} />
              </IconButton>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-base font-semibold text-ink">{strategy.name}</h3>
              {active && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">Active</span>}
              {strategy.archived && <span className="rounded-full bg-overlay px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Archived</span>}
            </div>
          )}
          {error && <p role="alert" className="mt-1.5 text-xs text-bear">{error}</p>}

          <dl className="mt-3 grid grid-cols-3 gap-3">
            <div>
              <dt className="text-[11px] text-ink-subtle">Trades</dt>
              <dd className="font-mono text-sm tabular-nums text-ink">{stats.trades}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-ink-subtle">Net profit</dt>
              <dd className={cn('font-mono text-sm tabular-nums', pnlTone(stats.netProfit))}>{stats.trades ? formatSignedMoney(stats.netProfit) : '—'}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-ink-subtle">Win rate</dt>
              <dd className="font-mono text-sm tabular-nums text-ink">{stats.winRate === null ? '—' : formatPercent(stats.winRate, 0)}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!strategy.archived && !active && (
          <button type="button" onClick={() => setActive(strategy.id)} className="h-9 rounded-lg bg-accent px-3 text-[13px] font-medium text-accent-ink transition hover:brightness-110 coarse:h-11">
            Make active
          </button>
        )}
        {!editing && (
          <button type="button" onClick={() => setEditing(true)} className={ACTION}>
            <Pencil size={14} /> Rename
          </button>
        )}
        {strategy.archived ? (
          <button type="button" onClick={() => restoreStrategy(strategy.id)} className={ACTION}>
            <ArchiveRestore size={14} /> Restore
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              const result = archiveStrategy(strategy.id);
              if (!result.ok) setError(result.error);
            }}
            className={ACTION}
          >
            <Archive size={14} /> Archive
          </button>
        )}
      </div>
    </li>
  );
}

export function StrategiesView() {
  const strategies = useStrategyStore((state) => state.strategies);
  const activeId = useStrategyStore((state) => state.activeId);
  const createStrategy = useStrategyStore((state) => state.createStrategy);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const current = strategies.filter((strategy) => !strategy.archived);
  const archived = strategies.filter((strategy) => strategy.archived);

  const create = () => {
    const result = createStrategy(name);
    if (result.ok) {
      setName('');
      setError(null);
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-3 md:space-y-5 md:p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">Strategies</h1>
        <p className="text-sm text-ink-muted">Every new trade is tagged with the active strategy, so you can see how each approach performs.</p>
      </div>

      <Card title="New strategy">
        <div className="flex gap-2">
          <input
            value={name}
            maxLength={MAX_STRATEGY_NAME_LENGTH}
            placeholder="e.g. London breakout"
            aria-label="New strategy name"
            onChange={(event) => {
              setName(event.target.value);
              setError(null);
            }}
            onKeyDown={(event) => event.key === 'Enter' && create()}
            className={FIELD}
          />
          <button type="button" onClick={create} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-accent-ink transition hover:brightness-110 coarse:h-11">
            <Plus size={16} /> Create
          </button>
        </div>
        {error && <p role="alert" className="mt-2 text-xs text-bear">{error}</p>}
        <p className="mt-2 text-xs text-ink-subtle">A new strategy becomes the active one right away.</p>
      </Card>

      <ul className="space-y-3">
        {current.map((strategy) => (
          <StrategyCard key={strategy.id} strategy={strategy} active={strategy.id === activeId} />
        ))}
      </ul>

      {archived.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-[11px] font-medium uppercase tracking-wider text-ink-subtle">Archived</h2>
          <ul className="space-y-3">
            {archived.map((strategy) => (
              <StrategyCard key={strategy.id} strategy={strategy} active={false} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
