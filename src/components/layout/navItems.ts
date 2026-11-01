import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  BookOpen,
  FlaskConical,
  FolderKanban,
  GitCompare,
  LayoutDashboard,
  Settings,
  Shield,
  Target,
} from 'lucide-react';
import type { AppView } from '@/stores/uiStore';

export interface NavItem {
  id: AppView;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  primary?: boolean;
}

export const PRIMARY_NAV: readonly NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', shortLabel: 'Home', icon: LayoutDashboard, primary: true },
  { id: 'new-backtest', label: 'New Backtest', shortLabel: 'New', icon: FlaskConical, primary: true },
  { id: 'backtests', label: 'My Backtests', shortLabel: 'Tests', icon: FolderKanban, primary: true },
  { id: 'strategies', label: 'Strategies', shortLabel: 'Strat', icon: Target, primary: true },
  { id: 'analytics', label: 'Analytics', shortLabel: 'Stats', icon: BarChart3, primary: true },
  { id: 'journal', label: 'Journal', shortLabel: 'Log', icon: BookOpen, primary: true },
  { id: 'settings', label: 'Settings', shortLabel: 'Set', icon: Settings, primary: true },
];

export const SECONDARY_NAV: readonly NavItem[] = [
  { id: 'comparison', label: 'Compare', shortLabel: 'Cmp', icon: GitCompare },
  { id: 'challenge', label: 'Challenge', shortLabel: 'Prop', icon: Shield },
];

export const MOBILE_NAV: readonly NavItem[] = [
  PRIMARY_NAV[0],
  PRIMARY_NAV[1],
  PRIMARY_NAV[2],
  PRIMARY_NAV[4],
  PRIMARY_NAV[5],
];
