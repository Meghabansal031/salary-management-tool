"use client";

import { Search, X } from "lucide-react";

import { FilterSelect } from "@/components/filters/filter-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FilterPatch } from "@/lib/employee-query";
import type { MetaFilters } from "@/lib/types";

export function EmployeeFilters({
  searchInput,
  onSearchChange,
  values,
  options,
  onChange,
  onClear,
  canClear,
}: {
  searchInput: string;
  onSearchChange: (value: string) => void;
  values: { country: string; department: string; job_title: string };
  options: MetaFilters | undefined;
  onChange: (patch: FilterPatch) => void;
  onClear: () => void;
  canClear: boolean;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <div className="relative w-full sm:w-72">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchInput}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search name or email"
          aria-label="Search by name or email"
          className="pl-9"
        />
      </div>
      <FilterSelect
        label="Countries"
        value={values.country}
        onValueChange={(country) => onChange({ country })}
        options={(options?.countries ?? []).map((c) => ({
          value: c.code,
          label: c.name,
        }))}
      />
      <FilterSelect
        label="Departments"
        value={values.department}
        onValueChange={(department) => onChange({ department })}
        options={(options?.departments ?? []).map((d) => ({
          value: d,
          label: d,
        }))}
      />
      <FilterSelect
        label="Job titles"
        value={values.job_title}
        onValueChange={(job_title) => onChange({ job_title })}
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
  );
}
