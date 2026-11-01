import { Keyboard, Palette, ShieldCheck, SlidersHorizontal, Wallet, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useStrategyStore } from '@/stores/strategyStore';
import { usePreferencesStore } from '@/stores/preferencesStore';
import { usePropStore } from '@/stores/propStore';
import { useThemeStore, type ThemeMode } from '@/stores/themeStore';
import { useUiStore, type SettingsTab } from '@/stores/uiStore';
import { LOT_LIMITS } from '@/domain/trading';
import { AccountSection, ExecutionSection, TrainingSection } from '@/components/trading/SettingsSections';
import { PanelSection } from '@/components/trading/PanelSection';
import { NumberStepper } from '@/components/ui/NumberStepper';
import { Overlay } from '@/components/ui/Overlay';
import { Select } from '@/components/ui/Select';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Switch } from '@/components/ui/Switch';
import { CandleColorPanel } from './CandleColorPanel';

const TABS: ReadonlyArray<{ id: SettingsTab; label: string; icon: LucideIcon }> = [
  { id: 'general', label: 'General', icon: SlidersHorizontal },
  { id: 'chart', label: 'Chart', icon: Palette },
  { id: 'trading', label: 'Trading', icon: Wallet },
  { id: 'challenge', label: 'Prop firm', icon: ShieldCheck },
];

const THEMES = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
] as const;

function General() {
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const openShortcuts = useUiStore((state) => state.openShortcuts);
  return (
    <>
      <PanelSection title="Appearance">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-ink">Theme</p>
            <p className="text-xs text-ink-subtle">Every screen, the chart and your drawings follow it.</p>
          </div>
          <SegmentedControl<ThemeMode> label="Theme" options={THEMES} value={theme} onChange={setTheme} />
        </div>
      </PanelSection>
      <TrainingSection />
      <PanelSection title="Keyboard">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-ink-muted">Play, step, trade and switch timeframes without the mouse.</p>
          <button
            type="button"
            onClick={openShortcuts}
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-line-strong px-3 text-[13px] text-ink-muted transition-colors hover:bg-overlay hover:text-ink coarse:h-11"
          >
            <Keyboard size={15} /> Shortcuts
          </button>
        </div>
      </PanelSection>
    </>
  );
}

function Trading() {
  const defaultLots = usePreferencesStore((state) => state.defaultLots);
  const setDefaultLots = usePreferencesStore((state) => state.setDefaultLots);
  return (
    <>
      <PanelSection title="Order defaults">
        <span className="mb-1 block text-[11px] text-ink-subtle">Default lot size</span>
        <NumberStepper label="Default lot size" value={defaultLots} min={LOT_LIMITS.min} max={LOT_LIMITS.max} step={LOT_LIMITS.step} decimals={2} onChange={setDefaultLots} />
        <p className="mt-2 text-xs text-ink-subtle">Used by the order ticket and by the B / S shortcuts.</p>
      </PanelSection>
      <ExecutionSection />
      <AccountSection />
    </>
  );
}

function PropFirm() {
  const ruleSets = usePropStore((state) => state.ruleSets);
  const defaultRuleSetId = usePreferencesStore((state) => state.defaultRuleSetId);
  const pauseOnBreach = usePreferencesStore((state) => state.pauseOnBreach);
  const setDefaultRuleSetId = usePreferencesStore((state) => state.setDefaultRuleSetId);
  const setPauseOnBreach = usePreferencesStore((state) => state.setPauseOnBreach);
  const setView = useUiStore((state) => state.setView);
  const closeDialog = useUiStore((state) => state.closeDialog);
  const activeStrategy = useStrategyStore((state) => state.strategies.find((s) => s.id === state.activeId)?.name);

  return (
    <>
      <PanelSection title="Challenge defaults">
        <div className="space-y-4">
          <div>
            <span className="mb-1 block text-[11px] text-ink-subtle">Rule set to start with</span>
            <Select label="Default rule set" value={defaultRuleSetId ?? ''} onChange={(value) => setDefaultRuleSetId(value || null)}>
              <option value="">Ask me each time</option>
              {ruleSets.map((ruleSet) => (
                <option key={ruleSet.id} value={ruleSet.id}>
                  {ruleSet.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-ink">Pause when a rule is broken</p>
              <p className="text-xs text-ink-subtle">Stops the replay so the alert can't scroll past at high speed.</p>
            </div>
            <Switch label="Pause when a rule is broken" checked={pauseOnBreach} onChange={setPauseOnBreach} />
          </div>
          <button
            type="button"
            onClick={() => {
              closeDialog();
              setView('challenge');
            }}
            className="h-9 w-full rounded-lg border border-line-strong text-[13px] font-medium text-ink-muted transition-colors hover:bg-overlay hover:text-ink coarse:h-11"
          >
            Manage rule sets
          </button>
        </div>
      </PanelSection>
      <p className="px-1 text-xs text-ink-subtle">Trades are tagged with your active strategy{activeStrategy ? ` (${activeStrategy})` : ''}. Rules are checked against the account as it is when you start a challenge.</p>
    </>
  );
}

function Body() {
  const tab = useUiStore((state) => state.settingsTab);
  const openSettings = useUiStore((state) => state.openSettings);

  return (
    <div className="md:grid md:grid-cols-[172px_1fr]">
      <nav aria-label="Settings sections" className="no-scrollbar flex gap-1 overflow-x-auto border-b border-line px-3 py-2 md:flex-col md:overflow-visible md:border-b-0 md:border-r md:p-3">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            aria-current={tab === id ? 'page' : undefined}
            onClick={() => openSettings(id)}
            className={cn(
              'inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-[13px] font-medium transition-colors coarse:h-11',
              tab === id ? 'bg-accent/10 text-accent' : 'text-ink-muted hover:bg-overlay hover:text-ink',
            )}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </nav>
      <div className="min-w-0 space-y-3 p-3 md:p-4">
        {tab === 'general' && <General />}
        {tab === 'chart' && (
          <PanelSection title="Candle colors">
            <CandleColorPanel />
          </PanelSection>
        )}
        {tab === 'trading' && <Trading />}
        {tab === 'challenge' && <PropFirm />}
      </div>
    </div>
  );
}

export function SettingsModal() {
  const open = useUiStore((state) => state.dialog === 'settings');
  const closeDialog = useUiStore((state) => state.closeDialog);
  return (
    <Overlay open={open} onClose={closeDialog} title="Settings" variant="modal">
      <Body />
    </Overlay>
  );
}
