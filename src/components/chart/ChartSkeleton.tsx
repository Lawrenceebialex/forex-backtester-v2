import { AlertTriangle } from 'lucide-react';

/** Placeholder while price history loads (or if it fails). */
export function ChartSkeleton({ error }: { error: boolean }) {
  if (error) {
    return (
      <div role="alert" className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 bg-chart px-6 text-center">
        <AlertTriangle size={22} className="text-warn" />
        <p className="text-sm font-semibold text-ink">Couldn't load price history</p>
        <p className="max-w-xs text-xs text-ink-muted">Check your connection and reload the page. Your account, trades and drawings are safe.</p>
      </div>
    );
  }
  const heights = [38, 52, 44, 66, 58, 72, 49, 61, 80, 68, 55, 74, 63, 47, 58, 70, 84, 76];
  return (
    <div role="status" aria-label="Loading price history" className="absolute inset-0 z-30 flex items-end gap-1.5 bg-chart px-6 pb-16 pt-20">
      {heights.map((height, i) => (
        <div key={i} className="skeleton flex-1 rounded-sm" style={{ height: `${height}%`, animationDelay: `${i * 60}ms` }} />
      ))}
    </div>
  );
}
