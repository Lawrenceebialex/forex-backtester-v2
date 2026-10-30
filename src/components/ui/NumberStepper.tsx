import { useEffect, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { clamp, roundTo } from '@/lib/math';
import { cn } from '@/lib/cn';
import { IconButton } from './IconButton';

interface NumberStepperProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  decimals: number;
  onChange: (value: number) => void;
  className?: string;
}

/** [−] value [+] — type a number (committed on blur / Enter) or nudge it. Always emits a valid, clamped value. */
export function NumberStepper({ label, value, min, max, step, decimals, onChange, className }: NumberStepperProps) {
  const [draft, setDraft] = useState(value.toFixed(decimals));
  useEffect(() => setDraft(value.toFixed(decimals)), [value, decimals]);

  const emit = (next: number) => {
    const valid = clamp(roundTo(next, decimals), min, max);
    setDraft(valid.toFixed(decimals));
    onChange(valid);
  };

  const commit = () => {
    const parsed = Number(draft.replace(',', '.'));
    if (draft.trim() !== '' && Number.isFinite(parsed)) emit(parsed);
    else setDraft(value.toFixed(decimals));
  };

  return (
    <div className={cn('flex items-center rounded-lg border border-line bg-surface transition-colors focus-within:border-accent', className)}>
      <IconButton label={`Decrease ${label}`} onClick={() => emit(value - step)} disabled={value <= min} className="rounded-r-none">
        <Minus size={16} />
      </IconButton>
      <input
        type="text"
        inputMode="decimal"
        value={draft}
        aria-label={label}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => event.key === 'Enter' && commit()}
        className="h-9 min-w-0 flex-1 bg-transparent text-center font-mono text-sm tabular-nums text-ink outline-none coarse:h-11 coarse:text-base"
      />
      <IconButton label={`Increase ${label}`} onClick={() => emit(value + step)} disabled={value >= max} className="rounded-l-none">
        <Plus size={16} />
      </IconButton>
    </div>
  );
}
