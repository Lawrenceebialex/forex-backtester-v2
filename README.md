# Forex Backtester

Forex replay and backtesting platform — EURUSD, M1 base, dark and light themes, built to feel
great on phone, iPad and desktop.

**Status: Part 1 — foundation.** Theme system, candle colors, responsive layout, chart,
playback engine. Trading, statistics, prop-firm rules, news and drawing tools come in later parts.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # replay engine tests
npm run build      # type-check + production build
```

To try it on a phone or iPad on the same Wi-Fi: `npm run dev -- --host`.

## What's in Part 1

- **Themes** — a designed Dark and Light palette (not an inversion) driven by CSS variables.
  Toggle in the header; saved, follows the system on first visit, no flash on load.
- **Candle colors** — up/down × body/wick/border. Five presets (Classic, Blue/Red,
  Blue/Orange for color-blind users, Emerald/Rose, Monochrome) plus native pickers and hex fields.
  Saved and applied to the chart live.
- **Chart** — TradingView Lightweight Charts with 20 days of deterministic mock EURUSD M1 data,
  OHLC legend (hover or tap), theme- and color-aware.
- **Playback** — Play / Pause / Step / Restart, speeds 0.5× 1× 2× 5× 10× Max, virtual UTC clock
  and progress bar. Future candles are never given to the chart.
- **Timeframes** — 1m 5m 15m 1H 4H D, built from M1 on the fly; the forming candle grows as the
  clock advances, exactly like a live market.
- **Layout** — header, chart, playback bar, trading-panel shell.

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
  lib/          Replay engine (pure, tested), chart theming, formatting helpers
  stores/       Zustand: theme, candleColors, playback, ui
  hooks/        usePlaybackEngine (rAF clock), useMediaQuery
  components/   chart/ playback/ trading/ settings/ layout/ ui/
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
