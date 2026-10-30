import { Info, TrendingDown, TrendingUp, X } from 'lucide-react';
import { useToastStore, type ToastTone } from '@/stores/toastStore';
import { IconButton } from './IconButton';

const TONES: Record<ToastTone, { icon: typeof Info; badge: string }> = {
  bull: { icon: TrendingUp, badge: 'bg-bull/15 text-bull' },
  bear: { icon: TrendingDown, badge: 'bg-bear/15 text-bear' },
  neutral: { icon: Info, badge: 'bg-overlay text-ink-muted' },
};

/** Non-intrusive notifications: top of the screen under the header, never over the playback controls. */
export function ToastViewport() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-3 top-[calc(env(safe-area-inset-top)+3.75rem)] z-[60] flex flex-col gap-2 md:inset-x-auto md:right-4 md:w-[360px]"
    >
      {toasts.map((toast) => {
        const { icon: Icon, badge } = TONES[toast.tone];
        return (
          <div
            key={toast.id}
            role="status"
            className="pointer-events-auto flex animate-pop-in items-start gap-3 rounded-xl border border-line bg-surface p-3 shadow-overlay"
          >
            <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${badge}`}>
              <Icon size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">{toast.title}</p>
              {toast.description && <p className="mt-0.5 font-mono text-xs tabular-nums text-ink-muted">{toast.description}</p>}
            </div>
            <IconButton label="Dismiss" onClick={() => dismiss(toast.id)} className="-mr-1 -mt-1 h-8 w-8">
              <X size={15} />
            </IconButton>
          </div>
        );
      })}
    </div>
  );
}
