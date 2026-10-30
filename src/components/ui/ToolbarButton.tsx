import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

interface ToolbarButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  active?: boolean;
}

/** Compact toolbar action: icon only on phones, icon + text from iPad portrait up. */
export function ToolbarButton({ icon: Icon, label, onClick, active }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        'inline-flex h-8 shrink-0 items-center gap-2 rounded-lg border px-2.5 text-[13px] font-medium transition-colors coarse:h-10',
        active ? 'border-accent bg-accent/10 text-accent' : 'border-line bg-raised text-ink-muted hover:bg-overlay hover:text-ink',
      )}
    >
      <Icon size={15} />
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}
