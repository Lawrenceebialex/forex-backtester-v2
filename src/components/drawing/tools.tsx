import type { ReactNode } from 'react';
import { Eraser, MousePointer2, Ruler, Type } from 'lucide-react';
import type { DrawingTool } from '@/domain/drawings';

const svg = (children: ReactNode) => (
  <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {children}
  </svg>
);

export interface ToolDef {
  id: DrawingTool;
  label: string;
  icon: ReactNode;
  /** One-line instruction shown while the tool is active. */
  hint: string;
}

export const DRAWING_TOOLS: readonly ToolDef[] = [
  { id: 'cursor', label: 'Select', icon: <MousePointer2 size={18} />, hint: 'Click a drawing to select it, drag it to move, press Delete to remove.' },
  { id: 'trend', label: 'Trend line', icon: svg(<><path d="M3.5 15.5 16.5 4.5" /><circle cx="3.5" cy="15.5" r="1.4" /><circle cx="16.5" cy="4.5" r="1.4" /></>), hint: 'Drag from the start to the end of the line, or tap the two points.' },
  { id: 'ray', label: 'Ray', icon: svg(<><path d="M3.5 15.5 18 5" /><circle cx="3.5" cy="15.5" r="1.4" /><path d="m14.5 4.5 3.5.5-.5 3.5" /></>), hint: 'Drag to set the start and direction; the line continues to the right.' },
  { id: 'hline', label: 'Horizontal line', icon: svg(<><path d="M2.5 10h15" /><circle cx="10" cy="10" r="1.4" /></>), hint: 'Click a price level.' },
  { id: 'vline', label: 'Vertical line', icon: svg(<><path d="M10 2.5v15" /><circle cx="10" cy="10" r="1.4" /></>), hint: 'Click a moment in time.' },
  { id: 'fib', label: 'Fibonacci retracement', icon: svg(<><path d="M3 4h14M3 8h14M3 12h14M3 16h14" strokeWidth="1.2" /><path d="M5 16 15 4" strokeDasharray="2 2" /></>), hint: 'Drag from the swing start to the swing end.' },
  { id: 'rect', label: 'Rectangle', icon: svg(<rect x="3.5" y="5" width="13" height="10" rx="1.2" />), hint: 'Drag from one corner to the opposite corner.' },
  { id: 'text', label: 'Text', icon: <Type size={18} />, hint: 'Click where the note should go.' },
  { id: 'measure', label: 'Measure', icon: <Ruler size={18} />, hint: 'Drag to measure price, pips, percent, candles and time.' },
  { id: 'eraser', label: 'Eraser', icon: <Eraser size={18} />, hint: 'Click a drawing to delete it.' },
];
