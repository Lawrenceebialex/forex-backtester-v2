/**
 * Reads a theme token (space-separated RGB channels, e.g. "9 11 16") and returns a color
 * string canvas-based libraries understand. Used by the chart, which can't consume CSS variables.
 */
export function readCssColor(variable: string, alpha = 1): string {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  const [r, g, b] = raw.split(/\s+/);
  if (!b) return '#888888';
  return alpha >= 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
