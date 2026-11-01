import { useUiStore } from '@/stores/uiStore';

const LINKS: { tab: 'general' | 'chart' | 'trading' | 'challenge'; title: string; blurb: string }[] = [
  { tab: 'general', title: 'General', blurb: 'Theme and workspace defaults.' },
  { tab: 'chart', title: 'Chart', blurb: 'Candle colours and chart appearance.' },
  { tab: 'trading', title: 'Trading & account', blurb: 'Demo balance, leverage, spread, patience training.' },
  { tab: 'challenge', title: 'Challenge rules', blurb: 'Prop-style risk rules for practice.' },
];

export function SettingsView() {
  const openSettings = useUiStore((s) => s.openSettings);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 pb-24 lg:px-8">
      <h1 className="text-xl font-semibold tracking-tight text-ink">Settings</h1>
      <p className="mt-1 text-sm text-ink-muted">Preferences apply to this device. Cloud accounts are not enabled yet.</p>

      <ul className="mt-6 space-y-2">
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
