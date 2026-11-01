const FEATURES = [
  {
    title: 'Historical replay',
    body: 'Move through past price action candle by candle. Future bars stay hidden so you never peek ahead.',
  },
  {
    title: 'Manual trade practice',
    body: 'Place buys and sells with stops and targets on a demo account built for research, not live brokerage.',
  },
  {
    title: 'Strategy experiments',
    body: 'Name a methodology, run multiple tests on EURUSD and USDJPY, then compare results side by side.',
  },
  {
    title: 'Trade journal',
    body: 'Tag setups, write why you entered, and review whether you followed your own rules.',
  },
  {
    title: 'Real statistics',
    body: 'Win rate, profit factor, drawdown and equity curves come only from trades you actually closed.',
  },
  {
    title: 'Prop style challenges',
    body: 'Optional rule sets help you practice risk limits the way evaluation firms structure targets.',
  },
];

interface LandingPageProps {
  onEnter: () => void;
}

export function LandingPage({ onEnter }: LandingPageProps) {
  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-subtle">Forex Backtester</p>
          <p className="text-sm text-ink-muted">Test · Analyse · Improve</p>
        </div>
        <button
          type="button"
          onClick={onEnter}
          className="h-9 rounded-md bg-accent px-4 text-sm font-medium text-accent-ink hover:brightness-110"
        >
          Open app
        </button>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-20 pt-8">
        <section className="max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Manual forex backtesting for serious practice
          </h1>
          <p className="mt-4 text-base leading-relaxed text-ink-muted">
            A research workspace where you configure an experiment, replay history without look ahead bias, execute
            simulated trades, journal your decisions, and measure what actually worked.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onEnter}
              className="h-11 rounded-md bg-accent px-5 text-sm font-medium text-accent-ink hover:brightness-110"
            >
              Start testing free
            </button>
            <a
              href="#features"
              className="inline-flex h-11 items-center rounded-md border border-line px-5 text-sm font-medium text-ink-muted hover:bg-overlay hover:text-ink"
            >
              See features
            </a>
          </div>
          <p className="mt-3 text-xs text-ink-subtle">
            Prototype runs on this device. Cloud accounts are not required while testing is open.
          </p>
        </section>

        <section id="features" className="mt-16">
          <h2 className="text-lg font-semibold text-ink">What you can do</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <li key={f.title} className="rounded-lg border border-line bg-surface p-4">
                <p className="text-sm font-semibold text-ink">{f.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{f.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-16 rounded-lg border border-line bg-surface p-6">
          <h2 className="text-lg font-semibold text-ink">How a session works</h2>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-ink-muted">
            <li>Configure market, risk and strategy.</li>
            <li>Replay candles at your pace.</li>
            <li>Execute and manage positions.</li>
            <li>Record reasoning in the journal.</li>
            <li>Evaluate performance with real numbers.</li>
          </ol>
          <button
            type="button"
            onClick={onEnter}
            className="mt-6 h-10 rounded-md bg-accent px-4 text-sm font-medium text-accent-ink hover:brightness-110"
          >
            Open the workspace
          </button>
        </section>
      </main>

      <footer className="border-t border-line py-6 text-center text-xs text-ink-subtle">
        Forex Backtester · historical research only · not a live broker
      </footer>
    </div>
  );
}
