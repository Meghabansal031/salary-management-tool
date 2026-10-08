/**
 * The employee table's state and the rules for changing it. Pure functions with no React,
 * so they are easy to test: every change returns a new state and never edits the old one.
 */

import type { EmployeeListParams, SortField, SortOrder } from "./types";

export const PAGE_SIZES = [10, 25, 50, 100] as const;

export interface TableState {
  q: string;
  country: string; // "" means "all"
  department: string;
  job_title: string;
  sort: SortField;
  order: SortOrder;
  page: number; // 1-based
  pageSize: number;
}

export const DEFAULT_STATE: TableState = {
  q: "",
  country: "",
  department: "",
  job_title: "",
  sort: "full_name",
  order: "asc",
  page: 1,
  pageSize: 25,
};

export type FilterPatch = Partial<
  Pick<TableState, "q" | "country" | "department" | "job_title">
>;

/** Any filter change goes back to page 1: page 7 of the old results means nothing in the new ones. */
export function applyFilters(
  state: TableState,
  patch: FilterPatch,
): TableState {
  return { ...state, ...patch, page: 1 };
}

export function clearFilters(state: TableState): TableState {
  return {
    ...state,
    q: "",
    country: "",
    department: "",
    job_title: "",
    page: 1,
  };
}

export function hasActiveFilters(state: TableState): boolean {
  return Boolean(
    state.q.trim() || state.country || state.department || state.job_title,
  );
}

// Numbers and dates are most useful biggest/newest first; text starts A to Z.
const DESCENDING_FIRST: ReadonlySet<SortField> = new Set([
  "salary",
  "hire_date",
]);

/** Clicking the sorted column flips its direction; clicking another column sorts by it. */
export function toggleSort(state: TableState, field: SortField): TableState {
  if (state.sort === field) {
    return { ...state, order: state.order === "asc" ? "desc" : "asc", page: 1 };
  }
  return {
    ...state,
    sort: field,
    order: DESCENDING_FIRST.has(field) ? "desc" : "asc",
    page: 1,
  };
}

export function changePageSize(
  state: TableState,
  pageSize: number,
): TableState {
  return { ...state, pageSize, page: 1 };
}

export function totalPages(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

export function goToPage(
  state: TableState,
  page: number,
  total: number,
): TableState {
  const last = totalPages(total, state.pageSize);
  return { ...state, page: Math.min(Math.max(1, page), last) };
}

/** "Showing 26-50 of 10,000": the first and last row numbers on this page (0 and 0 when empty). */
export function pageRange(
  page: number,
  pageSize: number,
  total: number,
): { from: number; to: number } {
  if (total === 0) return { from: 0, to: 0 };
  return {
    from: (page - 1) * pageSize + 1,
    to: Math.min(page * pageSize, total),
  };
}

/** What the API call needs. Empty filters are left out so the server never sees "?q=". */
export function toListParams(state: TableState): EmployeeListParams {
  return {
    page: state.page,
    page_size: state.pageSize,
    sort: state.sort,
    order: state.order,
    q: state.q.trim() || undefined,
    country: state.country || undefined,
    department: state.department || undefined,
    job_title: state.job_title || undefined,
  };
}
