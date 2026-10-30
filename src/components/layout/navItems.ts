import { Activity, Gauge, GitCompare, Layers, type LucideIcon } from 'lucide-react';
import type { AppView } from '@/stores/uiStore';

export interface NavItem {
  id: AppView;
  label: string;
  /** Shorter label for the phone tab bar. */
  shortLabel: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { id: 'chart', label: 'Chart', shortLabel: 'Chart', icon: Activity },
  { id: 'strategies', label: 'Strategies', shortLabel: 'Strategies', icon: Layers },
  { id: 'performance', label: 'Performance', shortLabel: 'Stats', icon: Gauge },
  { id: 'comparison', label: 'Comparison', shortLabel: 'Compare', icon: GitCompare },
];
