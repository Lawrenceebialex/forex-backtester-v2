import { cn } from '@/lib/cn';
import { useUiStore } from '@/stores/uiStore';
import { NAV_ITEMS } from './navItems';

/** Top navigation for iPad and desktop (phones use the bottom tab bar). */
export function NavTabs() {
  const view = useUiStore((state) => state.view);
  const setView = useUiStore((state) => state.setView);

  return (
    <nav aria-label="Main" className="hidden items-stretch gap-1 self-stretch md:flex">
      {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
        const active = view === id;
        return (
          <button
            key={id}
            type="button"
            aria-current={active ? 'page' : undefined}
            onClick={() => setView(id)}
            className={cn(
              'relative inline-flex items-center gap-2 px-3 text-[13px] font-medium transition-colors',
              active ? 'text-ink' : 'text-ink-muted hover:text-ink',
            )}
          >
            <Icon size={16} />
            {label}
            {active && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-accent" />}
          </button>
        );
      })}
    </nav>
  );
}
