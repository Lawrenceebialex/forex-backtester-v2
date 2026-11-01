import { ShieldAlert, ShieldCheck } from 'lucide-react';
import type { ChallengeStatus } from '@/domain/propFirm';
import { cn } from '@/lib/cn';
import { usePropStore } from '@/stores/propStore';
import { useUiStore } from '@/stores/uiStore';

const LOOK: Record<ChallengeStatus, { label: string; tone: string }> = {
  active: { label: 'In progress', tone: 'text-accent' },
  failed: { label: 'Failed', tone: 'text-bear' },
  passed: { label: 'Passed', tone: 'text-bull' },
  ended: { label: 'Ended', tone: 'text-ink-muted' },
};

/** Always-visible challenge status in the header; opens the Challenge tab. */
export function ChallengeChip() {
  const status = usePropStore((state) => state.challenge?.status ?? null);
  const setView = useUiStore((state) => state.setView);
  if (!status) return null;
  const { label, tone } = LOOK[status];
  const Icon = status === 'failed' ? ShieldAlert : ShieldCheck;

  return (
    <button
      type="button"
      onClick={() => setView('challenge')}
      aria-label={`Challenge: ${label}. Open the challenge tab`}
      className={cn(
        'inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-medium transition-colors hover:bg-overlay coarse:h-11 md:border md:border-line md:px-2.5',
        tone,
      )}
    >
      <Icon size={16} className={status === 'failed' ? 'animate-pulse' : undefined} />
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}
