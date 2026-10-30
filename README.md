# Forex Backtester

Forex replay and backtesting platform — EURUSD, M1 base, dark and light themes, built to feel
great on phone, iPad and desktop.

**Status: Part 3 + custom chart.** Builds on Part 1 (themes, candle colors, responsive layout,
playback), Part 2 (demo trading) and Part 3 (strategies, statistics, comparison, insights). The chart
is now our own canvas engine — no third-party chart library. Prop-firm rules, news and drawing tools
come in later parts.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # replay, trading, statistics and advice tests
npm run build      # type-check + production build
```

To try it on a phone or iPad on the same Wi-Fi: `npm run dev -- --host`.

## What's in Part 1

- **Themes** — a designed Dark and Light palette (not an inversion) driven by CSS variables.
  Toggle in the header; saved, follows the system on first visit, no flash on load.
- **Candle colors** — up/down × body/wick/border. Five presets (Classic, Blue/Red,
  Blue/Orange for color-blind users, Emerald/Rose, Monochrome) plus native pickers and hex fields.
  Saved and applied to the chart live.
- **Chart** — our own canvas chart (`src/chart/`) with 20 days of deterministic mock EURUSD M1
  data, OHLC legend (hover or tap), theme- and color-aware. See "The chart engine" below.
- **Playback** — Play / Pause / Step / Restart, speeds 0.5× 1× 2× 5× 10× Max, virtual UTC clock
  and progress bar. Future candles are never given to the chart.
- **Timeframes** — 1m 5m 15m 1H 4H D, built from M1 on the fly; the forming candle grows as the
  clock advances, exactly like a live market.
- **Layout** — header, chart, playback bar, trading-panel shell.

## The chart engine

`src/chart/CandleChart.ts` is a dependency-free canvas chart built for replay.

- **Smooth** — drag to pan with momentum, mouse wheel / trackpad pinch / two-finger pinch to zoom
  around the pointer, animated price auto-scale, on-demand rendering (a frame is drawn only when
  something changed).
- **Crisp** — pixel-snapped candles, wicks and lines on any screen density (retina, iPad, phone).
- **Comfortable** — snapping crosshair with price and time labels, last-price tag, "Latest" button
  when you scroll away, double-click to re-fit, keyboard (arrows, +/−, Home/End), touch tap to
  place the crosshair. Phones get chunkier candles automatically.
- **Replay-aware** — follows the live edge only while the newest candle is on screen, entry markers
  and entry / stop-loss / take-profit lines with price tags, and the cut line (hover to preview,
  click to lock, the area to be removed is dimmed).
- **Themeable** — colors come from the theme's CSS variables and the candle color settings.
- **Tested** — `src/chart/CandleChart.test.ts` drives the engine with a fake browser (zoom limits,
  pan, flick momentum, pinch, crosshair, live-edge following, cut mode, overlays).

The app talks to it through a small API: `setData`, `update`, `setOverlays`, `setCutMode`,
`setTheme`, `setCandleColors`, `scrollToLatest`.

## What's in Part 3

- **Navigation** — Chart · Strategies · Performance · Comparison. Tabs in the header on iPad and
  desktop, a thumb-reach tab bar on phones. The chart stays mounted while you visit other tabs.
- **Strategies** — create, rename and archive (restore any time). There is always exactly one
  active strategy; every new trade is tagged with it. Pick it from the order ticket or the
  Strategies tab.
- **Statistics engine** (`src/lib/statistics.ts`) — net profit, win rate, profit factor, max
  drawdown (amount and %), average win / loss, expectancy, average R-multiple, longest win / loss
  streaks, trade count, average duration, best / worst trade, plus equity and drawdown curves. All
  from closed trades. R-multiples use each trade's stop loss, so trades without one are excluded.
- **Performance** — KPI dashboard, equity curve, drawdown chart, for all strategies or one.
- **Comparison** — pick strategies, see a side-by-side table (best value per row highlighted) and
  overlaid or separate equity curves. Archived strategies stay comparable.
- **Educational Insights** (`src/lib/advice.ts`) — rule-based, plain-language observations such as
  drawdown larger than return, average loss far above average win (with the break-even win rate),
  long losing streaks, thin profit factor, missing stop losses. Always labelled "Educational
  Insight" with a not-financial-advice note. Tune the thresholds in that file.

### Account and time travel

- **Time travel never touches the account.** Rewinding, jumping to a date, cutting the chart or
  going back to the session start leave balance, positions and trades exactly as they are. Moving
  forward checks stop loss / take profit on every candle you pass, and a position is only ever
  settled by candles after it was opened.
- **Account setup** (slider icon in the trading panel) — starting balance and leverage, applied with
  a confirmed "Apply & reset account". Resetting is now always your decision.
- **Everything is saved** — account, trades, strategies, replay position, timeframe and speed
  survive a reload.
- **Go to date** — pick a date and time (UTC); the replay clock jumps there and pauses.
- **Cut chart** (scissors) — hover or tap a candle to place a vertical line, shading everything that
  will be removed, then confirm. Everything after the line disappears and the replay continues from
  there. The line never moves the clock forward.

## What's in Part 2

- **Account** — balance, equity, free margin, used margin and floating P&L, refreshed on every
  candle. Starts at $10,000 with 1:100 leverage.
- **Order ticket** — market Buy / Sell, lot size (stepper + presets), optional stop loss and
  take profit entered as pips or as a price. Orders are rejected with a clear message for a bad
  lot size, a stop on the wrong side of the market, or not enough free margin.
- **Spread** — buys fill at the ask, sells at the bid; the chart shows bid prices. Set the base
  spread (default 1.0 pip) from the sliders icon in the panel. "Variable spread" (on by default)
  gives ~0.8–1.2 pips in the London / New York day and wider spreads in Asia and at rollover,
  deterministically per minute.
- **Positions** — side, size, entry → current price, live P&L in $ and pips, per-position
  Close and Close all. Stop loss / take profit are checked against every M1 candle as it is
  revealed (even when stepping or playing fast); if one candle touches both, the stop loss wins.
- **Chart** — entry arrows plus entry / SL / TP price lines for open positions, in both themes.
- **Toasts** — order filled, position closed, stop loss / take profit hit, replay restarted.
Closed trades are kept in the trading store (`closedTrades`) and feed the statistics.
Known simplifications: stops fill at their level (no slippage or gaps), no margin call / stop-out,
USD-quoted pairs only for $ figures.

## Responsive behavior

| Screen | Trading panel | Playback bar | Candle colors |
| --- | --- | --- | --- |
| Phone (< 768px) | Bottom sheet | Two rows, speed selector scrolls | Bottom sheet |
| iPad portrait (768–1023px) | Slide-over drawer | One row | Popover |
| iPad landscape / desktop (≥ 1024px) | Docked column, collapsible | One row | Popover |

Touch devices (`pointer: coarse`) automatically get larger tap targets via a `coarse:` Tailwind
variant. Safe-area insets (notch, home indicator) are respected.

## Project structure

```
src/
  domain/       Pure types and constants (market, candle colors + presets)
  data/         Market data source (mock generator today, real data later)
  lib/          Replay engine and trading maths (pure, tested), chart theming, formatting
  stores/       Zustand: theme, candleColors, playback, ui, trading, strategy, toast
  hooks/        usePlaybackEngine (rAF clock), useTradingEngine (SL/TP + live account), useMediaQuery
  components/   chart/ playback/ trading/ strategies/ performance/ comparison/ insights/ settings/ layout/ ui/
```

## How replay works

M1 candles are the single source of truth and the virtual clock is a cursor into them. A candle on
any timeframe is aggregated from M1 candles **up to the cursor only**, so the forming candle never
contains future information. The chart receives full data on load/timeframe change and then
incremental `update()` calls. See `src/lib/replay.ts` and its tests.

## Connecting real data

Everything reads market data through `src/data/marketData.ts`. Replace `M1_CANDLES` with your
own sorted, UTC-seconds M1 candles (and adjust `SYMBOL`) — no other file needs to change.

## Theming

Colors live as RGB-channel CSS variables in `src/index.css` (`:root` for dark,
`:root[data-theme='light']` for light) and are exposed to Tailwind in `tailwind.config.ts`
(`bg-surface`, `text-ink-muted`, `border-line`, `text-bull`, …). Add a token in both blocks and
in the Tailwind config and it works in both themes. The chart reads the same variables.
