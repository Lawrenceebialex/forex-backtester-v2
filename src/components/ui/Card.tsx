import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface CardProps {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Card({ title, action, children, className }: CardProps) {
  return (
    <section className={cn('rounded-xl border border-line bg-surface p-4', className)}>
      {(title || action) && (
        <div className="mb-3 flex min-h-8 items-center justify-between gap-3">
          {title && <h2 className="text-sm font-semibold text-ink">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
