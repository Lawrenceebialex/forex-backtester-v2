# Forex Backtester

A forex replay and backtesting platform. Step through EURUSD price history one candle at a time, trade
it with a demo account, tag trades with strategies, judge them with real statistics, and practise under
prop firm rules. Built for phone, iPad and desktop, in Dark and Light.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 85 tests: replay, trading, statistics, prop rules, chart engine, drawings, shortcuts
npm run build      # type-check + production build into dist/
```

Try it on a phone or iPad on the same Wi-Fi with `npm run dev -- --host`.
Requires Node 18+.

## What it does

**Replay** — Play, pause, step forward / back, speeds from 0.5× to Max, timeframes 1m–D built from M1 data.
The future is never revealed: higher-timeframe candles form progressively. Jump to any date, or cut the
chart at a candle and continue from there. Time travel never touches your account.

**Chart** — our own canvas engine (`src/chart/`): momentum pan, wheel / pinch zoom, animated price scale,
snapping crosshair, last-price tag, entry markers and SL / TP lines, news markers, Latest button.

**Drawing tools** — trend line, ray, horizontal line, vertical line, Fibonacci retracement, rectangle,
text, measure (price, pips, %, candles, time) and eraser. Click or drag to draw, select to move or
reshape, Delete to remove, six colors. Drawings are stored in market time and price, so they stay put
when you change timeframe, and they're saved between visits.

**Trading** — market buy / sell, lot size, stop loss and take profit (pips or price), variable spread,
margin, live equity, positions with P&L in $ and pips. Stops are checked on every candle, even when
stepping or playing fast. Gradual-outcome mode makes P&L glide to new values to practise patience.

**Strategies and statistics** — create, rename, archive; every trade is tagged with the active one.
Net profit, win rate, profit factor, drawdown, average win / loss, expectancy, R-multiple, streaks,
duration, best / worst trade, equity and drawdown curves, a side-by-side comparison, and plain-language
Educational Insights (never financial advice).

**Prop firm challenges** — save custom rule sets (daily loss, total loss, trailing drawdown, profit target,
max lot size, lot and profit consistency, news trading, weekend holding). Every tick, order and close is
checked; a breach raises an alert and is recorded with its exact market time and numbers. Download or
print the report any time.

**News overlay** — high / medium impact events on the chart; hover or tap for actual, forecast, previous.
Only events that have already happened at the replay clock are shown.

**Settings** (gear icon, or `,`) — theme, candle colors (presets and pickers), spread, starting capital
and leverage, default lot size, gradual outcome, prop firm defaults.

## Keyboard shortcuts

Press `?` in the app for the list.

| Key | Action | Key | Action |
| --- | --- | --- | --- |
| `Space` | Play / pause | `B` / `S` | Quick buy / sell (default lots) |
| `←` `→` | Step back / forward | `1`–`6` | Timeframe 1m … D |
| `[` `]` | Slower / faster | `T` | Switch theme |
| `R` | Back to session start | `P` | Show / hide trading panel |
| `C` | Cut the chart | `Esc` | Stop drawing / cancel cut |
| `Del` | Delete selected drawing | `,` | Settings |

Shortcuts pause while you type in a field or while a dialog is open.

## Responsive behavior

| | Phone | iPad portrait | iPad landscape / desktop |
| --- | --- | --- | --- |
| Navigation | Bottom tab bar | Header tabs | Header tabs |
| Trading panel | Bottom sheet (drag the handle to close) | Slide-over | Docked, collapsible |
| Dialogs | Bottom sheets | Centred / popover | Centred / popover |
| Drawing tools | Collapsed button | Open rail | Open rail |

Touch devices get larger tap targets automatically (`coarse:` Tailwind variant), and notches / home
indicators are respected.

## Connecting real data

Everything reads the market through three small seams:

| What | File | Replace with |
| --- | --- | --- |
| Price history | `src/data/marketData.ts` | Your M1 candles: sorted, UTC seconds, **bid** prices. Set `MARKET_DATA_STATUS` while loading (the chart shows a skeleton). Keep `SYMBOL` in step with the pair. |
| Economic calendar | `src/data/newsEvents.ts` | A feed mapped to `NewsEvent` (`src/domain/news.ts`). Today's calendar is a sample with made-up numbers. |
| Spread | `src/lib/trading.ts` (`spreadPipsAt`) | Real historical spreads, if you have them; it is a simulation now. |

Money figures assume a USD-quoted pair (EURUSD). Other pairs need a quote-to-USD conversion in
`moneyFromMove` (`src/lib/trading.ts`). Stops fill at their level (no slippage or gap modelling).

## Project structure

```
src/
  domain/       Types and constants (market, trading, strategy, statistics, prop firm, news, drawings)
  data/         Market data and news calendar (mock today)
  chart/        Canvas chart engine, drawing layer, time axis, theme
  lib/          Pure logic: replay, trading maths, statistics, advice, prop rules, reports, formatting
  stores/       Zustand: theme, candle colors, playback, trading, strategies, prop, news, drawings,
                preferences, toasts, UI. Saved to localStorage.
  hooks/        Engines (playback, trading, prop rules), shortcuts, eased numbers, media queries
  components/   chart · drawing · playback · trading · strategies · performance · comparison ·
                insights · challenge · news · settings · layout · ui
```

## Theming

Colors are CSS variables in `src/index.css` (`:root` for dark, `:root[data-theme='light']` for light),
exposed to Tailwind in `tailwind.config.ts` (`bg-surface`, `text-ink-muted`, `text-bull`, …). The chart
and the drawings read the same variables, so a new token works in both themes.

## Notes

- Data is saved in the browser (localStorage): account, trades, strategies, rule sets, drawings, settings.
- A prop-firm breach marks the challenge failed but never stops you trading.
- The prop firm "day" is the UTC day. Weekend holding is checked at the market closure in the data.
