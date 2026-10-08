import { describe, expect, it } from "vitest";

import {
  DEFAULT_INSIGHTS,
  applyInsightsFilters,
  changeBasis,
  changeGroupBy,
  clearInsightsFilters,
  effectiveBasis,
  effectiveDistributionBasis,
  hasActiveInsightsFilters,
  localCurrencyAllowed,
  scopeDescription,
  toDistributionParams,
  toHeadcountParams,
  toSummaryParams,
} from "./insights-query";

const names = new Map([
  ["IN", "India"],
  ["DE", "Germany"],
]);

describe("local currency rules", () => {
  it("is allowed for one row per country, or when a country is chosen", () => {
    expect(localCurrencyAllowed(DEFAULT_INSIGHTS)).toBe(true); // grouped by country
    expect(
      localCurrencyAllowed(changeGroupBy(DEFAULT_INSIGHTS, "department")),
    ).toBe(false);
    expect(
      localCurrencyAllowed(
        applyInsightsFilters(changeGroupBy(DEFAULT_INSIGHTS, "job_title"), {
          country: "IN",
        }),
      ),
    ).toBe(true);
  });

  it("only honours a local request when it is possible, and falls back to USD otherwise", () => {
    const local = changeBasis(DEFAULT_INSIGHTS, "local");
    expect(effectiveBasis(local)).toBe("local");
    expect(effectiveBasis(changeGroupBy(local, "job_title"))).toBe("usd");
    expect(effectiveBasis(changeBasis(DEFAULT_INSIGHTS, "usd"))).toBe("usd");
  });

  it("needs a country filter for the histogram, whatever the grouping", () => {
    const local = changeBasis(DEFAULT_INSIGHTS, "local"); // grouped by country, no filter
    expect(effectiveDistributionBasis(local)).toBe("usd");
    expect(
      effectiveDistributionBasis(
        applyInsightsFilters(local, { country: "IN" }),
      ),
    ).toBe("local");
  });
});

describe("API parameters", () => {
  it("summary leaves out empty filters and uses the effective basis", () => {
    const state = applyInsightsFilters(
      changeBasis(changeGroupBy(DEFAULT_INSIGHTS, "job_title"), "local"),
      { department: "Sales" },
    );
    expect(toSummaryParams(state)).toEqual({
      group_by: "job_title",
      basis: "usd", // local was asked for but there is no country
      country: undefined,
      department: "Sales",
      job_title: undefined,
    });
  });

  it("distribution defaults to 20 bins", () => {
    const params = toDistributionParams(
      applyInsightsFilters(changeBasis(DEFAULT_INSIGHTS, "local"), {
        country: "IN",
      }),
    );
    expect(params.bins).toBe(20);
    expect(params.basis).toBe("local");
    expect(params.country).toBe("IN");
    expect(toDistributionParams(DEFAULT_INSIGHTS, 10).bins).toBe(10);
  });

  it("headcount never receives a country filter", () => {
    const params = toHeadcountParams(
      applyInsightsFilters(DEFAULT_INSIGHTS, {
        country: "IN",
        department: "Sales",
        job_title: "Recruiter",
      }),
    );
    expect(params).toEqual({ department: "Sales", job_title: "Recruiter" });
  });
});

describe("filters", () => {
  it("applies, detects and clears filters but keeps grouping and basis", () => {
    const filtered = applyInsightsFilters(
      changeBasis(changeGroupBy(DEFAULT_INSIGHTS, "department"), "local"),
      { country: "DE", job_title: "x" },
    );
    expect(hasActiveInsightsFilters(filtered)).toBe(true);
    expect(hasActiveInsightsFilters(DEFAULT_INSIGHTS)).toBe(false);

    const cleared = clearInsightsFilters(filtered);
    expect([cleared.country, cleared.department, cleared.job_title]).toEqual([
      "",
      "",
      "",
    ]);
    expect([cleared.groupBy, cleared.basis]).toEqual(["department", "local"]);
  });

  it("does not edit the old state", () => {
    applyInsightsFilters(DEFAULT_INSIGHTS, { country: "IN" });
    expect(DEFAULT_INSIGHTS.country).toBe("");
  });
});

describe("scopeDescription", () => {
  it("says 'All employees' without filters", () => {
    expect(scopeDescription(DEFAULT_INSIGHTS, names)).toBe("All employees");
  });

  it("lists the filters, using country names", () => {
    expect(
      scopeDescription(
        applyInsightsFilters(DEFAULT_INSIGHTS, {
          job_title: "Software Engineer",
          country: "IN",
        }),
        names,
      ),
    ).toBe("Software Engineer · India");
    expect(
      scopeDescription(
        applyInsightsFilters(DEFAULT_INSIGHTS, {
          department: "Sales",
          country: "FR",
        }),
        names,
      ),
    ).toBe("Sales · FR");
  });
});
