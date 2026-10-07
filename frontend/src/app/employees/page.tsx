"use client";

import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/layout/page-header";
import { api } from "@/lib/api";
import { formatNumber } from "@/lib/format";

// Placeholder: proves the whole chain works (env var, CORS, typed client, caching).
// The real table with search, filters and pagination replaces it in the next step.
export default function EmployeesPage() {
  const { data, error, isPending } = useQuery({
    queryKey: ["employees", "count"],
    queryFn: () => api.listEmployees({ page_size: 1 }),
  });

  return (
    <>
      <PageHeader
        title="Employees"
        description="Search, filter and edit employee records."
      />
      <div className="rounded-lg border p-6 text-sm">
        {isPending ? (
          "Loading…"
        ) : error ? (
          <span className="text-red-600">{error.message}</span>
        ) : (
          <>
            <strong>{formatNumber(data.total)}</strong> employees are available from the API.
            The table arrives in the next step.
          </>
        )}
      </div>
    </>
  );
}
