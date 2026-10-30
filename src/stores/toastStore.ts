import { create } from 'zustand';

export type ToastTone = 'bull' | 'bear' | 'neutral';

export interface ToastInput {
  tone: ToastTone;
  title: string;
  description?: string;
}

export interface Toast extends ToastInput {
  id: number;
}

const AUTO_DISMISS_MS = 4500;
const MAX_VISIBLE = 3;

interface ToastState {
  toasts: Toast[];
  push: (toast: ToastInput) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToastStore = create<ToastState>()((set, get) => ({
  toasts: [],
  push: (input) => {
    const id = nextId++;
    set((state) => ({ toasts: [...state.toasts.slice(-(MAX_VISIBLE - 1)), { ...input, id }] }));
    window.setTimeout(() => get().dismiss(id), AUTO_DISMISS_MS);
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));
