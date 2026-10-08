"use client";

import { X } from "lucide-react";

import { FilterSelect } from "@/components/filters/filter-select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  GROUP_LABELS,
  localCurrencyAllowed,
  type InsightsFilterPatch,
  type InsightsState,
} from "@/lib/insights-query";
import type { Basis, GroupBy, MetaFilters } from "@/lib/types";

const GROUPS: GroupBy[] = ["country", "department", "job_title"];

export function InsightsControls({
  state,
  options,
  onGroupBy,
  onBasis,
  onFilter,
  onClear,
  canClear,
}: {
  state: InsightsState;
  options: MetaFilters | undefined;
  onGroupBy: (groupBy: GroupBy) => void;
  onBasis: (basis: Basis) => void;
  onFilter: (patch: InsightsFilterPatch) => void;
  onClear: () => void;
  canClear: boolean;
}) {
  const localPossible = localCurrencyAllowed(state);

  return (
    <div className="mb-6 grid gap-4">
      <div className="flex flex-wrap items-end gap-6">
        <div className="grid gap-1.5">
          <span className="text-sm font-medium">Group by</span>
          <Tabs
            value={state.groupBy}
            onValueChange={(value) => onGroupBy(value as GroupBy)}
          >
            <TabsList>
              {GROUPS.map((group) => (
                <TabsTrigger key={group} value={group}>
                  {GROUP_LABELS[group]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div className="grid gap-1.5">
          <span className="text-sm font-medium">Amounts in</span>
          <Tabs
            value={localPossible ? state.basis : "usd"}
            onValueChange={(value) => onBasis(value as Basis)}
          >
            <TabsList>
              <TabsTrigger value="usd">US dollars</TabsTrigger>
              <TabsTrigger value="local" disabled={!localPossible}>
                Local currency
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {!localPossible ? (
          <p className="max-w-xs text-sm text-muted-foreground">
            Local currency compares like with like, so it needs one country.
            Choose a country below, or group by country.
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <FilterSelect
          label="Countries"
          value={state.country}
          onValueChange={(country) => onFilter({ country })}
          options={(options?.countries ?? []).map((c) => ({
            value: c.code,
            label: c.name,
          }))}
        />
        <FilterSelect
          label="Departments"
          value={state.department}
          onValueChange={(department) => onFilter({ department })}
          options={(options?.departments ?? []).map((d) => ({
            value: d,
            label: d,
          }))}
        />
        <FilterSelect
          label="Job titles"
          value={state.job_title}
          onValueChange={(job_title) => onFilter({ job_title })}
          options={(options?.job_titles ?? []).map((t) => ({
            value: t,
            label: t,
          }))}
        />
        {canClear ? (
          <Button variant="ghost" size="sm" onClick={onClear}>
            <X className="mr-1 h-4 w-4" />
            Clear filters
          </Button>
        ) : null}
      </div>
    </div>
  );
}
