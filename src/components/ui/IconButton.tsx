import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible name; also shown as the tooltip. */
  label: string;
  active?: boolean;
}

export function IconButton({ label, active, className, children, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-muted transition',
        'hover:bg-overlay hover:text-ink active:scale-95 disabled:pointer-events-none disabled:opacity-40',
        'coarse:h-11 coarse:w-11',
        active && 'bg-overlay text-ink',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
