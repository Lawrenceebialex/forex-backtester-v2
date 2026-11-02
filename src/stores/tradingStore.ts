import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { M1_CANDLES, SYMBOL, indexAtOrBefore } from '@/data/marketData';
import {
  BALANCE_LIMITS,
  DEFAULT_TRADING_SETTINGS,
  LEVERAGE_OPTIONS,
  SPREAD_LIMITS,
  isClosedTrade,
  isPendingOrder,
  isPosition,
  type ClosedTrade,
  type OrderRequest,
  type OrderResult,
  type PendingOrder,
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
  quote: Quote;
  equity: number;
  floatingPnl: number;
  usedMargin: number;
  freeMargin: number;
  positions: Position[];
  pendingOrders: PendingOrder[];
  closedTrades: ClosedTrade[];
  nextNumber: number;

  placeOrder: (request: OrderRequest) => OrderResult;
  closePosition: (id: string) => void;
  closeAll: () => void;
  cancelPending: (id: string) => void;
  modifyPositionStops: (id: string, stopLoss: number | null, takeProfit: number | null) => void;
  setSpreadPips: (pips: number) => void;
  setVariableSpread: (variable: boolean) => void;
  onClockAdvance: (fromIndex: number, toIndex: number) => void;
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
  saved?: {
    balance: number;
    positions: Position[];
    pendingOrders: PendingOrder[];
    closedTrades: ClosedTrade[];
    nextNumber: number;
  },
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
    pendingOrders: saved?.pendingOrders ?? [],
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
    gradualOutcome: typeof source.gradualOutcome === 'boolean' ? source.gradualOutcome : defaults.gradualOutcome,
    gradualSeconds: number(source.gradualSeconds, defaults.gradualSeconds),
  };
}

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

const sideLabel = (side: 'buy' | 'sell') => (side === 'buy' ? 'Buy' : 'Sell');
const resultTone = (pnl: number) => (pnl > 0 ? 'bull' : pnl < 0 ? 'bear' : 'neutral');

function notifyClosed(trade: ClosedTrade) {
  const title =
    trade.reason === 'stop-loss' ? 'Stop loss hit' : trade.reason === 'take-profit' ? 'Take profit hit' : 'Position closed';
  useToastStore.getState().push({
    tone: resultTone(trade.pnl),
    title,
    description: `${sideLabel(trade.side)} ${trade.lots.toFixed(2)} ${SYMBOL.symbol} · ${formatSignedMoney(trade.pnl)} (${formatPips(trade.pips)} pips)`,
  });
}

/** Did this candle fill a pending limit/stop? Uses bid OHLC; ask = bid + spread. */
function pendingTriggered(
  order: PendingOrder,
  candle: { time: number; low: number; high: number },
  spreadPips: number,
): boolean {
  const askOffset = spreadPips * SYMBOL.pipSize;
  const bidLow = candle.low;
  const bidHigh = candle.high;
  const askLow = candle.low + askOffset;
  const askHigh = candle.high + askOffset;
  if (order.orderType === 'limit') {
    // Buy limit: fill when ask drops to or below price. Sell limit: bid rises to or above price.
    if (order.side === 'buy') return askLow <= order.price;
    return bidHigh >= order.price;
  }
  // Stop: buy stop when ask rises through; sell stop when bid falls through.
  if (order.side === 'buy') return askHigh >= order.price;
  return bidLow <= order.price;
}

