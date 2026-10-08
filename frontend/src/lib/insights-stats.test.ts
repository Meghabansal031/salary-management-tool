import { describe, expect, it } from "vitest";

import {
  basisCaption,
  rangeBar,
  sharedCurrency,
  sortGroupStats,
  summarizeStats,
} from "./insights-stats";
import type { GroupStats } from "./types";

function stats(
  group: string,
  count: number,
  median: number,
  currency: string | null = "USD",
): GroupStats {
  return {
    group,
    currency,
    count,
    min: median - 20,
    p25: median - 10,
    median,
    average: median + 1,
    p75: median + 10,
    max: median + 20,
  };
}

const rows = [stats("Sales", 5, 60), stats("Legal", 2, 90), stats("IT", 5, 70)];

describe("sortGroupStats", () => {
  it("sorts by a number, either way, without editing the original", () => {
    expect(sortGroupStats(rows, "median", "desc").map((r) => r.group)).toEqual([
      "Legal",
      "IT",
      "Sales",
    ]);
    expect(sortGroupStats(rows, "median", "asc").map((r) => r.group)).toEqual([
      "Sales",
      "IT",
      "Legal",
    ]);
    expect(rows.map((r) => r.group)).toEqual(["Sales", "Legal", "IT"]);
  });

  it("sorts by name", () => {
    expect(sortGroupStats(rows, "group", "asc").map((r) => r.group)).toEqual([
      "IT",
      "Legal",
      "Sales",
    ]);
    expect(sortGroupStats(rows, "group", "desc").map((r) => r.group)).toEqual([
      "Sales",
      "Legal",
      "IT",
    ]);
  });

  it("breaks ties by group name, so the order never jumps around", () => {
    expect(sortGroupStats(rows, "count", "desc").map((r) => r.group)).toEqual([
      "IT",
      "Sales",
      "Legal",
    ]);
    expect(sortGroupStats(rows, "count", "asc").map((r) => r.group)).toEqual([
      "Legal",
      "IT",
      "Sales",
    ]);
  });
});

describe("sharedCurrency", () => {
  it("is the currency when every row has the same one", () => {
    expect(sharedCurrency(rows)).toBe("USD");
  });

  it("is null when currencies differ, are missing, or there are no rows", () => {
    expect(
      sharedCurrency([stats("a", 1, 1, "INR"), stats("b", 1, 1, "EUR")]),
    ).toBeNull();
    expect(sharedCurrency([stats("a", 1, 1, null)])).toBeNull();
    expect(sharedCurrency([])).toBeNull();
  });
});

describe("summarizeStats", () => {
  it("adds up employees and finds the highest and lowest median", () => {
    const headline = summarizeStats(rows);
    expect(headline.employees).toBe(12);
    expect(headline.groups).toBe(3);
    expect(headline.highest?.group).toBe("Legal");
    expect(headline.lowest?.group).toBe("Sales");
  });

  it("does not rank medians that are in different currencies", () => {
    const headline = summarizeStats([
      stats("IN", 3, 2_400_000, "INR"),
      stats("DE", 2, 75_000, "EUR"),
    ]);
    expect(headline.employees).toBe(5);
    expect(headline.highest).toBeNull();
    expect(headline.lowest).toBeNull();
  });

  it("copes with no rows", () => {
    expect(summarizeStats([])).toEqual({
      employees: 0,
      groups: 0,
      highest: null,
      lowest: null,
    });
  });
});

describe("basisCaption", () => {
  it("names the currency of the table", () => {
    expect(basisCaption("usd", rows)).toMatch(/US dollars/);
    expect(basisCaption("local", [stats("a", 1, 1, "INR")])).toBe(
      "All amounts are in INR.",
    );
    expect(
      basisCaption("local", [stats("a", 1, 1, "INR"), stats("b", 1, 1, "EUR")]),
    ).toMatch(/cannot be compared directly/);
  });
});

describe("rangeBar", () => {
  it("places the line, the typical-range box and the median on a shared scale", () => {
    const row: GroupStats = {
      group: "x",
      currency: "USD",
      count: 4,
      min: 20,
      p25: 40,
      median: 50,
      average: 50,
      p75: 60,
      max: 100,
    };
    expect(rangeBar(row, 100)).toEqual({
      lineLeft: 20,
      lineWidth: 80,
      boxLeft: 40,
      boxWidth: 20,
      medianLeft: 50,
    });
    expect(rangeBar(row, 200)).toEqual({
      lineLeft: 10,
      lineWidth: 40,
      boxLeft: 20,
      boxWidth: 10,
      medianLeft: 25,
    });
  });

  it("draws nothing when the scale is not positive", () => {
    expect(rangeBar(rows[0], 0)).toEqual({
      lineLeft: 0,
      lineWidth: 0,
      boxLeft: 0,
      boxWidth: 0,
      medianLeft: 0,
    });
  });
});
