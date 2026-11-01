import type { LucideIcon } from 'lucide-react';
import { BarChart3, GitCompare, Landmark, LineChart, Shield, Target } from 'lucide-react';
import type { AppView } from '@/stores/uiStore';

export interface NavItem {
  id: AppView;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { id: 'chart', label: 'Chart', shortLabel: 'Chart', icon: LineChart },
  { id: 'markets', label: 'Markets', shortLabel: 'Pairs', icon: Landmark },
  { id: 'strategies', label: 'Strategies', shortLabel: 'Strat', icon: Target },
  { id: 'performance', label: 'Performance', shortLabel: 'Perf', icon: BarChart3 },
  { id: 'comparison', label: 'Compare', shortLabel: 'Cmp', icon: GitCompare },
  { id: 'challenge', label: 'Challenge', shortLabel: 'Prop', icon: Shield },
];
