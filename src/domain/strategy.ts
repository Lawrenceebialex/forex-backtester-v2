export interface Strategy {
  id: string;
  name: string;
  /** Used for this strategy's line in comparison charts. */
  color: string;
  archived: boolean;
  createdAt: number;
}

export const STRATEGY_COLORS = ['#3d70f2', '#10b981', '#f59e0b', '#a855f7', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'] as const;
export const MAX_STRATEGY_NAME_LENGTH = 40;

export const DEFAULT_STRATEGY: Strategy = {
  id: 'strategy-default',
  name: 'My strategy',
  color: STRATEGY_COLORS[0],
  archived: false,
  createdAt: 0,
};
