import { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { REPLAY_RANGE, snapToCandleTime } from '@/data/marketData';
import { formatVirtualTime } from '@/lib/formatTime';
import { parseUtcDateTime, toDateInputValue, toTimeInputValue } from '@/lib/dateJump';
import { usePlaybackStore } from '@/stores/playbackStore';
import { useToastStore } from '@/stores/toastStore';
import { Overlay } from '@/components/ui/Overlay';
import { ToolbarButton } from '@/components/ui/ToolbarButton';

const QUICK_TIMES = [
  { label: 'Day start', time: '00:00' },
  { label: 'London 07:00', time: '07:00' },
  { label: 'New York 13:00', time: '13:00' },
] as const;

const MIN_DATE = toDateInputValue(REPLAY_RANGE.from);
const MAX_DATE = toDateInputValue(REPLAY_RANGE.to);
const INPUT =
  'h-10 w-full rounded-lg border border-line bg-surface px-3 font-mono text-sm tabular-nums text-ink outline-none transition-colors focus:border-accent coarse:h-11 coarse:text-base';

function JumpForm({ onDone }: { onDone: () => void }) {
  const jumpTo = usePlaybackStore((state) => state.jumpTo);
  const now = usePlaybackStore.getState().currentTime;
  const [date, setDate] = useState(() => toDateInputValue(now));
  const [time, setTime] = useState(() => toTimeInputValue(now));

  const requested = parseUtcDateTime(date, time);
  const inRange = date >= MIN_DATE && date <= MAX_DATE;
  const landing = requested !== null && inRange ? snapToCandleTime(requested) : null;
  const goingBack = landing !== null && landing < now;

  const go = () => {
    if (landing === null) return;
    jumpTo(landing);
    useToastStore.getState().push({ tone: 'neutral', title: 'Jumped to date', description: `${formatVirtualTime(landing)} UTC` });
    onDone();
  };

  return (
    <div className="space-y-4 p-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-[11px] text-ink-subtle">Date (UTC)</span>
          <input type="date" value={date} min={MIN_DATE} max={MAX_DATE} onChange={(event) => setDate(event.target.value)} className={INPUT} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] text-ink-subtle">Time (UTC)</span>
          <input type="time" value={time} onChange={(event) => setTime(event.target.value)} className={INPUT} />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        {QUICK_TIMES.map((quick) => (
          <button
            key={quick.time}
            type="button"
            onClick={() => setTime(quick.time)}
            className="h-8 rounded-full bg-overlay px-3 text-xs text-ink-muted transition-colors hover:text-ink coarse:h-10"
          >
            {quick.label}
          </button>
        ))}
      </div>

      <div className="min-h-10 text-xs">
        {landing !== null ? (
          <>
            <p className="font-mono tabular-nums text-ink">Lands on {formatVirtualTime(landing)} UTC</p>
            <p className="mt-0.5 text-ink-subtle">
              {goingBack ? 'Going back in time: your account, positions and trades stay exactly as they are.' : 'Open positions are checked against the candles you skip.'}
            </p>
          </>
        ) : (
          <p role="alert" className="text-bear">
            {requested === null ? 'Enter a valid date and time.' : `No data for that date. Available: ${MIN_DATE} to ${MAX_DATE}.`}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={go}
        disabled={landing === null}
        className="h-10 w-full rounded-lg bg-accent text-sm font-medium text-accent-ink transition hover:brightness-110 disabled:opacity-40 coarse:h-11"
      >
        Go to date
      </button>
    </div>
  );
}

export function JumpToDate() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <ToolbarButton icon={CalendarDays} label="Go to date" active={open} onClick={() => setOpen(true)} />
      <Overlay open={open} onClose={() => setOpen(false)} title="Go to date">
        <JumpForm onDone={() => setOpen(false)} />
      </Overlay>
    </>
  );
}
