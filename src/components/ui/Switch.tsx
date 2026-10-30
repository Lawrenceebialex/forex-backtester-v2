import { cn } from '@/lib/cn';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

export function Switch({ checked, onChange, label }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors coarse:h-7 coarse:w-12',
        checked ? 'bg-accent' : 'bg-line-strong',
      )}
    >
      <span
        className={cn(
          'inline-block h-5 w-5 rounded-full bg-white shadow transition-transform coarse:h-6 coarse:w-6',
          checked ? 'translate-x-[1.125rem] coarse:translate-x-[1.375rem]' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}
