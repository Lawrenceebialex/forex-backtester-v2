import type { PersistStorage, StorageValue } from 'zustand/middleware';

/**
 * localStorage for stores that change many times a second (the replay clock, the live account).
 * Serialising is deferred and throttled, so playback never pays for it on every frame; the latest
 * state is also flushed when the page is hidden or closed.
 */
export function createThrottledStorage<S>(intervalMs = 500): PersistStorage<S> {
  let pending: { name: string; value: StorageValue<S> } | null = null;
  let timer: number | undefined;

  const flush = () => {
    window.clearTimeout(timer);
    timer = undefined;
    if (!pending) return;
    try {
      localStorage.setItem(pending.name, JSON.stringify(pending.value));
    } catch {
      // Storage full or unavailable: the app keeps working, just without saving.
    }
    pending = null;
  };
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flush());

  return {
    getItem: (name) => {
      try {
        const raw = localStorage.getItem(name);
        return raw ? (JSON.parse(raw) as StorageValue<S>) : null;
      } catch {
        return null;
      }
    },
    setItem: (name, value) => {
      pending = { name, value };
      if (timer === undefined) timer = window.setTimeout(flush, intervalMs);
    },
    removeItem: (name) => localStorage.removeItem(name),
  };
}
