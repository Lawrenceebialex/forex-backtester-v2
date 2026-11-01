# Redesign Parts 1–3 — Audit, identity, IA

## Part 1 — Inventory (preserved engines)

Working engines kept intact: `CandleChart`, R2 OHLC load, hide-future replay (`playbackStore` + `lib/replay`), trading sim (`lib/trading` + `tradingStore`), drawings, statistics (`lib/statistics`), strategy tags, prop challenge, localStorage persistence.

Not present before redesign: auth, multi-session backtest library, dashboard home, config wizard, server DB.

## Part 2 — Identity

Product: manual forex backtesting / strategy validation. Motto: **Test · Analyse · Improve**. Dark-first fintech UI via existing CSS tokens (charcoal canvas, restrained accent, bull/bear for outcomes only).

## Part 3 — IA (this ship)

Primary nav: Dashboard · New Backtest · My Backtests · Strategies · Analytics · Settings.  
Desktop: sidebar. Mobile: drawer + bottom nav.  
Chart lives under **workspace** (session), not as product home.
