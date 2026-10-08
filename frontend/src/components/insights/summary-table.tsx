"use client";

import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { useMemo, useState } from "react";

import { RangeBar } from "@/components/insights/range-bar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney, formatNumber } from "@/lib/format";
import {
  sharedCurrency,
  sortGroupStats,
  type SortDirection,
  type StatKey,
} from "@/lib/insights-stats";
import type { GroupStats } from "@/lib/types";
import { cn } from "@/lib/utils";

const NUMBER_COLUMNS: { key: StatKey; label: string }[] = [
  { key: "count", label: "Employees" },
  { key: "min", label: "Lowest" },
  { key: "median", label: "Median" },
  { key: "average", label: "Average" },
  { key: "max", label: "Highest" },
];

type SortState = { key: StatKey; direction: SortDirection };

function SortableHead({
  column,
  text,
  sort,
  onToggle,
  right,
}: {
  column: StatKey;
  text: string;
  sort: SortState;
  onToggle: (key: StatKey) => void;
  right?: boolean;
}) {
  const active = sort.key === column;
  return (
    <TableHead
      aria-sort={
        active
          ? sort.direction === "asc"
            ? "ascending"
            : "descending"
          : "none"
      }
      className={right ? "text-right" : undefined}
    >
      <Button
        variant="ghost"
        size="sm"
        className={cn("h-8 gap-1", right ? "-mr-3" : "-ml-3")}
        onClick={() => onToggle(column)}
      >
        {text}
        {active ? (
          sort.direction === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5" />
          )
        ) : (
          <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
        )}
      </Button>
    </TableHead>
  );
}

export function SummaryTable({
  items,
  groupLabel,
  label,
  loading,
  refreshing,
}: {
  items: GroupStats[];
  groupLabel: string; // "Country", "Department" or "Job title"
  label: (group: GroupStats) => string;
  loading: boolean;
  refreshing: boolean;
}) {
  const [sort, setSort] = useState<SortState>({
    key: "median",
    direction: "desc",
  });
  const rows = useMemo(
    () => sortGroupStats(items, sort.key, sort.direction),
    [items, sort],
  );

  // The range bars share one scale, which only makes sense when every row is in the same currency.
  const drawBars = sharedCurrency(items) !== null;
  const scaleMax = Math.max(0, ...items.map((item) => item.max));

  function toggle(key: StatKey) {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: key === "group" ? "asc" : "desc" },
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHead
              column="group"
              text={groupLabel}
              sort={sort}
              onToggle={toggle}
            />
            {NUMBER_COLUMNS.slice(0, 2).map(({ key, label: text }) => (
              <SortableHead
                key={key}
                column={key}
                text={text}
                sort={sort}
                onToggle={toggle}
                right
              />
            ))}
            <SortableHead
              column="p25"
              text="Typical range"
              sort={sort}
              onToggle={toggle}
              right
            />
            {NUMBER_COLUMNS.slice(2).map(({ key, label: text }) => (
              <SortableHead
                key={key}
                column={key}
                text={text}
                sort={sort}
                onToggle={toggle}
                right
              />
            ))}
            {drawBars ? (
              <TableHead className="hidden lg:table-cell">Spread</TableHead>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody
          className={cn(refreshing && "opacity-60 transition-opacity")}
        >
          {loading
            ? Array.from({ length: 6 }, (_, row) => (
                <TableRow key={row}>
                  {Array.from({ length: 8 }, (_, cell) => (
                    <TableCell key={cell}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : null}

          {!loading && rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={8}
                className="h-32 text-center text-muted-foreground"
              >
                No employees match these filters.
              </TableCell>
            </TableRow>
          ) : null}

          {!loading
            ? rows.map((row) => (
                <TableRow key={row.group}>
                  <TableCell className="font-medium">{label(row)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(row.count)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(row.min, row.currency)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(row.p25, row.currency)} to{" "}
                    {formatMoney(row.p75, row.currency)}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatMoney(row.median, row.currency)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(row.average, row.currency)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(row.max, row.currency)}
                  </TableCell>
                  {drawBars ? (
                    <TableCell className="hidden lg:table-cell">
                      <RangeBar stats={row} scaleMax={scaleMax} />
                    </TableCell>
                  ) : null}
                </TableRow>
              ))
            : null}
        </TableBody>
      </Table>
    </div>
  );
}
