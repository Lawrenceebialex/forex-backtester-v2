import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';

/**
 * Every colour is a CSS variable holding space-separated RGB channels (see src/index.css),
 * so Tailwind's opacity modifiers (`bg-accent/10`) keep working and a theme switch is
 * just a change of `data-theme` on <html> — no `dark:` variants needed anywhere.
 */
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        canvas: token('canvas'),
        surface: token('surface'),
        raised: token('raised'),
        overlay: token('overlay'),
        line: token('line'),
        'line-strong': token('line-strong'),
        ink: token('ink'),
        'ink-muted': token('ink-muted'),
        'ink-subtle': token('ink-subtle'),
        accent: token('accent'),
        'accent-ink': token('accent-ink'),
        bull: token('bull'),
        bear: token('bear'),
        warn: token('warn'),
        chart: token('chart-bg'),
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"JetBrains Mono Variable"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        overlay: 'var(--shadow-overlay)',
      },
      keyframes: {
        'sheet-up': { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
        'pop-in': {
          from: { opacity: '0', transform: 'translateY(-6px) scale(0.98)' },
          to: { opacity: '1', transform: 'none' },
        },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
      },
      animation: {
        'sheet-up': 'sheet-up 0.28s cubic-bezier(0.22, 1, 0.36, 1)',
        'pop-in': 'pop-in 0.16s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
      },
    },
  },
  plugins: [
    // Bigger touch targets on phones and iPads, compact controls for mouse users.
    plugin(({ addVariant }) => {
      addVariant('coarse', '@media (pointer: coarse)');
    }),
  ],
} satisfies Config;
