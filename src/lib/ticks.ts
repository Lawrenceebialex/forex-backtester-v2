/** "Nice" axis tick values (1, 2, 2.5, 5 × 10ⁿ) covering [min, max]. */
export function niceTicks(min: number, max: number, targetCount: number): number[] {
  if (!(max > min)) return [];
  const raw = (max - min) / Math.max(1, targetCount);
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const fraction = raw / magnitude;
  const factor = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
  const step = factor * magnitude;

  const ticks: number[] = [];
  for (let k = Math.ceil(min / step); k * step <= max; k++) ticks.push(Number((k * step).toPrecision(12)));
  return ticks;
}
