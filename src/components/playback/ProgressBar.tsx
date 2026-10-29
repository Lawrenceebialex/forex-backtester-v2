import { cn } from '@/lib/cn';

/** Read-only replay progress (0–1). */
export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div
      role="progressbar"
      aria-label="Replay progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
      className={cn('h-1.5 overflow-hidden rounded-full bg-overlay', className)}
    >
      <div className="h-full rounded-full bg-accent" style={{ width: `${value * 100}%` }} />
    </div>
  );
}
