"use client";

import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  Pencil,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
import { formatDate, formatMoney } from "@/lib/format";
import {
  PEER_LABELS,
  formatPercentFromMedian,
  peerPosition,
  percentFromMedian,
  type PeerPosition,
} from "@/lib/peer";
import type { Employee, PeerStats, SortField, SortOrder } from "@/lib/types";
import { cn } from "@/lib/utils";

const COLUMNS: { field: SortField; label: string; align?: "right" }[] = [
  { field: "full_name", label: "Name" },
  { field: "job_title", label: "Job title" },
  { field: "department", label: "Department" },
  { field: "country", label: "Country" },
  { field: "salary", label: "Annual salary", align: "right" },
  { field: "hire_date", label: "Hired" },
];

// The sortable columns plus one for the row actions.
const COLUMN_COUNT = COLUMNS.length + 1;

const BADGE_STYLES: Record<Exclude<PeerPosition, "within">, string> = {
  "far-above": "border-red-300 bg-red-50 text-red-700",
  above: "border-amber-300 bg-amber-50 text-amber-700",
  below: "border-sky-300 bg-sky-50 text-sky-700",
  "far-below": "border-indigo-300 bg-indigo-50 text-indigo-700",
};

function SortIcon({ active, order }: { active: boolean; order: SortOrder }) {
  if (!active) return <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />;
  return order === "asc" ? (
    <ArrowUp className="h-3.5 w-3.5" />
  ) : (
    <ArrowDown className="h-3.5 w-3.5" />
  );
}

export function EmployeeTable({
  items,
  loading,
  refreshing,
  sort,
  order,
  onSort,
  onEdit,
  onDelete,
  countryNames,
  peers,
}: {
  items: Employee[];
  loading: boolean; // first load: show placeholder rows
  refreshing: boolean; // a new page or filter is loading: dim the old rows
  sort: SortField;
  order: SortOrder;
  onSort: (field: SortField) => void;
  onEdit: (employee: Employee) => void;
  onDelete: (employee: Employee) => void;
  countryNames: Map<string, string>;
  peers: PeerStats | null;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            {COLUMNS.map(({ field, label, align }) => (
              <TableHead
                key={field}
                aria-sort={
                  sort === field
                    ? order === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                }
                className={align === "right" ? "text-right" : undefined}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-8 gap-1",
                    align === "right" ? "-mr-3" : "-ml-3",
                  )}
                  onClick={() => onSort(field)}
                >
                  {label}
                  <SortIcon active={sort === field} order={order} />
                </Button>
              </TableHead>
            ))}
            <TableHead className="w-24">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody
          className={cn(refreshing && "opacity-60 transition-opacity")}
        >
          {loading
            ? Array.from({ length: 8 }, (_, row) => (
                <TableRow key={row}>
                  {Array.from({ length: COLUMN_COUNT }, (_, cell) => (
                    <TableCell key={cell}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : null}

          {!loading && items.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={COLUMN_COUNT}
                className="h-32 text-center text-muted-foreground"
              >
                No employees match these filters.
              </TableCell>
            </TableRow>
          ) : null}

          {!loading
            ? items.map((employee) => {
                const position = peerPosition(employee.salary, peers);
                return (
                  <TableRow key={employee.id}>
                    <TableCell>
                      <div className="font-medium">{employee.full_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {employee.email}
                      </div>
                    </TableCell>
                    <TableCell>{employee.job_title}</TableCell>
                    <TableCell>{employee.department}</TableCell>
                    <TableCell>
                      {countryNames.get(employee.country) ?? employee.country}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        {position && position !== "within" ? (
                          <Badge
                            variant="outline"
                            className={BADGE_STYLES[position]}
                          >
                            {PEER_LABELS[position]}
                          </Badge>
                        ) : null}
                        <div className="text-right">
                          <div className="tabular-nums">
                            {formatMoney(employee.salary, employee.currency)}
                          </div>
                          {position && peers ? (
                            <div className="text-xs text-muted-foreground">
                              {formatPercentFromMedian(
                                percentFromMedian(employee.salary, peers),
                              )}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(employee.hire_date)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Edit ${employee.full_name}`}
                          onClick={() => onEdit(employee)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete ${employee.full_name}`}
                          onClick={() => onDelete(employee)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            : null}
        </TableBody>
      </Table>
    </div>
  );
}
