/**
 * The insights dashboard's state, and how it turns into API calls. Pure functions, no React.
 *
 * The key rule: amounts in local currency can only be compared inside one country. So "local"
 * is honoured only when the view is limited to a country, and otherwise the dashboard falls
 * back to USD by itself instead of showing an error.
 */

import type {
  Basis,
  DistributionParams,
  FilterParams,
  GroupBy,
  SummaryParams,
} from "./types";

export interface InsightsState {
  groupBy: GroupBy;
  basis: Basis; // what the user asked for; see effectiveBasis for what is shown
  country: string; // "" means all
  department: string;
  job_title: string;
}

export const DEFAULT_INSIGHTS: InsightsState = {
  groupBy: "country",
  basis: "usd",
  country: "",
  department: "",
  job_title: "",
};

export type InsightsFilterPatch = Partial<
  Pick<InsightsState, "country" | "department" | "job_title">
>;

export const GROUP_LABELS: Record<GroupBy, string> = {
  country: "Country",
  department: "Department",
  job_title: "Job title",
};

export function changeGroupBy(
  state: InsightsState,
  groupBy: GroupBy,
): InsightsState {
  return { ...state, groupBy };
}

export function changeBasis(state: InsightsState, basis: Basis): InsightsState {
  return { ...state, basis };
}

export function applyInsightsFilters(
  state: InsightsState,
  patch: InsightsFilterPatch,
): InsightsState {
  return { ...state, ...patch };
}

export function clearInsightsFilters(state: InsightsState): InsightsState {
  return { ...state, country: "", department: "", job_title: "" };
}

export function hasActiveInsightsFilters(state: InsightsState): boolean {
  return Boolean(state.country || state.department || state.job_title);
}

/** The summary table can show local amounts when it covers one country, or one row per country. */
export function localCurrencyAllowed(state: InsightsState): boolean {
  return state.country !== "" || state.groupBy === "country";
}

/** What the summary table really uses: the requested basis, unless local is not possible. */
export function effectiveBasis(state: InsightsState): Basis {
  return state.basis === "local" && localCurrencyAllowed(state)
    ? "local"
    : "usd";
}

/** The histogram covers everybody in scope in one chart, so local needs a country filter. */
export function effectiveDistributionBasis(state: InsightsState): Basis {
  return state.basis === "local" && state.country !== "" ? "local" : "usd";
}

// Empty filters are left out, so the server never sees "?country=".
function filters(state: InsightsState): FilterParams {
  return {
    country: state.country || undefined,
    department: state.department || undefined,
    job_title: state.job_title || undefined,
  };
}

export function toSummaryParams(state: InsightsState): SummaryParams {
  return {
    group_by: state.groupBy,
    basis: effectiveBasis(state),
    ...filters(state),
  };
}

export function toDistributionParams(
  state: InsightsState,
  bins = 20,
): DistributionParams {
  return { bins, basis: effectiveDistributionBasis(state), ...filters(state) };
}

/** Headcount is always "by country", so a country filter would make no sense there. */
export function toHeadcountParams(state: InsightsState): FilterParams {
  const { department, job_title } = filters(state);
  return { department, job_title };
}

/** A short description of what the numbers cover, for example "Software Engineer · India". */
export function scopeDescription(
  state: InsightsState,
  countryNames: Map<string, string>,
): string {
  const parts = [
    state.job_title,
    state.department,
    state.country ? (countryNames.get(state.country) ?? state.country) : "",
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "All employees";
}
