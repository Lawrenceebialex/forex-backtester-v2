import { useState } from 'react';
import { Pencil, Trash2, X } from 'lucide-react';
import { DRAWING_COLORS } from '@/domain/drawings';
import { SYMBOL } from '@/data/marketData';
import { cn } from '@/lib/cn';
import { useDrawingStore } from '@/stores/drawingStore';
import { DRAWING_TOOLS } from './tools';

const BUTTON = 'flex h-9 w-9 items-center justify-center rounded-lg transition-colors coarse:h-11 coarse:w-11';

/**
 * Drawing tools rail on the left of the chart. Open by default from iPad width up;
 * on phones it starts collapsed so the chart keeps the room.
 */
export function DrawingToolbar() {
  const tool = useDrawingStore((state) => state.tool);
  const color = useDrawingStore((state) => state.color);
  const setTool = useDrawingStore((state) => state.setTool);
  const setColor = useDrawingStore((state) => state.setColor);
  const count = useDrawingStore((state) => state.drawings.filter((d) => d.symbol === SYMBOL.symbol).length);
  const clearAll = useDrawingStore((state) => state.clearAll);
  const [open, setOpen] = useState(() => window.matchMedia('(min-width: 768px)').matches);
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="absolute left-2 top-14 z-20 flex max-h-[calc(100%-5.5rem)] flex-col items-start gap-1.5">
      <button
        type="button"
        aria-label={open ? 'Hide drawing tools' : 'Show drawing tools'}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={cn(BUTTON, 'border border-line bg-surface/95 text-ink-muted shadow-overlay hover:text-ink', open && 'text-accent')}
      >
        {open ? <X size={17} /> : <Pencil size={17} />}
      </button>

      {open && (
        <div role="toolbar" aria-label="Drawing tools" className="no-scrollbar flex min-h-0 flex-col gap-0.5 overflow-y-auto rounded-xl border border-line bg-surface/95 p-1 shadow-overlay">
          {DRAWING_TOOLS.map((item) => (
            <button
              key={item.id}
              type="button"
              title={item.label}
              aria-label={item.label}
              aria-pressed={tool === item.id}
              onClick={() => setTool(tool === item.id && item.id !== 'cursor' ? 'cursor' : item.id)}
              className={cn(BUTTON, tool === item.id ? 'bg-accent text-accent-ink' : 'text-ink-muted hover:bg-overlay hover:text-ink active:scale-95')}
            >
              {item.icon}
            </button>
          ))}

          <div className="my-1 h-px bg-line" />
          <div className="grid grid-cols-2 gap-1 p-0.5" role="group" aria-label="Drawing color">
            {DRAWING_COLORS.map((swatch) => (
              <button
                key={swatch}
                type="button"
                aria-label={`Color ${swatch}`}
                aria-pressed={color === swatch}
                onClick={() => setColor(swatch)}
                className={cn('flex h-[18px] w-[18px] items-center justify-center rounded-full ring-offset-1 ring-offset-surface transition coarse:h-6 coarse:w-6', color === swatch && 'ring-2 ring-ink')}
                style={{ backgroundColor: swatch }}
              />
            ))}
          </div>

          <div className="my-1 h-px bg-line" />
          {confirming ? (
            <button
              type="button"
              onClick={() => {
                clearAll();
                setConfirming(false);
              }}
              onBlur={() => setConfirming(false)}
              autoFocus
              aria-label={`Confirm removing ${count} drawings`}
              className={cn(BUTTON, 'bg-bear text-white')}
            >
              <Trash2 size={17} />
            </button>
          ) : (
            <button
              type="button"
              title="Remove all drawings"
              aria-label="Remove all drawings"
              disabled={count === 0}
              onClick={() => setConfirming(true)}
              className={cn(BUTTON, 'text-ink-muted hover:bg-overlay hover:text-bear disabled:pointer-events-none disabled:opacity-35')}
            >
              <Trash2 size={17} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
