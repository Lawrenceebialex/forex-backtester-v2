import { Clock } from 'lucide-react';
import type { UnixSeconds } from '@/domain/market';
import { cn } from '@/lib/cn';
import { formatVirtualTime } from '@/lib/formatTime';

interface VirtualClockProps {
  time: UnixSeconds;
  progress: number;
  className?: string;
}

export function VirtualClock({ time, progress, className }: VirtualClockProps) {
  return (
    <div className={cn('flex items-center gap-2 font-mono text-[13px] tabular-nums text-ink', className)}>
      <Clock size={14} className="shrink-0 text-ink-subtle" aria-hidden />
      <time dateTime={new Date(time * 1000).toISOString()}>{formatVirtualTime(time)}</time>
      <span className="text-ink-subtle">UTC</span>
      <span className="ml-auto text-ink-muted md:ml-2">{Math.round(progress * 100)}%</span>
    </div>
  );
}
