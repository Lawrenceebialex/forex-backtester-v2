import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, children, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-overlay text-ink-subtle">
        <Icon size={22} />
      </span>
      <p className="text-base font-semibold text-ink">{title}</p>
      <p className="max-w-sm text-sm text-ink-muted">{children}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
