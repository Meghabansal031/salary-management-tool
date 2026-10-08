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
import { formatMoney, formatNumber, formatPercent } from "@/lib/format";
import type { HeadcountResponse } from "@/lib/types";

interface Point {
  name: string;
  headcount: number;
  share: number;
  averageUsd: number;
}

function CountryTooltip({
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
      <p className="font-medium">{point.name}</p>
      <p className="text-muted-foreground">
        {formatNumber(point.headcount)} employees ({formatPercent(point.share)})
      </p>
      <p className="text-muted-foreground">
        Average salary {formatMoney(point.averageUsd, "USD")}
      </p>
    </div>
  );
}

/** Employees per country, biggest first. Hover a bar for the share and the average salary in USD. */
export function HeadcountChart({
  data,
  loading,
}: {
  data: HeadcountResponse | undefined;
  loading: boolean;
}) {
  const points: Point[] = (data?.items ?? []).map((item) => ({
    name: item.country_name,
    headcount: item.headcount,
    share: item.share_percent,
    averageUsd: item.average_salary_usd,
  }));

  return (
    <section
      className="rounded-lg border p-4"
      aria-labelledby="headcount-title"
    >
      <h2 id="headcount-title" className="text-base font-semibold">
        Headcount by country
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">
        {data ? `${formatNumber(data.total)} employees. ` : ""}Hover a bar for
        the share and the average salary in US dollars.
      </p>

      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : points.length === 0 ? (
        <p className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          No employees match these filters.
        </p>
      ) : (
        <div className="w-full" style={{ height: 48 + points.length * 30 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={points}
              layout="vertical"
              margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis
                type="number"
                allowDecimals={false}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={140}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                content={<CountryTooltip />}
                cursor={{ fill: "rgba(37, 99, 235, 0.08)" }}
              />
              <Bar dataKey="headcount" fill="#2563eb" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
