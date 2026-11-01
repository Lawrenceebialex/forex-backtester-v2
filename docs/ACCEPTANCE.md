# Final acceptance checklist (Part 20)

## User journey

- [x] Register (device-local account)
- [x] Onboarding (skippable)
- [x] Dashboard as home (not chart)
- [x] New Backtest wizard (market, account, strategy, review)
- [x] Launch workspace / chart session
- [x] Replay historical candles (hide future)
- [x] Buy / Sell simulated trades
- [x] Manage positions (SL/TP/close)
- [x] Trade journal review
- [x] Analytics from real trades
- [x] My Backtests + Strategies libraries

## Interface hierarchy

1. **Backtesting** — Dashboard, New Backtest, My Backtests
2. **Replay + execution** — Workspace chart, Trade panel, Playback bar
3. **Analysis** — Drawings (secondary), Journal
4. **Evaluation** — Analytics, Comparison

## Technical reliability

- [x] Chart engine preserved
- [x] Replay boundary preserved
- [x] Pessimistic SL-before-TP convention documented
- [x] No fabricated instruments or statistics
- [x] Persistence via localStorage stores
- [x] Active session tradeCount/netPnl sync with closed trades

## Remaining known gaps (honest)

- Cloud auth / multi-device sync
- Chart screenshot attach to journal
- Partial date-range clipping inside R2 series
- Commission line-item on every close if not fully wired in store
