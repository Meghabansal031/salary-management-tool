import { describe, expect, it } from "vitest";

import {
  formatCompact,
  formatDate,
  formatMoney,
  formatNumber,
  formatPercent,
} from "./format";

describe("formatMoney", () => {
  it("shows each amount with its own currency symbol", () => {
    expect(formatMoney(2_400_000, "INR")).toBe("₹2,400,000");
    expect(formatMoney(55_000, "EUR")).toBe("€55,000");
    expect(formatMoney(7_000_000, "JPY")).toBe("¥7,000,000");
    expect(formatMoney(120_000, "USD")).toBe("$120,000");
  });

  it("falls back to a plain number without a currency", () => {
    expect(formatMoney(1234, null)).toBe("1,234");
    expect(formatMoney(1234)).toBe("1,234");
  });
});

describe("formatDate", () => {
  it("does not shift the day, whatever the time zone", () => {
    expect(formatDate("2021-06-01")).toBe("Jun 1, 2021");
    expect(formatDate("2020-12-31")).toBe("Dec 31, 2020");
  });
});

describe("formatNumber and formatPercent", () => {
  it("groups thousands", () => {
    expect(formatNumber(10_000)).toBe("10,000");
  });

  it("shows one decimal for percentages", () => {
    expect(formatPercent(25)).toBe("25.0%");
  });
});

describe("formatCompact", () => {
  it("shortens big numbers for chart axes", () => {
    expect(formatCompact(2_400_000)).toBe("2.4M");
    expect(formatCompact(85_000)).toBe("85K");
    expect(formatCompact(950)).toBe("950");
  });
});
