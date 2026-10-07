"use client";

import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FilterPatch } from "@/lib/employee-query";
import type { MetaFilters } from "@/lib/types";

// The select component does not allow an empty value, so "all" travels as this marker.
const ALL = "__all__";

function FilterSelect({
  label,
  value,
  onValueChange,
  options,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <Select
      value={value || ALL}
      onValueChange={(next) => onValueChange(next === ALL ? "" : (next ?? ""))}
    >
      <SelectTrigger className="w-full sm:w-52" aria-label={label}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{`All ${label.toLowerCase()}`}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

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
        options={(options?.countries ?? []).map((c) => ({ value: c.code, label: c.name }))}
      />
      <FilterSelect
        label="Departments"
        value={values.department}
        onValueChange={(department) => onChange({ department })}
        options={(options?.departments ?? []).map((d) => ({ value: d, label: d }))}
      />
      <FilterSelect
        label="Job titles"
        value={values.job_title}
        onValueChange={(job_title) => onChange({ job_title })}
        options={(options?.job_titles ?? []).map((t) => ({ value: t, label: t }))}
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
