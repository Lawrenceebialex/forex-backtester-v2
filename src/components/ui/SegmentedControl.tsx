import { cn } from '@/lib/cn';

interface Option<T> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string | number> {
  /** Accessible name for the group. */
  label: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function SegmentedControl<T extends string | number>({
  label,
  options,
  value,
  onChange,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn('inline-flex shrink-0 items-center gap-0.5 rounded-lg border border-line bg-raised p-0.5', className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'h-8 min-w-9 rounded-md px-2.5 text-[13px] font-medium tabular-nums transition-colors',
              'coarse:h-10 coarse:min-w-11 coarse:px-3',
              active ? 'bg-accent text-accent-ink shadow-sm' : 'text-ink-muted hover:bg-overlay hover:text-ink',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