function fillPending(order: PendingOrder, time: number): Position {
  return {
    id: order.id,
    number: order.number,
    side: order.side,
    lots: order.lots,
    entryPrice: order.price,
    entryTime: time,
    stopLoss: order.stopLoss,
    takeProfit: order.takeProfit,
    strategyId: order.strategyId,
  };
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
        const orderType = request.orderType ?? 'market';
        const strategyId = useStrategyStore.getState().activeId;

        if (orderType === 'limit' || orderType === 'stop') {
          const limitPrice = request.limitPrice;
          if (limitPrice == null || !Number.isFinite(limitPrice) || limitPrice <= 0) {
            return { ok: false, error: 'Enter a valid price for the pending order.' };
          }
          // Direction checks (same as MT5)
          if (orderType === 'limit') {
            if (request.side === 'buy' && limitPrice >= quote.ask) {
              return { ok: false, error: `Buy limit must be below ask (${formatPrice(quote.ask, SYMBOL)}).` };
            }
            if (request.side === 'sell' && limitPrice <= quote.bid) {
              return { ok: false, error: `Sell limit must be above bid (${formatPrice(quote.bid, SYMBOL)}).` };
            }
          } else {
            if (request.side === 'buy' && limitPrice <= quote.ask) {
              return { ok: false, error: `Buy stop must be above ask (${formatPrice(quote.ask, SYMBOL)}).` };
            }
            if (request.side === 'sell' && limitPrice >= quote.bid) {
              return { ok: false, error: `Sell stop must be below bid (${formatPrice(quote.bid, SYMBOL)}).` };
            }
          }

          const entry = limitPrice;
          const stopLoss = request.stopLoss ? resolveStop(request.side, 'stop-loss', request.stopLoss, entry, SYMBOL) : null;
          const takeProfit = request.takeProfit
            ? resolveStop(request.side, 'take-profit', request.takeProfit, entry, SYMBOL)
            : null;

          // Margin check as if it filled at limit price
          const probeQuote = makeQuote(entry, quote.spreadPips, SYMBOL);
          const error = validateOrder(
            { side: request.side, lots, stopLoss, takeProfit },
            {
              quote: probeQuote,
              freeMargin: accountFor(state.balance, state.positions, probeQuote, state.settings).freeMargin,
              symbol: SYMBOL,
              leverage: state.settings.leverage,
            },
          );
          if (error) return { ok: false, error };

          const pending: PendingOrder = {
            id: `p${state.nextNumber}`,
            number: state.nextNumber,
            side: request.side,
            lots,
            orderType,
            price: entry,
            stopLoss,
            takeProfit,
            strategyId,
            createdTime: M1_CANDLES[index].time,
          };
          set({ pendingOrders: [...state.pendingOrders, pending], nextNumber: state.nextNumber + 1, quote });
          useToastStore.getState().push({
            tone: 'neutral',
            title: `${orderType === 'limit' ? 'Limit' : 'Stop'} ${sideLabel(request.side)} placed`,
            description: `${lots.toFixed(2)} ${SYMBOL.symbol} @ ${formatPrice(pending.price, SYMBOL)}`,
          });
          return { ok: true, pending };
        }

        const entry = fillPrice(request.side, quote);
        const stopLoss = request.stopLoss ? resolveStop(request.side, 'stop-loss', request.stopLoss, entry, SYMBOL) : null;
        const takeProfit = request.takeProfit
          ? resolveStop(request.side, 'take-profit', request.takeProfit, entry, SYMBOL)
          : null;

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
          strategyId,
        };
        const positions = [...state.positions, position];
        set({
          positions,
          nextNumber: state.nextNumber + 1,
          quote,
          ...accountFor(state.balance, positions, quote, state.settings),
        });

        useToastStore.getState().push({
          tone: request.side === 'buy' ? 'bull' : 'bear',
          title: `${sideLabel(position.side)} ${lots.toFixed(2)} ${SYMBOL.symbol} filled`,
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

      cancelPending: (id) => {
        const state = get();
        const order = state.pendingOrders.find((o) => o.id === id);
        if (!order) return;
        set({ pendingOrders: state.pendingOrders.filter((o) => o.id !== id) });
        useToastStore.getState().push({
          tone: 'neutral',
          title: 'Pending cancelled',
          description: `${order.orderType} ${sideLabel(order.side)} #${order.number}`,
        });
      },

      modifyPositionStops: (id, stopLoss, takeProfit) => {
        const state = get();
        const position = state.positions.find((p) => p.id === id);
        if (!position) return;
        const reference = position.entryPrice;
        if (stopLoss !== null) {
          const valid = position.side === 'buy' ? stopLoss < reference : stopLoss > reference;
          if (!valid) {
            useToastStore.getState().push({
              tone: 'bear',
              title: 'Invalid stop loss',
              description: 'SL must be on the protective side of entry.',
            });
            return;
          }
        }
        if (takeProfit !== null) {
          const valid = position.side === 'buy' ? takeProfit > reference : takeProfit < reference;
          if (!valid) {
            useToastStore.getState().push({
              tone: 'bear',
              title: 'Invalid take profit',
              description: 'TP must be on the profit side of entry.',
            });
            return;
          }
        }
        set({
          positions: state.positions.map((p) =>
            p.id === id
              ? {
                  ...p,
                  stopLoss: stopLoss === null ? null : roundTo(stopLoss, SYMBOL.pricePrecision),
                  takeProfit: takeProfit === null ? null : roundTo(takeProfit, SYMBOL.pricePrecision),
                }
              : p,
          ),
        });
        useToastStore.getState().push({
          tone: 'neutral',
          title: `Stops updated #${position.number}`,
          description: `SL ${stopLoss != null ? formatPrice(stopLoss, SYMBOL) : '—'} · TP ${takeProfit != null ? formatPrice(takeProfit, SYMBOL) : '—'}`,
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

        if (toIndex <= fromIndex) {
          set({ quote, ...accountFor(state.balance, state.positions, quote, state.settings) });
          return;
        }

        const candles = M1_CANDLES.slice(fromIndex + 1, toIndex + 1);
        let positions = [...state.positions];
        let pending = [...state.pendingOrders];
        const filledNotices: Position[] = [];

        // Fill pending against each new candle, then settle SL/TP on opens
        for (const candle of candles) {
          const spread = spreadPipsAt(candle.time, state.settings.spreadPips, state.settings.variableSpread);
          const stillPending: PendingOrder[] = [];
          for (const order of pending) {
            if (pendingTriggered(order, candle, spread)) {
              const pos = fillPending(order, candle.time);
              positions.push(pos);
              filledNotices.push(pos);
            } else {
              stillPending.push(order);
            }
          }
          pending = stillPending;
        }

        const { open, closed } = settleCandles(
          positions,
          candles,
          SYMBOL,
          (candle) => spreadPipsAt(candle.time, state.settings.spreadPips, state.settings.variableSpread),
        );

        if (closed.length > 0 || filledNotices.length > 0 || pending.length !== state.pendingOrders.length) {
          const balance = roundMoney(state.balance + closed.reduce((sum, t) => sum + t.pnl, 0));
          set({
            positions: open,
            pendingOrders: pending,
            balance,
            closedTrades: closed.length ? [...state.closedTrades, ...closed] : state.closedTrades,
            quote,
            ...accountFor(balance, open, quote, state.settings),
          });
          for (const pos of filledNotices) {
            useToastStore.getState().push({
              tone: pos.side === 'buy' ? 'bull' : 'bear',
              title: `Pending filled #${pos.number}`,
              description: `${sideLabel(pos.side)} ${pos.lots.toFixed(2)} @ ${formatPrice(pos.entryPrice, SYMBOL)}`,
            });
          }
          closed.forEach(notifyClosed);
          return;
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
      version: 3,
      storage: createThrottledStorage(),
      partialize: (state) => ({
        settings: state.settings,
        balance: state.balance,
        positions: state.positions,
        pendingOrders: state.pendingOrders,
        closedTrades: state.closedTrades,
        nextNumber: state.nextNumber,
      }),
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<TradingState>;
        const settings = sanitizeSettings(saved.settings);
        const positions = Array.isArray(saved.positions) ? saved.positions.filter(isPosition) : [];
        const pendingOrders = Array.isArray(saved.pendingOrders) ? saved.pendingOrders.filter(isPendingOrder) : [];
        const closedTrades = Array.isArray(saved.closedTrades) ? saved.closedTrades.filter(isClosedTrade) : [];
        const highest = Math.max(
          0,
          ...positions.map((p) => p.number),
          ...pendingOrders.map((p) => p.number),
          ...closedTrades.map((t) => t.number),
        );
        const balance =
          typeof saved.balance === 'number' && Number.isFinite(saved.balance) ? saved.balance : settings.initialBalance;
        return {
          ...current,
          ...buildState(settings, { balance, positions, pendingOrders, closedTrades, nextNumber: highest + 1 }),
        };
      },
    },
  ),
);
