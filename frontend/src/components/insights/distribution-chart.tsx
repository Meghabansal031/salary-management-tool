"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Skeleton } from "@/components/ui/skeleton";
import { formatCompact, formatMoney, formatNumber } from "@/lib/format";
import type { DistributionResponse } from "@/lib/types";

interface Point {
  label: string; // axis label: where the band starts
  range: string; // full range, for the tooltip
  count: number;
}

function BinTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: Point }[];
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-md border bg-background p-2 text-sm shadow-sm">
      <p className="font-medium">{point.range}</p>
      <p className="text-muted-foreground">
        {formatNumber(point.count)} employees
      </p>
    </div>
  );
}

/** How salaries are spread: the number of employees in each equal-width salary band. */
export function DistributionChart({
  data,
  loading,
  note,
}: {
  data: DistributionResponse | undefined;
  loading: boolean;
  note: string | null; // for example "Shown in US dollars: choose a country for local currency"
}) {
  const currency = data?.currency ?? null;
  const points: Point[] = (data?.bins ?? []).map((bin) => ({
    label: formatCompact(bin.start),
    range: `${formatMoney(bin.start, currency)} to ${formatMoney(bin.end, currency)}`,
    count: bin.count,
  }));

  return (
    <section
      className="rounded-lg border p-4"
      aria-labelledby="distribution-title"
    >
      <h2 id="distribution-title" className="text-base font-semibold">
        How salaries are spread
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Employees in each salary band{currency ? ` (${currency})` : ""}.
        {note ? ` ${note}` : ""}
      </p>

      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : points.length === 0 ? (
        <p className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          No employees match these filters.
        </p>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={points}
              margin={{ top: 4, right: 8, bottom: 4, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={40} />
              <Tooltip
                content={<BinTooltip />}
                cursor={{ fill: "rgba(37, 99, 235, 0.08)" }}
              />
              <Bar dataKey="count" fill="#2563eb" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
