import { cn } from '@/lib/cn';
import { useUiStore } from '@/stores/uiStore';
import { NAV_ITEMS } from './navItems';

/** Thumb-reach tab bar for phones; respects the home-indicator safe area. */
export function BottomNav() {
  const view = useUiStore((state) => state.view);
  const setView = useUiStore((state) => state.setView);

  return (
    <nav aria-label="Main" className="shrink-0 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
      <ul className="grid grid-cols-4">
        {NAV_ITEMS.map(({ id, shortLabel, label, icon: Icon }) => {
          const active = view === id;
          return (
            <li key={id}>
              <button
                type="button"
                aria-label={label}
                aria-current={active ? 'page' : undefined}
                onClick={() => setView(id)}
                className={cn(
                  'flex h-14 w-full flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors active:bg-overlay',
                  active ? 'text-accent' : 'text-ink-subtle',
                )}
              >
                <Icon size={20} strokeWidth={active ? 2.25 : 1.75} />
                {shortLabel}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
