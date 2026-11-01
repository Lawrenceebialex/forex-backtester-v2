import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import { useTradingStore } from '@/stores/tradingStore';

const LINKS: { tab: 'general' | 'chart' | 'trading' | 'challenge'; title: string; blurb: string }[] = [
  { tab: 'general', title: 'General', blurb: 'Theme and workspace defaults.' },
  { tab: 'chart', title: 'Chart appearance', blurb: 'Candle colours and chart preferences.' },
  { tab: 'trading', title: 'Trading preferences', blurb: 'Demo balance, leverage, spread, patience training.' },
  { tab: 'challenge', title: 'Challenge rules', blurb: 'Prop-style risk rules for practice.' },
];

export function SettingsView() {
  const openSettings = useUiStore((s) => s.openSettings);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const balance = useTradingStore((s) => s.settings.initialBalance);
  const leverage = useTradingStore((s) => s.settings.leverage);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 pb-24 lg:px-8">
      <h1 className="text-xl font-semibold tracking-tight text-ink">Settings</h1>
      <p className="mt-1 text-sm text-ink-muted">Every control below maps to a real preference on this device.</p>

      <section className="mt-6 rounded-lg border border-line bg-surface p-4">
        <h2 className="text-sm font-semibold text-ink">Account</h2>
        <p className="mt-1 text-xs text-ink-muted">Device-local profile (no cloud sync yet).</p>
        <dl className="mt-3 space-y-1 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-subtle">Name</dt>
            <dd className="text-ink">{user?.displayName ?? '—'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-subtle">Email</dt>
            <dd className="text-ink">{user?.email ?? '—'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-subtle">Default balance</dt>
            <dd className="font-mono tabular-nums text-ink">{balance.toLocaleString()} USD</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-subtle">Default leverage</dt>
            <dd className="font-mono tabular-nums text-ink">1:{leverage}</dd>
          </div>
        </dl>
        <button
          type="button"
          onClick={() => {
            if (window.confirm('Sign out on this device? Local trade history stays until you clear site data.'))
              logout();
          }}
          className="mt-4 h-9 rounded-md border border-line px-3 text-sm text-ink-muted hover:text-ink"
        >
          Sign out
        </button>
      </section>

      <ul className="mt-4 space-y-2">
        {LINKS.map((item) => (
          <li key={item.tab}>
            <button
              type="button"
              onClick={() => openSettings(item.tab)}
              className="flex w-full flex-col rounded-lg border border-line bg-surface px-4 py-3 text-left transition hover:bg-raised"
            >
              <span className="text-sm font-medium text-ink">{item.title}</span>
              <span className="text-xs text-ink-muted">{item.blurb}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
