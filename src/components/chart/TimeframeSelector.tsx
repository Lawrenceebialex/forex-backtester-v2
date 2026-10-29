import { TIMEFRAMES } from '@/domain/market';
import { usePlaybackStore } from '@/stores/playbackStore';
import { SegmentedControl } from '@/components/ui/SegmentedControl';

const OPTIONS = TIMEFRAMES.map((timeframe) => ({ value: timeframe, label: timeframe }));

export function TimeframeSelector() {
  const timeframe = usePlaybackStore((state) => state.timeframe);
  const setTimeframe = usePlaybackStore((state) => state.setTimeframe);
  return <SegmentedControl label="Timeframe" options={OPTIONS} value={timeframe} onChange={setTimeframe} />;
}
