import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { M1_CANDLES, SYMBOL, indexAtOrBefore } from '@/data/marketData';
import {
  BALANCE_LIMITS,
  DEFAULT_TRADING_SETTINGS,
  LEVERAGE_OPTIONS,
  SPREAD_LIMITS,
  isClosedTrade,
  isPosition,
  type ClosedTrade,
  type OrderRequest,
  type OrderResult,
  type Position,
  type Quote,
  type TradingSettings,
} from '@/domain/trading';
import { createThrottledStorage } from '@/lib/debouncedStorage';
import { formatMoney, formatPips, formatPrice, formatSignedMoney } from '@/lib/format';
import { clamp, roundTo } from '@/lib/math';
import {
  buildClosedTrade,
  closePrice,
  computeAccount,
  fillPrice,
  makeQuote,
  normalizeLots,
  resolveStop,
  roundMoney,
  settleCandles,
  spreadPipsAt,
  validateOrder,
} from '@/lib/trading';
import { usePlaybackStore } from './playbackStore';
import { useStrategyStore } from './strategyStore';
import { useToastStore } from './toastStore';

interface TradingState {
  settings: TradingSettings;
  balance: number;
  /** Latest market quote (bid = close of the newest revealed M1 candle). */
  quote: Quote;
  /** Derived from balance + positions + quote; refreshed on every change and every tick. */
  equity: number;
  floatingPnl: number;
  usedMargin: number;
  freeMargin: number;
  positions: Position[];
  closedTrades: ClosedTrade[];
  nextNumber: number;

  placeOrder: (request: OrderRequest) => OrderResult;
  closePosition: (id: string) => void;
  closeAll: () => void;
  setSpreadPips: (pips: number) => void;
  setVariableSpread: (variable: boolean) => void;
  /**
   * Called by the trading engine whenever the replay clock moves (M1 indices).
   * Moving forward settles stop-loss / take-profit on the candles passed over; moving backwards
   * (rewinding, jumping, cutting) only refreshes the quote — the account is never reset by time travel.
   */
  onClockAdvance: (fromIndex: number, toIndex: number) => void;
  /** Starts a fresh account: clears positions and trades, optionally with a new balance / leverage. */
  resetAccount: (setup?: Partial<Pick<TradingSettings, 'initialBalance' | 'leverage'>>) => void;
}

const currentIndex = () => indexAtOrBefore(usePlaybackStore.getState().currentTime);

function quoteAt(index: number, settings: TradingSettings): Quote {
  const candle = M1_CANDLES[index];
  const spread = spreadPipsAt(candle.time, settings.spreadPips, settings.variableSpread);
  return makeQuote(candle.close, spread, SYMBOL);
}

const accountFor = (balance: number, positions: readonly Position[], quote: Quote, settings: TradingSettings) =>
  computeAccount(balance, positions, quote, SYMBOL, settings.leverage);

function buildState(
  settings: TradingSettings,
  saved?: { balance: number; positions: Position[]; closedTrades: ClosedTrade[]; nextNumber: number },
) {
  const quote = quoteAt(currentIndex(), settings);
  const balance = saved?.balance ?? settings.initialBalance;
  const positions = saved?.positions ?? [];
  return {
    settings,
    balance,
    quote,
    ...accountFor(balance, positions, quote, settings),
    positions,
    closedTrades: saved?.closedTrades ?? [],
    nextNumber: saved?.nextNumber ?? 1,
  };
}

function sanitizeSettings(value: unknown): TradingSettings {
  const source = (typeof value === 'object' && value !== null ? value : {}) as Partial<TradingSettings>;
  const defaults = DEFAULT_TRADING_SETTINGS;
  const number = (candidate: unknown, fallback: number) =>
    typeof candidate === 'number' && Number.isFinite(candidate) ? candidate : fallback;
  const leverage = number(source.leverage, defaults.leverage);
  return {
    spreadPips: clamp(roundTo(number(source.spreadPips, defaults.spreadPips), 1), SPREAD_LIMITS.min, SPREAD_LIMITS.max),
    variableSpread: typeof source.variableSpread === 'boolean' ? source.variableSpread : defaults.variableSpread,
    initialBalance: clamp(Math.round(number(source.initialBalance, defaults.initialBalance)), BALANCE_LIMITS.min, BALANCE_LIMITS.max),
    leverage: (LEVERAGE_OPTIONS as readonly number[]).includes(leverage) ? leverage : defaults.leverage,
  };
}

/** The state change for closing `trades` at `quote`. */
function withClosedTrades(state: TradingState, trades: ClosedTrade[], quote: Quote) {
  const closedIds = new Set(trades.map((trade) => trade.id));
  const positions = state.positions.filter((position) => !closedIds.has(position.id));
  const balance = roundMoney(state.balance + trades.reduce((sum, trade) => sum + trade.pnl, 0));
  return {
    positions,
    balance,
    closedTrades: [...state.closedTrades, ...trades],
    quote,
    ...accountFor(balance, positions, quote, state.settings),
  };
}

const sideLabel = (position: Position) => (position.side === 'buy' ? 'Buy' : 'Sell');
const resultTone = (pnl: number) => (pnl > 0 ? 'bull' : pnl < 0 ? 'bear' : 'neutral');

function notifyClosed(trade: ClosedTrade) {
  const title =
    trade.reason === 'stop-loss' ? 'Stop loss hit' : trade.reason === 'take-profit' ? 'Take profit hit' : 'Position closed';
  useToastStore.getState().push({
    tone: resultTone(trade.pnl),
    title,
    description: `${sideLabel(trade)} ${trade.lots.toFixed(2)} ${SYMBOL.symbol} · ${formatSignedMoney(trade.pnl)} (${formatPips(trade.pips)} pips)`,
  });
}

