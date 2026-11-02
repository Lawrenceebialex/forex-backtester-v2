# React #185 fix — unstable Zustand selectors

## Root cause

Zustand 5 uses `useSyncExternalStore`. If a selector returns a **new array or object on every call**, React sees a changed snapshot on every check and schedules another render → **Maximum update depth exceeded (#185)**.

This matches the crash after leaving the landing page (Dashboard mounts first).

## Bad pattern

```ts
const strategies = useStrategyStore((s) => s.strategies.filter((x) => !x.archived));
```

## Fixed pattern

```ts
const allStrategies = useStrategyStore((s) => s.strategies); // stable reference from the store
const strategies = useMemo(() => allStrategies.filter((x) => !x.archived), [allStrategies]);
```

Alternatively: `useShallow` from `zustand/react/shallow` for multi-field picks.

## Files fixed

- `src/components/dashboard/DashboardView.tsx`
- `src/components/backtests/NewBacktestView.tsx`

## Audited safe cases

- Selectors returning primitives (numbers, strings, booleans)
- Selectors returning store field references without mapping (`s.sessions`, `s.closedTrades`)
- `.filter(...).length` returns a number — safe
- Filtering **outside** the selector (e.g. StrategiesView `visible = strategies.filter(...)`)
