import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type {
  DistributionParams,
  FilterParams,
  SummaryParams,
} from "@/lib/types";

// All keys start with "insights", so saving or deleting an employee refreshes every one of them.

export function useSummary(params: SummaryParams) {
  return useQuery({
    queryKey: ["insights", "summary", params],
    queryFn: () => api.summary(params),
    placeholderData: keepPreviousData,
  });
}

export function useDistribution(params: DistributionParams) {
  return useQuery({
    queryKey: ["insights", "distribution", params],
    queryFn: () => api.distribution(params),
    placeholderData: keepPreviousData,
  });
}

export function useHeadcount(params: FilterParams) {
  return useQuery({
    queryKey: ["insights", "headcount", params],
    queryFn: () => api.headcount(params),
    placeholderData: keepPreviousData,
  });
}
