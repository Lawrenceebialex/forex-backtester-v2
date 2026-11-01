import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';

const STEPS = [
  {
    title: 'Create a backtest',
    body: 'Configure instrument, period, risk and strategy before you touch the chart.',
  },
  {
    title: 'Select market and history',
    body: 'Only instruments with real historical data are available. Unsupported markets stay listed as coming later.',
  },
  {
    title: 'Replay price action',
    body: 'Move through candles in order. Future bars stay hidden so you cannot peek ahead.',
  },
  {
    title: 'Execute simulated trades',
    body: 'Place buys and sells with stops and targets. Your demo account records every result.',
  },
  {
    title: 'Analyse performance',
    body: 'Review win rate, drawdown, profit factor and trade history — calculated from what you actually traded.',
  },
];

export function OnboardingScreen() {
  const [index, setIndex] = useState(0);
  const complete = useAuthStore((s) => s.completeOnboarding);
  const skip = useAuthStore((s) => s.skipOnboarding);
  const name = useAuthStore((s) => s.user?.displayName ?? 'trader');
  const step = STEPS[index];
  const last = index === STEPS.length - 1;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-lg rounded-lg border border-line bg-surface p-6 shadow-overlay">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">Welcome, {name}</p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-ink">Welcome to your trading research workspace.</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Build, test and analyse your trading strategies using historical market data.
        </p>

        <div className="mt-6 rounded-md border border-line bg-raised p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-ink-subtle">
            {index + 1} / {STEPS.length}
          </p>
          <p className="mt-2 text-base font-semibold text-ink">{step.title}</p>
          <p className="mt-1 text-sm text-ink-muted">{step.body}</p>
        </div>

        <div className="mt-4 flex gap-1">
          {STEPS.map((_, i) => (
            <span key={i} className={`h-1 flex-1 rounded-full ${i <= index ? 'bg-accent' : 'bg-line'}`} />
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <button type="button" onClick={skip} className="text-sm text-ink-muted hover:text-ink">
            Skip
          </button>
          <div className="flex gap-2">
            {index > 0 && (
              <button
                type="button"
                onClick={() => setIndex((i) => i - 1)}
                className="h-9 rounded-md border border-line px-3 text-sm text-ink-muted"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={() => (last ? complete() : setIndex((i) => i + 1))}
              className="h-9 rounded-md bg-accent px-4 text-sm font-medium text-accent-ink"
            >
              {last ? 'Get started' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
