/** Tiny Web Audio beeps — no asset files needed (works offline). */
export function playTradeSound(kind: 'tp' | 'sl' | 'fill' | 'pending'): void {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    const beep = (freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.08) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      g.gain.setValueAtTime(gain, now + start);
      g.gain.exponentialRampToValueAtTime(0.001, now + start + dur);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + dur + 0.02);
    };
    if (kind === 'tp') {
      // Rising two-tone (pleasant)
      beep(880, 0, 0.12);
      beep(1174, 0.12, 0.18);
    } else if (kind === 'sl') {
      // Lower warning tone
      beep(320, 0, 0.18, 'triangle', 0.1);
      beep(240, 0.16, 0.22, 'triangle', 0.08);
    } else if (kind === 'fill') {
      beep(660, 0, 0.1);
    } else {
      beep(520, 0, 0.08);
      beep(520, 0.1, 0.08);
    }
    // Close context after sounds finish to free resources
    window.setTimeout(() => void ctx.close(), 600);
  } catch {
    // Audio may be blocked until a user gesture — ignore
  }
}
