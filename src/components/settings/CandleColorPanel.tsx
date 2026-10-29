import { Fragment } from 'react';
import { RotateCcw } from 'lucide-react';
import { CANDLE_PRESETS, matchPreset, type CandleColorKey } from '@/domain/candleColors';
import { cn } from '@/lib/cn';
import { useCandleColorsStore } from '@/stores/candleColorsStore';
import { CandleGlyph } from './CandleGlyph';
import { ColorField } from './ColorField';

const COLOR_ROWS: ReadonlyArray<{ label: string; up: CandleColorKey; down: CandleColorKey }> = [
  { label: 'Body', up: 'upBody', down: 'downBody' },
  { label: 'Wick', up: 'upWick', down: 'downWick' },
  { label: 'Border', up: 'upBorder', down: 'downBorder' },
];

const SECTION_TITLE = 'mb-2 text-[11px] font-medium uppercase tracking-wider text-ink-subtle';

export function CandleColorPanel() {
  const colors = useCandleColorsStore((state) => state.colors);
  const setColor = useCandleColorsStore((state) => state.setColor);
  const applyPreset = useCandleColorsStore((state) => state.applyPreset);
  const reset = useCandleColorsStore((state) => state.reset);
  const activePreset = matchPreset(colors);

  return (
    <div className="space-y-5 p-4">
      <div className="flex h-24 items-center justify-center rounded-xl border border-line bg-chart">
        <CandleGlyph colors={colors} className="h-16 w-24" />
      </div>

      <section aria-label="Presets">
        <h3 className={SECTION_TITLE}>Presets</h3>
        <div className="grid grid-cols-3 gap-2">
          {CANDLE_PRESETS.map((preset) => {
            const active = activePreset?.id === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                aria-pressed={active}
                onClick={() => applyPreset(preset.id)}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-xl border p-2.5 text-center transition-colors',
                  active ? 'border-accent bg-accent/10' : 'border-line bg-raised hover:border-line-strong',
                )}
              >
                <CandleGlyph colors={preset.colors} className="h-8 w-12" />
                <span className="text-[11px] font-medium leading-tight text-ink">{preset.name}</span>
                {preset.hint && <span className="text-[10px] leading-tight text-ink-subtle">{preset.hint}</span>}
              </button>
            );
          })}
          {!activePreset && (
            <div
              aria-current="true"
              className="flex flex-col items-center gap-1 rounded-xl border border-accent bg-accent/10 p-2.5 text-center"
            >
              <CandleGlyph colors={colors} className="h-8 w-12" />
              <span className="text-[11px] font-medium leading-tight text-ink">Custom</span>
            </div>
          )}
        </div>
      </section>

      <section aria-label="Custom colors">
        <h3 className={SECTION_TITLE}>Custom</h3>
        <div className="grid grid-cols-[3.5rem_1fr_1fr] items-center gap-x-2 gap-y-2">
          <span />
          <span className="text-xs font-medium text-bull">Up</span>
          <span className="text-xs font-medium text-bear">Down</span>
          {COLOR_ROWS.map((row) => (
            <Fragment key={row.label}>
              <span className="text-sm text-ink-muted">{row.label}</span>
              <ColorField label={`Up ${row.label.toLowerCase()}`} value={colors[row.up]} onChange={(hex) => setColor(row.up, hex)} />
              <ColorField label={`Down ${row.label.toLowerCase()}`} value={colors[row.down]} onChange={(hex) => setColor(row.down, hex)} />
            </Fragment>
          ))}
        </div>
      </section>

      <button
        type="button"
        onClick={reset}
        className="inline-flex h-9 items-center gap-2 rounded-lg px-2 text-sm text-ink-muted transition-colors hover:bg-overlay hover:text-ink coarse:h-11"
      >
        <RotateCcw size={15} />
        Reset to Classic
      </button>
    </div>
  );
}
