import type { ReactNode } from 'react';

interface PanelSectionProps {
  title: string;
  badge?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}

export function PanelSection({ title, badge, action, children }: PanelSectionProps) {
  return (
    <section className="rounded-xl border border-line bg-raised/60 p-3.5">
      <div className="mb-3 flex min-h-6 items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-[11px] font-medium uppercase tracking-wider text-ink-subtle">{title}</h3>
          {badge !== undefined && (
            <span className="rounded-full bg-overlay px-1.5 py-0.5 font-mono text-[10px] font-medium tabular-nums text-ink-muted">
              {badge}
            </span>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
