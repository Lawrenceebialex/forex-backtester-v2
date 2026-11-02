import { useState } from 'react';
import { Layers } from 'lucide-react';
import { formatUtcHm, formatWatHm } from '@/data/sessions';
import { useChartOverlayStore } from '@/stores/chartOverlayStore';
import { cn } from '@/lib/cn';

export function ChartOverlaysMenu() {
  const [open, setOpen] = useState(false);
  const showSessions = useChartOverlayStore((s) => s.showSessions);
  const showKillzones = useChartOverlayStore((s) => s.showKillzones);
  const showMajorNews = useChartOverlayStore((s) => s.showMajorNews);
  const newsTradingMode = useChartOverlayStore((s) => s.newsTradingMode);
  const setShowSessions = useChartOverlayStore((s) => s.setShowSessions);
  const setShowKillzones = useChartOverlayStore((s) => s.setShowKillzones);
  const setShowMajorNews = useChartOverlayStore((s) => s.setShowMajorNews);
  const setNewsTradingMode = useChartOverlayStore((s) => s.setNewsTradingMode);
  const customCrosses = useChartOverlayStore((s) => s.customCrosses);
  const addCustomCross = useChartOverlayStore((s) => s.addCustomCross);
  const removeCustomCross = useChartOverlayStore((s) => s.removeCustomCross);
  const [hh, setHh] = useState('08');
  const [mm, setMm] = useState('30');
  const [label, setLabel] = useState('');

  const minuteUtc = (Number(hh) || 0) * 60 + (Number(mm) || 0);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex h-8 items-center gap-1 rounded-md border border-line px-2 text-xs text-ink-muted hover:bg-overlay',
          open && 'border-accent text-ink',
        )}
        title="Sessions, killzones, news"
      >
        <Layers size={14} />
        <span className="hidden sm:inline">Overlays</span>
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 w-72 rounded-lg border border-line bg-surface p-3 shadow-overlay">
          <Toggle label="Sessions" checked={showSessions} onChange={setShowSessions} />
          <Toggle label="Killzones" checked={showKillzones} onChange={setShowKillzones} />
          <Toggle label="Major news (NFP / CPI)" checked={showMajorNews} onChange={setShowMajorNews} />
          <Toggle
            label="News trading mode"
            checked={newsTradingMode}
            onChange={setNewsTradingMode}
          />
          <p className="mt-1 text-[10px] leading-snug text-ink-subtle">
            Wider simulated spread around news + stronger approaching alerts.
          </p>

          <div className="mt-3 border-t border-line pt-3">
            <p className="text-[11px] font-medium uppercase text-ink-subtle">Custom time line</p>
            <div className="mt-2 flex gap-1">
              <input
                value={hh}
                onChange={(e) => setHh(e.target.value)}
                className="h-8 w-12 rounded border border-line bg-raised px-1 text-center font-mono text-xs"
                placeholder="HH"
              />
              <span className="self-center text-ink-subtle">:</span>
              <input
                value={mm}
                onChange={(e) => setMm(e.target.value)}
                className="h-8 w-12 rounded border border-line bg-raised px-1 text-center font-mono text-xs"
                placeholder="MM"
              />
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="h-8 flex-1 rounded border border-line bg-raised px-2 text-xs"
                placeholder="Label"
              />
            </div>
            <p className="mt-1 font-mono text-[10px] text-ink-subtle">
              {formatUtcHm(minuteUtc)} · {formatWatHm(minuteUtc)}
            </p>
            <button
              type="button"
              onClick={() => {
                addCustomCross(label, minuteUtc);
                setLabel('');
              }}
              className="mt-2 h-8 w-full rounded-md border border-line text-xs text-ink"
            >
              Add line
            </button>
            {customCrosses.map((c) => (
              <div key={c.id} className="mt-1 flex items-center justify-between text-xs text-ink-muted">
                <span>
                  {c.label} · {formatUtcHm(c.minuteUtc)} · {formatWatHm(c.minuteUtc)}
                </span>
                <button type="button" onClick={() => removeCustomCross(c.id)} className="text-bear">
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between py-1.5 text-left text-sm text-ink"
    >
      {label}
      <span className={cn('h-5 w-9 rounded-full transition', checked ? 'bg-accent' : 'bg-line')}>
        <span
          className={cn(
            'mt-0.5 block h-4 w-4 rounded-full bg-white transition',
            checked ? 'translate-x-4' : 'translate-x-0.5',
          )}
        />
      </span>
    </button>
  );
}
