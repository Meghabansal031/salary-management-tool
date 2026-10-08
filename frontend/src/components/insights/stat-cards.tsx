import { formatMoney, formatNumber } from "@/lib/format";
import type { Headline } from "@/lib/insights-stats";
import type { GroupStats } from "@/lib/types";

function Card({
  title,
  value,
  detail,
}: {
  title: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      {detail ? (
        <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
      ) : null}
    </div>
  );
}

/** Four headline numbers above the table. `label` turns a group code (such as "IN") into a name. */
export function StatCards({
  headline,
  groupNoun,
  label,
}: {
  headline: Headline;
  groupNoun: string;
  label: (group: GroupStats) => string;
}) {
  const describe = (group: GroupStats | null) =>
    group
      ? {
          value: label(group),
          detail: `Median ${formatMoney(group.median, group.currency)}`,
        }
      : null;
  const highest = describe(headline.highest);
  const lowest = describe(headline.lowest);

  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card title="Employees" value={formatNumber(headline.employees)} />
      <Card title={groupNoun} value={formatNumber(headline.groups)} />
      <Card
        title="Highest median pay"
        value={highest?.value ?? "—"}
        detail={highest?.detail ?? "Switch to US dollars to compare"}
      />
      <Card
        title="Lowest median pay"
        value={lowest?.value ?? "—"}
        detail={lowest?.detail ?? "Switch to US dollars to compare"}
      />
    </div>
  );
}
