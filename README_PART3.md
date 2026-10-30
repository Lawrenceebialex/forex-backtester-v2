# Part 3 — Strategies, Statistics, Performance, Comparison, Educational Insights

## What this is
Complete, improved Part 3 for the Forex Backtester.
Merge these files into the **Custom Chart** project (recommended base).

## What Claude was building (from the 6 docs)
1. Strategy domain + store (create / rename / archive / set active)
2. Statistics engine from closed trades only
3. Educational advice engine (always labeled "Educational Insight")
4. Performance dashboard (hero metrics + detail metrics + equity + drawdown)
5. Strategy comparison (table + overlaid equity curves)
6. Strategies management UI
7. Trading store updates so every trade is tagged with `strategyId`
8. Playback improvements (jump to any date, full range)
9. Throttled localStorage so replay stays smooth
10. SVG SeriesChart for equity/drawdown (theme-aware, no Chart.js dependency)

## How to merge into Custom Chart
1. Unzip Custom Chart into your repo
2. Copy every file from this `src/` folder into the matching path in the project
   - Overwrite when a file already exists (these versions are the improved ones)
3. Ensure `App.tsx` / routing shows the four views: chart | strategies | performance | comparison
4. Ensure `useTradingEngine` is mounted at the app root
5. Run `npm install` and `npm run build`

## Public API surface (for the rest of the app)
- `useStrategyStore` — strategies + activeId
- `useTradingStore.closedTrades` — already tagged with strategyId
- `computeStatistics(trades, initialBalance, symbol)`
- `generateInsights(stats)` → list of Educational Insights
- Views: `StrategiesView`, `PerformanceView`, `ComparisonView`

## Notes
- All insights are educational only (never financial advice)
- Statistics ignore open positions
- R-multiples only count trades that had a stop loss
- Dark / Light themes are supported via existing CSS variables
