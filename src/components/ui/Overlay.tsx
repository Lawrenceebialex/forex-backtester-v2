import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useSwipeToDismiss } from '@/hooks/useSwipeToDismiss';
import { cn } from '@/lib/cn';
import { IconButton } from './IconButton';

interface OverlayProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /**
   * `popover` (default): bottom sheet on phones, a card under the header from iPad portrait up.
   * `modal`: bottom sheet on phones, a centred dialog from iPad portrait up.
   */
  variant?: 'popover' | 'modal';
}

/** One dialog, two presentations chosen by CSS alone. On phones the handle can be dragged down to close. */
export function Overlay({ open, onClose, title, children, variant = 'popover' }: OverlayProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const swipe = useSwipeToDismiss(onClose);
  const modal = variant === 'modal';

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className={cn('fixed inset-0 z-50', modal && 'flex items-end md:items-center md:justify-center')}>
      <div className={cn('absolute inset-0 animate-fade-in bg-black/50', modal ? 'md:bg-black/55' : 'md:bg-transparent')} onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        style={swipe.style}
        className={cn(
          'animate-sheet-up overflow-y-auto overscroll-contain rounded-t-2xl border border-line bg-surface pb-[env(safe-area-inset-bottom)] shadow-overlay outline-none md:animate-pop-in md:rounded-2xl',
          modal
            ? 'relative max-h-[92dvh] w-full md:max-h-[82dvh] md:max-w-[700px]'
            : 'absolute inset-x-0 bottom-0 max-h-[88dvh] md:inset-x-auto md:bottom-auto md:right-4 md:top-16 md:w-[400px]',
        )}
      >
        <div className="sticky top-0 z-10 bg-surface">
          <div {...swipe.handlers} className="flex touch-none justify-center pb-1 pt-2 md:hidden" aria-hidden>
            <span className="h-1 w-10 rounded-full bg-line-strong" />
          </div>
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <h2 className="text-sm font-semibold text-ink">{title}</h2>
            <IconButton label="Close" onClick={onClose} className="-mr-2">
              <X size={18} />
            </IconButton>
          </div>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
