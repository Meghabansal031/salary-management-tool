"use client";

import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { DeleteEmployeeDialog } from "@/components/employees/delete-employee-dialog";
import { EmployeeFilters } from "@/components/employees/employee-filters";
import { EmployeeFormDialog } from "@/components/employees/employee-form-dialog";
import { EmployeeTable } from "@/components/employees/employee-table";
import { Pagination } from "@/components/employees/pagination";
import { PeerBanner } from "@/components/employees/peer-banner";
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
  type TableState,
} from "@/lib/employee-query";
import { formatNumber } from "@/lib/format";
import type { Employee } from "@/lib/types";

export default function EmployeesPage() {
  const [state, setState] = useState<TableState>(DEFAULT_STATE);

  // The box updates on every key; the search itself waits until typing pauses.
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300).trim();
  const queryState = useMemo(
    () => applyFilters(state, { q: debouncedSearch }),
    [state, debouncedSearch],
  );

  const { data, error, isPending, isFetching, refetch } = useEmployees(
    toListParams(queryState),
  );
  const { data: options } = useFilterOptions();

  const countryNames = useMemo(
    () =>
      new Map<string, string>(
        (options?.countries ?? []).map((c) => [c.code, c.name]),
      ),
    [options],
  );

  // Which dialog is open, and the confirmation message shown after a change.
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [deleting, setDeleting] = useState<Employee | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

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
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Add employee
          </Button>
        }
      />

      {notice ? (
        <div
          className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800"
          role="status"
        >
          {notice}
        </div>
      ) : null}

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
            sort={queryState.sort}
            order={queryState.order}
            onSort={(field) =>
              setState((current) => toggleSort(current, field))
            }
            onEdit={setEditing}
            onDelete={setDeleting}
            countryNames={countryNames}
            peers={data?.peer_stats ?? null}
          />
          <Pagination
            page={queryState.page}
            pageSize={queryState.pageSize}
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

      {creating ? (
        <EmployeeFormDialog
          options={options}
          onClose={() => setCreating(false)}
          onSaved={(saved) => setNotice(`${saved.full_name} was added.`)}
        />
      ) : null}

      {editing ? (
        <EmployeeFormDialog
          employee={editing}
          options={options}
          onClose={() => setEditing(null)}
          onSaved={(saved) => setNotice(`${saved.full_name} was updated.`)}
        />
      ) : null}

      {deleting ? (
        <DeleteEmployeeDialog
          employee={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={(removed) => {
            setState((current) =>
              goToPage(
                current,
                current.page,
                Math.max(0, (data?.total ?? 0) - 1),
              ),
            );
            setNotice(`${removed.full_name} was deleted.`);
          }}
        />
      ) : null}
    </>
  );
}
