import { useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';

/**
 * Drag a bottom sheet's handle downwards to close it. Spread `handlers` on the handle and
 * apply `style` to the sheet; releasing past `threshold` pixels calls `onDismiss`.
 */
export function useSwipeToDismiss(onDismiss: () => void, threshold = 90) {
  const [offset, setOffset] = useState(0);
  const startY = useRef<number | null>(null);
  const offsetRef = useRef(0);

  const move = (value: number) => {
    offsetRef.current = value;
    setOffset(value);
  };
  const end = () => {
    if (startY.current === null) return;
    startY.current = null;
    const shouldClose = offsetRef.current > threshold;
    move(0);
    if (shouldClose) onDismiss();
  };

  const handlers = {
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => {
      startY.current = event.clientY;
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    onPointerMove: (event: ReactPointerEvent<HTMLElement>) => {
      if (startY.current !== null) move(Math.max(0, event.clientY - startY.current));
    },
    onPointerUp: end,
    onPointerCancel: end,
  };
  const style: CSSProperties | undefined = offset > 0 ? { transform: `translateY(${offset}px)`, transition: 'none' } : undefined;
  return { handlers, style };
}
