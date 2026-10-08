import { formatMoney } from "@/lib/format";
import { rangeBar } from "@/lib/insights-stats";
import type { GroupStats } from "@/lib/types";

/**
 * A mini chart of one row on a scale shared by all rows: a thin line from the lowest to the
 * highest salary, a blue box for the typical range (the middle half) and a dark tick for the median.
 */
export function RangeBar({
  stats,
  scaleMax,
}: {
  stats: GroupStats;
  scaleMax: number;
}) {
  const bar = rangeBar(stats, scaleMax);
  return (
    <div
      className="relative h-4 w-44"
      role="img"
      aria-label={`Lowest ${formatMoney(stats.min, stats.currency)}, typical range ${formatMoney(stats.p25, stats.currency)} to ${formatMoney(stats.p75, stats.currency)}, median ${formatMoney(stats.median, stats.currency)}, highest ${formatMoney(stats.max, stats.currency)}`}
    >
      <div
        className="absolute top-1/2 h-px -translate-y-1/2 bg-muted-foreground/50"
        style={{ left: `${bar.lineLeft}%`, width: `${bar.lineWidth}%` }}
      />
      <div
        className="absolute top-0.5 h-3 rounded-sm bg-blue-200"
        style={{ left: `${bar.boxLeft}%`, width: `${bar.boxWidth}%` }}
      />
      <div
        className="absolute top-0 h-4 w-0.5 bg-blue-700"
        style={{ left: `${bar.medianLeft}%` }}
      />
    </div>
  );
}
