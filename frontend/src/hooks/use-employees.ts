import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { EmployeeListParams } from "@/lib/types";

/** One page of employees. The old page stays on screen while the next one loads, so the table does not flash. */
export function useEmployees(params: EmployeeListParams) {
  return useQuery({
    queryKey: ["employees", "list", params],
    queryFn: () => api.listEmployees(params),
    placeholderData: keepPreviousData,
  });
}

/** Dropdown options. They hardly ever change, so they are fetched once per session. */
export function useFilterOptions() {
  return useQuery({
    queryKey: ["meta", "filters"],
    queryFn: api.filters,
    staleTime: Infinity,
  });
}
