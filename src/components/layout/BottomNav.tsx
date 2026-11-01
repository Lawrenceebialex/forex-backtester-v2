import { cn } from '@/lib/cn';
import { useUiStore } from '@/stores/uiStore';
import { MOBILE_NAV } from './navItems';

export function BottomNav() {
  const view = useUiStore((s) => s.view);
  const setView = useUiStore((s) => s.setView);

  return (
    <nav
      className="flex shrink-0 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
      aria-label="Primary"
    >
      {MOBILE_NAV.map(({ id, shortLabel, icon: Icon }) => {
        const active = view === id || (id === 'analytics' && view === 'comparison');
        return (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            className={cn(
              'flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium',
              active ? 'text-accent' : 'text-ink-subtle',
            )}
          >
            <Icon size={18} />
            {shortLabel}
          </button>
        );
      })}
    </nav>
  );
}
