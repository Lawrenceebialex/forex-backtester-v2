import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useThemeStore } from '@/stores/themeStore';
import { IconButton } from '@/components/ui/IconButton';

const ICON = 'absolute inset-0 transition-all duration-300';

export function ThemeToggle() {
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const isDark = theme === 'dark';

  return (
    <IconButton label={isDark ? 'Switch to light theme' : 'Switch to dark theme'} onClick={toggleTheme}>
      <span className="relative block h-[18px] w-[18px]">
        <Sun size={18} className={cn(ICON, isDark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-50 opacity-0')} />
        <Moon size={18} className={cn(ICON, isDark ? 'rotate-90 scale-50 opacity-0' : 'rotate-0 scale-100 opacity-100')} />
      </span>
    </IconButton>
  );
}
