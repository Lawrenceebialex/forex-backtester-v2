import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

interface SelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  className?: string;
}

/** Native <select> (best experience on phones and iPad) with the app's styling. */
export function Select({ label, value, onChange, children, className }: SelectProps) {
  return (
    <div className={cn('relative', className)}>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full appearance-none rounded-lg border border-line bg-surface pl-3 pr-9 text-sm text-ink outline-none transition-colors focus:border-accent coarse:h-11 coarse:text-base"
      >
        {children}
      </select>
      <ChevronDown size={16} aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle" />
    </div>
  );
}
