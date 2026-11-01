import type { ComponentType } from 'react';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useUiStore, type AppView } from '@/stores/uiStore';
import { Logo } from './Logo';
import { PRIMARY_NAV, SECONDARY_NAV } from './navItems';
import { ThemeToggle } from './ThemeToggle';

function NavButton({
  id,
  label,
  icon: Icon,
  active,
  onClick,
  emphasize,
}: {
  id: AppView;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  active: boolean;
  onClick: () => void;
  emphasize?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] font-medium transition',
        emphasize && !active && 'bg-accent text-accent-ink hover:brightness-110',
        emphasize && active && 'bg-accent text-accent-ink',
        !emphasize && active && 'bg-overlay text-ink',
        !emphasize && !active && 'text-ink-muted hover:bg-overlay/70 hover:text-ink',
      )}
    >
      <Icon size={16} className="shrink-0 opacity-90" />
      <span className="truncate">{label}</span>
    </button>
  );
}

export function Sidebar() {
  const view = useUiStore((s) => s.view);
  const setView = useUiStore((s) => s.setView);
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen);

  const go = (id: AppView) => {
    setView(id);
    setSidebarOpen(false);
  };

  const body = (
    <div className="flex h-full w-[220px] flex-col border-r border-line bg-surface">
      <div className="flex h-12 items-center gap-2 border-b border-line px-3">
        <Logo />
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold tracking-tight text-ink">Forex Backtester</p>
          <p className="truncate text-[10px] uppercase tracking-wider text-ink-subtle">Test · Analyse · Improve</p>
        </div>
        <button
          type="button"
          className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-overlay lg:hidden"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-2.5">
        <div>
          <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-ink-subtle">Workspace</p>
          <div className="space-y-0.5">
            {PRIMARY_NAV.filter((i) => i.id === 'new-backtest').map((item) => (
              <NavButton
                key={item.id}
                id={item.id}
                label={item.label}
                icon={item.icon}
                active={view === item.id}
                onClick={() => go(item.id)}
                emphasize
              />
            ))}
            {PRIMARY_NAV.filter((i) => i.id !== 'new-backtest' && i.id !== 'settings').map((item) => (
              <NavButton
                key={item.id}
                id={item.id}
                label={item.label}
                icon={item.icon}
                active={view === item.id || (item.id === 'analytics' && view === 'comparison')}
                onClick={() => go(item.id)}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-ink-subtle">Lab</p>
          <div className="space-y-0.5">
            {SECONDARY_NAV.map((item) => (
              <NavButton
                key={item.id}
                id={item.id}
                label={item.label}
                icon={item.icon}
                active={view === item.id}
                onClick={() => go(item.id)}
              />
            ))}
            <NavButton
              id="workspace"
              label="Open chart session"
              icon={PRIMARY_NAV[1].icon}
              active={view === 'workspace'}
              onClick={() => go('workspace')}
            />
          </div>
        </div>
      </div>

      <div className="space-y-1 border-t border-line p-2.5">
        <NavButton
          id="settings"
          label="Settings"
          icon={PRIMARY_NAV.find((i) => i.id === 'settings')!.icon}
          active={view === 'settings'}
          onClick={() => go('settings')}
        />
        <div className="flex items-center justify-between px-1 pt-1">
          <span className="text-[11px] text-ink-subtle">Appearance</span>
          <ThemeToggle />
        </div>
        <p className="px-1 pt-1 text-[10px] leading-snug text-ink-subtle">
          Data is stored on this device only until cloud accounts are added.
        </p>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden shrink-0 lg:block">{body}</aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close menu overlay"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 shadow-overlay animate-fade-in">{body}</div>
        </div>
      )}
    </>
  );
}

export function MobileMenuButton() {
  const toggle = useUiStore((s) => s.toggleSidebar);
  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-muted hover:bg-overlay lg:hidden"
      aria-label="Open navigation"
    >
      <Menu size={18} />
    </button>
  );
}