export const useTradingStore = create<TradingState>()(
  persist(
    (set, get) => ({
      ...buildState(DEFAULT_TRADING_SETTINGS),

      placeOrder: (request) => {
        const state = get();
        const index = currentIndex();
        const quote = quoteAt(index, state.settings);
        const lots = normalizeLots(request.lots);
        const entry = fillPrice(request.side, quote);
        const stopLoss = request.stopLoss ? resolveStop(request.side, 'stop-loss', request.stopLoss, entry, SYMBOL) : null;
        const takeProfit = request.takeProfit ? resolveStop(request.side, 'take-profit', request.takeProfit, entry, SYMBOL) : null;

        const error = validateOrder(
          { side: request.side, lots, stopLoss, takeProfit },
          {
            quote,
            freeMargin: accountFor(state.balance, state.positions, quote, state.settings).freeMargin,
            symbol: SYMBOL,
            leverage: state.settings.leverage,
          },
        );
        if (error) return { ok: false, error };

        const position: Position = {
          id: `p${state.nextNumber}`,
          number: state.nextNumber,
          side: request.side,
          lots,
          entryPrice: entry,
          entryTime: M1_CANDLES[index].time,
          stopLoss,
          takeProfit,
          strategyId: useStrategyStore.getState().activeId,
        };
        const positions = [...state.positions, position];
        set({ positions, nextNumber: state.nextNumber + 1, quote, ...accountFor(state.balance, positions, quote, state.settings) });

        useToastStore.getState().push({
          tone: request.side === 'buy' ? 'bull' : 'bear',
          title: `${sideLabel(position)} ${lots.toFixed(2)} ${SYMBOL.symbol} filled`,
          description: `at ${formatPrice(entry, SYMBOL)} · spread ${quote.spreadPips.toFixed(1)} pips`,
        });
        return { ok: true, position };
      },

      closePosition: (id) => {
        const state = get();
        const position = state.positions.find((candidate) => candidate.id === id);
        if (!position) return;
        const index = currentIndex();
        const quote = quoteAt(index, state.settings);
        const trade = buildClosedTrade(position, closePrice(position.side, quote), M1_CANDLES[index].time, 'manual', SYMBOL);
        set(withClosedTrades(state, [trade], quote));
        notifyClosed(trade);
      },

      closeAll: () => {
        const state = get();
        if (state.positions.length === 0) return;
        const index = currentIndex();
        const quote = quoteAt(index, state.settings);
        const time = M1_CANDLES[index].time;
        const trades = state.positions.map((position) =>
          buildClosedTrade(position, closePrice(position.side, quote), time, 'manual', SYMBOL),
        );
        set(withClosedTrades(state, trades, quote));

        const total = trades.reduce((sum, trade) => sum + trade.pnl, 0);
        useToastStore.getState().push({
          tone: resultTone(total),
          title: `Closed ${trades.length} positions`,
          description: `Total ${formatSignedMoney(total)}`,
        });
      },

      setSpreadPips: (pips) => {
        const state = get();
        const settings = sanitizeSettings({ ...state.settings, spreadPips: pips });
        const quote = quoteAt(currentIndex(), settings);
        set({ settings, quote, ...accountFor(state.balance, state.positions, quote, settings) });
      },

      setVariableSpread: (variableSpread) => {
        const state = get();
        const settings = { ...state.settings, variableSpread };
        const quote = quoteAt(currentIndex(), settings);
        set({ settings, quote, ...accountFor(state.balance, state.positions, quote, settings) });
      },

      onClockAdvance: (fromIndex, toIndex) => {
        const state = get();
        const quote = quoteAt(toIndex, state.settings);

        if (toIndex > fromIndex && state.positions.length > 0) {
          const { closed } = settleCandles(
            state.positions,
            M1_CANDLES.slice(fromIndex + 1, toIndex + 1),
            SYMBOL,
            (candle) => spreadPipsAt(candle.time, state.settings.spreadPips, state.settings.variableSpread),
          );
          if (closed.length > 0) {
            set(withClosedTrades(state, closed, quote));
            closed.forEach(notifyClosed);
            return;
          }
        }
        set({ quote, ...accountFor(state.balance, state.positions, quote, state.settings) });
      },

      resetAccount: (setup) => {
        const settings = sanitizeSettings({ ...get().settings, ...setup });
        set(buildState(settings));
        useToastStore.getState().push({
          tone: 'neutral',
          title: 'Account reset',
          description: `${formatMoney(settings.initialBalance)} · leverage 1:${settings.leverage}`,
        });
      },
    }),
    {
      name: 'fb-trading',
      version: 2,
      storage: createThrottledStorage(),
      // Settings and the whole account persist, so trades and statistics survive a reload.
      partialize: (state) => ({
        settings: state.settings,
        balance: state.balance,
        positions: state.positions,
        closedTrades: state.closedTrades,
        nextNumber: state.nextNumber,
      }),
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<TradingState>;
        const settings = sanitizeSettings(saved.settings);
        const positions = Array.isArray(saved.positions) ? saved.positions.filter(isPosition) : [];
        const closedTrades = Array.isArray(saved.closedTrades) ? saved.closedTrades.filter(isClosedTrade) : [];
        const highest = Math.max(0, ...positions.map((p) => p.number), ...closedTrades.map((t) => t.number));
        const balance =
          typeof saved.balance === 'number' && Number.isFinite(saved.balance) ? saved.balance : settings.initialBalance;
        return { ...current, ...buildState(settings, { balance, positions, closedTrades, nextNumber: highest + 1 }) };
      },
    },
  ),
);
