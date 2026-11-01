import { SHORTCUT_HELP, type ShortcutHelp } from '@/lib/shortcuts';
import { useUiStore } from '@/stores/uiStore';
import { Kbd } from '@/components/ui/Kbd';
import { Overlay } from '@/components/ui/Overlay';

const GROUPS: ShortcutHelp['group'][] = ['Replay', 'Trading', 'Chart', 'App'];

export function ShortcutsPanel() {
  const open = useUiStore((state) => state.dialog === 'shortcuts');
  const closeDialog = useUiStore((state) => state.closeDialog);

  return (
    <Overlay open={open} onClose={closeDialog} title="Keyboard shortcuts" variant="modal">
      <div className="grid gap-x-8 gap-y-5 p-4 md:grid-cols-2">
        {GROUPS.map((group) => (
          <section key={group}>
            <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-ink-subtle">{group}</h3>
            <ul className="space-y-2">
              {SHORTCUT_HELP.filter((item) => item.group === group).map((item) => (
                <li key={item.label} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-ink-muted">{item.label}</span>
                  <span className="flex shrink-0 gap-1">
                    {item.keys.map((key) => (key === '…' ? <span key={key} className="text-ink-subtle">…</span> : <Kbd key={key}>{key}</Kbd>))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <p className="text-xs text-ink-subtle md:col-span-2">Shortcuts pause while you type in a field or while a dialog is open. Press ? any time to see this list.</p>
      </div>
    </Overlay>
  );
}
