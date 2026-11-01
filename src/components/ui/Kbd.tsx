import type { ReactNode } from 'react';

/** A keyboard key cap. */
export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-line-strong bg-raised px-1.5 font-mono text-[11px] font-medium text-ink shadow-[0_1px_0_rgb(var(--line-strong))]">
      {children}
    </kbd>
  );
}
