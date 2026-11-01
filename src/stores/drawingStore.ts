import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SYMBOL } from '@/data/marketData';
import { DRAWING_COLORS, TWO_POINT_KINDS, isDrawingKind, type ChartPoint, type Drawing, type DrawingTool, type NewDrawing } from '@/domain/drawings';

interface DrawingState {
  /** Saved drawings, kept in market time and price so they survive timeframe changes. */
  drawings: Drawing[];
  tool: DrawingTool;
  color: string;
  selectedId: string | null;

  setTool: (tool: DrawingTool) => void;
  /** Sets the color for new drawings, and recolors the selected one. */
  setColor: (color: string) => void;
  select: (id: string | null) => void;
  add: (drawing: NewDrawing) => void;
  update: (drawing: Drawing) => void;
  remove: (id: string) => void;
  removeSelected: () => void;
  /** Removes every drawing for the current symbol. */
  clearAll: () => void;
}

const isPoint = (value: unknown): value is ChartPoint => {
  const v = value as Partial<ChartPoint> | null;
  return typeof v === 'object' && v !== null && Number.isFinite(v.time) && Number.isFinite(v.price);
};

/** Guards against corrupted saves: only well-formed drawings are restored. */
const isDrawing = (value: unknown): value is Drawing => {
  const v = value as Partial<Drawing> | null;
  if (typeof v !== 'object' || v === null) return false;
  if (typeof v.id !== 'string' || typeof v.symbol !== 'string' || typeof v.color !== 'string' || !isDrawingKind(v.kind) || !isPoint(v.a)) return false;
  if (TWO_POINT_KINDS.includes(v.kind) && !isPoint(v.b)) return false;
  return v.kind !== 'text' || typeof v.text === 'string';
};

export const useDrawingStore = create<DrawingState>()(
  persist(
    (set, get) => ({
      drawings: [],
      tool: 'cursor',
      color: DRAWING_COLORS[0],
      selectedId: null,

      setTool: (tool) => set({ tool, selectedId: null }),
      setColor: (color) => {
        const { selectedId } = get();
        set((state) => ({
          color,
          drawings: selectedId ? state.drawings.map((d) => (d.id === selectedId ? { ...d, color } : d)) : state.drawings,
        }));
      },
      select: (selectedId) => set({ selectedId }),
      add: (drawing) =>
        set((state) => ({
          drawings: [...state.drawings, { ...drawing, id: `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, symbol: SYMBOL.symbol }],
        })),
      update: (drawing) => set((state) => ({ drawings: state.drawings.map((d) => (d.id === drawing.id ? drawing : d)) })),
      remove: (id) => set((state) => ({ drawings: state.drawings.filter((d) => d.id !== id), selectedId: state.selectedId === id ? null : state.selectedId })),
      removeSelected: () => {
        const { selectedId } = get();
        if (selectedId) get().remove(selectedId);
      },
      clearAll: () => set((state) => ({ drawings: state.drawings.filter((d) => d.symbol !== SYMBOL.symbol), selectedId: null })),
    }),
    {
      name: 'fb-drawings',
      version: 1,
      partialize: (state) => ({ drawings: state.drawings, color: state.color }),
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<DrawingState>;
        return {
          ...current,
          drawings: Array.isArray(saved.drawings) ? saved.drawings.filter(isDrawing) : [],
          color: typeof saved.color === 'string' ? saved.color : current.color,
        };
      },
    },
  ),
);
