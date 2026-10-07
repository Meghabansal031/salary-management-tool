"use client";

import { useMemo, useState } from "react";

import { EmployeeFilters } from "@/components/employees/employee-filters";
import { EmployeeTable } from "@/components/employees/employee-table";
import { PeerBanner } from "@/components/employees/peer-banner";
import { Pagination } from "@/components/employees/pagination";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { useDebounce } from "@/hooks/use-debounce";
import { useEmployees, useFilterOptions } from "@/hooks/use-employees";
import {
  DEFAULT_STATE,
  applyFilters,
  changePageSize,
  clearFilters,
  goToPage,
  hasActiveFilters,
  toListParams,
  toggleSort,
  totalPages,
  type TableState,
} from "@/lib/employee-query";
import { formatNumber } from "@/lib/format";

export default function EmployeesPage() {
  const [state, setState] = useState<TableState>(DEFAULT_STATE);

  // The box updates on every key; the search itself waits until typing pauses.
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300).trim();
  const queryState =
    state.q === debouncedSearch
      ? state
      : applyFilters(state, { q: debouncedSearch });

  const { data, error, isPending, isFetching, refetch } = useEmployees(
    toListParams(queryState),
  );
  const { data: options } = useFilterOptions();

  // If the data shrinks under us, adjust the page before rendering its contents.
  if (data && state.page > totalPages(data.total, state.pageSize)) {
    setState((current) => goToPage(current, current.page, data.total));
  }

  const countryNames = useMemo(
    () =>
      new Map<string, string>(
        (options?.countries ?? []).map((c) => [c.code, c.name]),
      ),
    [options],
  );

  function handleClear() {
    setSearchInput("");
    setState(clearFilters);
  }

  return (
    <>
      <PageHeader
        title="Employees"
        description={
          data
            ? `${formatNumber(data.total)} ${data.total === 1 ? "employee" : "employees"}`
            : "Search, filter and sort employee records."
        }
      />

      <EmployeeFilters
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        values={state}
        options={options}
        onChange={(patch) =>
          setState((current) => applyFilters(current, patch))
        }
        onClear={handleClear}
        canClear={hasActiveFilters(state) || searchInput !== ""}
      />

      {data?.peer_stats ? (
        <PeerBanner
          peers={data.peer_stats}
          countryName={
            countryNames.get(data.peer_stats.country) ?? data.peer_stats.country
          }
        />
      ) : null}

      {error && !data ? (
        <div
          className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700"
          role="alert"
        >
          <p className="font-medium">Could not load employees.</p>
          <p className="mt-1">{error.message}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => refetch()}
          >
            Try again
          </Button>
        </div>
      ) : (
        <>
          <EmployeeTable
            items={data?.items ?? []}
            loading={isPending}
            refreshing={isFetching && !isPending}
            sort={state.sort}
            order={state.order}
            onSort={(field) =>
              setState((current) => toggleSort(current, field))
            }
            countryNames={countryNames}
            peers={data?.peer_stats ?? null}
          />
          <Pagination
            page={state.page}
            pageSize={state.pageSize}
            total={data?.total ?? 0}
            onPage={(page) =>
              setState((current) => goToPage(current, page, data?.total ?? 0))
            }
            onPageSize={(size) =>
              setState((current) => changePageSize(current, size))
            }
          />
        </>
      )}
    </>
  );
}
