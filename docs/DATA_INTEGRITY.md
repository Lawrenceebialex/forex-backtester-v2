# Data integrity & backtesting reliability

Contract for Parts 16–20 of the product redesign.

## Historical replay

| Rule | Implementation |
|------|----------------|
| No future-candle exposure | Chart data is always `visibleCandles(m1, index, cursor)` where `cursor` is derived from `playbackStore.currentTime`. Aggregation never reads M1 bars past the cursor. |
| No look-ahead bias | Higher-TF forming candles only include M1 bars up to the cursor. |
| Chronological progression | Clock advances via step/playback; settlement walks newly revealed M1 bars in order. |
| Timestamps | Candle `time` is unix seconds (UTC) from the HistData/R2 pipeline. |
| Replay boundary | UI must not surface prices, tooltips, or news for times after `currentTime`. |

**Known limitation:** Jumping the clock forward settles intermediate candles for SL/TP, but does not invent intra-bar path beyond OHLC extremes.

## Trade execution

| Rule | Implementation |
|------|----------------|
| Direction | `side: 'buy' \| 'sell'` on `OrderRequest`. |
| Entry | Buy at ask, sell at bid (`makeQuote` + spread model). |
| Spread | Fixed or variable (`spreadPipsAt`); same minute → same spread when variable is on. |
| P/L | Pip distance × lots × contract size via `moneyFromMove`. |

**Known limitation:** No partial fills; no slippage model beyond spread; no gap-jump modelling beyond fill at SL/TP level.

## Position management — both SL and TP on same candle

**Explicit convention (pessimistic):** if a single candle’s range touches both stop-loss and take-profit, **the stop-loss is assumed to have been hit first**.

Rationale: on OHLC data the true path is unknown; favouring the stop avoids optimistic bias in backtests.

Documented in `src/lib/trading.ts` (`stopTouched`).

## Persistence

| Data | Mechanism |
|------|-----------|
| Auth profile | `fb-auth` |
| Backtest sessions | `fb-backtests` |
| Trades / account | trading store (throttled localStorage) |
| Strategies | strategy store persist |
| Journal entries | `fb-journal` |
| Playback clock | throttled (cleared on bootstrap to avoid stale locks) |

**Known limitation:** Device-local only. Clearing browser storage removes history. No multi-device sync.

## Analytics

- All metrics from `computeStatistics` over **actual** `closedTrades`.
- Dashboard, Analytics, and journal read the same store — no parallel mock series.
- Win rate: wins ÷ total closed trades (breakeven in denominator); stated on the Analytics page.

## What we will not claim

- Tick-perfect path reconstruction
- Broker-identical fills vs MT5
- Live pricing or real-money execution
- Instruments not present in R2 (no fabricated markets)
