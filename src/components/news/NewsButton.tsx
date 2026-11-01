import { useState } from 'react';
import { Newspaper } from 'lucide-react';
import { NEWS_EVENTS } from '@/data/newsEvents';
import type { NewsImpact } from '@/domain/news';
import { formatDuration } from '@/lib/format';
import { usePlaybackStore } from '@/stores/playbackStore';
import { useNewsStore } from '@/stores/newsStore';
import { Overlay } from '@/components/ui/Overlay';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Switch } from '@/components/ui/Switch';
import { ToolbarButton } from '@/components/ui/ToolbarButton';
import { NewsEventDetails } from './NewsCard';

const IMPACT_OPTIONS = [
  { value: 'high', label: 'High only' },
  { value: 'medium', label: 'High + medium' },
] as const;

function Calendar() {
  const { visible, minImpact, setVisible, setMinImpact } = useNewsStore();
  const now = usePlaybackStore((state) => state.currentTime);
  const matches = (impact: NewsImpact) => minImpact === 'medium' || impact === 'high';
  const upcoming = NEWS_EVENTS.filter((event) => event.time > now && matches(event.impact)).slice(0, 5);
  const recent = NEWS_EVENTS.filter((event) => event.time <= now && matches(event.impact)).slice(-4).reverse();

  return (
    <div className="space-y-5 p-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-ink">Show on chart</p>
            <p className="text-xs text-ink-subtle">Hover or tap a marker for the details.</p>
          </div>
          <Switch label="Show news on chart" checked={visible} onChange={setVisible} />
        </div>
        <SegmentedControl<NewsImpact> label="Impact filter" options={IMPACT_OPTIONS} value={minImpact} onChange={setMinImpact} />
      </div>

      <section>
        <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-ink-subtle">Coming up</h3>
        {upcoming.length === 0 ? (
          <p className="text-sm text-ink-muted">No more events in the data.</p>
        ) : (
          <ul className="space-y-3">
            {upcoming.map((event) => (
              <li key={event.id} className="rounded-xl border border-line p-3">
                <p className="mb-1.5 font-mono text-xs tabular-nums text-accent">in {formatDuration(event.time - now)}</p>
                <NewsEventDetails event={event} showActual={false} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-ink-subtle">Just released</h3>
        {recent.length === 0 ? (
          <p className="text-sm text-ink-muted">Nothing released yet at this point in the replay.</p>
        ) : (
          <ul className="space-y-3">
            {recent.map((event) => (
              <li key={event.id} className="rounded-xl border border-line p-3">
                <NewsEventDetails event={event} />
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="text-xs text-ink-subtle">Sample calendar: dates follow the usual release schedule, numbers are made up. Future events never show their result.</p>
    </div>
  );
}

export function NewsButton() {
  const [open, setOpen] = useState(false);
  const visible = useNewsStore((state) => state.visible);
  return (
    <>
      <ToolbarButton icon={Newspaper} label="News" active={visible} onClick={() => setOpen(true)} />
      <Overlay open={open} onClose={() => setOpen(false)} title="Economic calendar">
        <Calendar />
      </Overlay>
    </>
  );
}
