import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { EmployeeInput } from "@/lib/types";

/** After any change, every cached list and statistic is stale, so refresh them. */
function useRefreshAfterChange() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["employees"] }),
      queryClient.invalidateQueries({ queryKey: ["insights"] }),
    ]);
}

/** Create (no id) or update (with id) one employee. */
export function useSaveEmployee() {
  const refresh = useRefreshAfterChange();
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: EmployeeInput }) =>
      id === undefined
        ? api.createEmployee(input)
        : api.updateEmployee(id, input),
    onSuccess: refresh,
  });
}

export function useDeleteEmployee() {
  const refresh = useRefreshAfterChange();
  return useMutation({
    mutationFn: (id: number) => api.deleteEmployee(id),
    onSuccess: refresh,
  });
}
