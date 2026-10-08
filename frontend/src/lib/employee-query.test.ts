import { describe, expect, it } from "vitest";

import {
  DEFAULT_STATE,
  applyFilters,
  changePageSize,
  clearFilters,
  goToPage,
  hasActiveFilters,
  pageRange,
  toListParams,
  toggleSort,
  totalPages,
} from "./employee-query";

describe("applyFilters", () => {
  it("changes the filter and goes back to page 1", () => {
    const state = { ...DEFAULT_STATE, page: 7 };
    const next = applyFilters(state, { country: "IN" });
    expect(next.country).toBe("IN");
    expect(next.page).toBe(1);
  });

  it("keeps sorting and page size", () => {
    const state = {
      ...DEFAULT_STATE,
      sort: "salary" as const,
      order: "desc" as const,
      pageSize: 50,
    };
    const next = applyFilters(state, { q: "priya" });
    expect([next.sort, next.order, next.pageSize]).toEqual([
      "salary",
      "desc",
      50,
    ]);
  });

  it("does not edit the old state", () => {
    applyFilters(DEFAULT_STATE, { country: "IN" });
    expect(DEFAULT_STATE.country).toBe("");
  });
});

describe("clearFilters and hasActiveFilters", () => {
  it("clears all four filters and keeps sorting and page size", () => {
    const state = {
      ...DEFAULT_STATE,
      q: "a",
      country: "IN",
      department: "Sales",
      job_title: "x",
      sort: "salary" as const,
      pageSize: 100,
      page: 3,
    };
    const next = clearFilters(state);
    expect([next.q, next.country, next.department, next.job_title]).toEqual([
      "",
      "",
      "",
      "",
    ]);
    expect([next.sort, next.pageSize, next.page]).toEqual(["salary", 100, 1]);
  });

  it("is false for the default state and for sort or page changes", () => {
    expect(hasActiveFilters(DEFAULT_STATE)).toBe(false);
    expect(
      hasActiveFilters({ ...DEFAULT_STATE, sort: "salary", page: 4 }),
    ).toBe(false);
  });

  it("is true for any filter, but not for a blank search", () => {
    expect(hasActiveFilters({ ...DEFAULT_STATE, q: "a" })).toBe(true);
    expect(hasActiveFilters({ ...DEFAULT_STATE, country: "IN" })).toBe(true);
    expect(hasActiveFilters({ ...DEFAULT_STATE, department: "Sales" })).toBe(
      true,
    );
    expect(hasActiveFilters({ ...DEFAULT_STATE, job_title: "x" })).toBe(true);
    expect(hasActiveFilters({ ...DEFAULT_STATE, q: "   " })).toBe(false);
  });
});

describe("toggleSort", () => {
  it("flips the direction of the column that is already sorted", () => {
    const asc = toggleSort(DEFAULT_STATE, "full_name");
    expect(asc.order).toBe("desc");
    expect(toggleSort(asc, "full_name").order).toBe("asc");
  });

  it("starts text columns from A to Z", () => {
    const next = toggleSort(DEFAULT_STATE, "department");
    expect([next.sort, next.order]).toEqual(["department", "asc"]);
  });

  it("starts salary and hire date from the highest and newest", () => {
    expect(toggleSort(DEFAULT_STATE, "salary").order).toBe("desc");
    expect(toggleSort(DEFAULT_STATE, "hire_date").order).toBe("desc");
  });

  it("goes back to page 1", () => {
    expect(toggleSort({ ...DEFAULT_STATE, page: 5 }, "salary").page).toBe(1);
  });
});

describe("paging", () => {
  it("changePageSize goes back to page 1", () => {
    const next = changePageSize({ ...DEFAULT_STATE, page: 9 }, 50);
    expect([next.pageSize, next.page]).toEqual([50, 1]);
  });

  it("totalPages rounds up and is never below 1", () => {
    expect(totalPages(0, 25)).toBe(1);
    expect(totalPages(1, 25)).toBe(1);
    expect(totalPages(25, 25)).toBe(1);
    expect(totalPages(26, 25)).toBe(2);
    expect(totalPages(10_000, 25)).toBe(400);
  });

  it("goToPage stays between the first and the last page", () => {
    expect(goToPage(DEFAULT_STATE, 0, 100).page).toBe(1);
    expect(goToPage(DEFAULT_STATE, -3, 100).page).toBe(1);
    expect(goToPage(DEFAULT_STATE, 3, 100).page).toBe(3);
    expect(goToPage(DEFAULT_STATE, 99, 100).page).toBe(4);
    expect(goToPage(DEFAULT_STATE, 5, 0).page).toBe(1);
  });

  it("pageRange gives the first and last row on the page", () => {
    expect(pageRange(1, 25, 10_000)).toEqual({ from: 1, to: 25 });
    expect(pageRange(400, 25, 10_000)).toEqual({ from: 9976, to: 10_000 });
    expect(pageRange(2, 25, 30)).toEqual({ from: 26, to: 30 });
    expect(pageRange(1, 25, 0)).toEqual({ from: 0, to: 0 });
  });
});

describe("toListParams", () => {
  it("leaves out empty filters", () => {
    expect(toListParams(DEFAULT_STATE)).toEqual({
      page: 1,
      page_size: 25,
      sort: "full_name",
      order: "asc",
      q: undefined,
      country: undefined,
      department: undefined,
      job_title: undefined,
    });
  });

  it("passes filters through and trims the search text", () => {
    const params = toListParams({
      ...DEFAULT_STATE,
      q: "  priya ",
      country: "IN",
      job_title: "Software Engineer",
      page: 3,
    });
    expect(params.q).toBe("priya");
    expect(params.country).toBe("IN");
    expect(params.job_title).toBe("Software Engineer");
    expect(params.page).toBe(3);
  });
});
