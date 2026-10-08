/** Helpers for the summary table and the headline cards. Pure functions, no React. */

import type { Basis, GroupStats } from "./types";

export type StatKey =
  | "group"
  | "count"
  | "min"
  | "p25"
  | "median"
  | "average"
  | "p75"
  | "max";
export type SortDirection = "asc" | "desc";

/** A copy of the rows in the order asked for. Ties are broken by group name, so order never jumps around. */
export function sortGroupStats(
  items: GroupStats[],
  key: StatKey,
  direction: SortDirection,
): GroupStats[] {
  const sign = direction === "asc" ? 1 : -1;
  return [...items].sort((a, b) => {
    const left = a[key];
    const right = b[key];
    const byKey =
      typeof left === "string"
        ? left.localeCompare(right as string)
        : (left as number) - (right as number);
    return byKey !== 0 ? sign * byKey : a.group.localeCompare(b.group);
  });
}

/** The one currency every row is in, or null when rows differ (or there are no rows). */
export function sharedCurrency(items: GroupStats[]): string | null {
  if (items.length === 0) return null;
  const first = items[0].currency;
  return first !== null && items.every((item) => item.currency === first)
    ? first
    : null;
}

export interface Headline {
  employees: number;
  groups: number;
  /** Only set when all rows are in one currency, because medians in different currencies cannot be ranked. */
  highest: GroupStats | null;
  lowest: GroupStats | null;
}

export function summarizeStats(items: GroupStats[]): Headline {
  const employees = items.reduce((sum, item) => sum + item.count, 0);
  if (sharedCurrency(items) === null || items.length === 0) {
    return { employees, groups: items.length, highest: null, lowest: null };
  }
  const byMedian = sortGroupStats(items, "median", "desc");
  return {
    employees,
    groups: items.length,
    highest: byMedian[0],
    lowest: byMedian[byMedian.length - 1],
  };
}

/** One sentence saying what currency the amounts in the table are in. */
export function basisCaption(basis: Basis, items: GroupStats[]): string {
  if (basis === "usd")
    return "All amounts are in US dollars, converted with fixed exchange rates.";
  const currency = sharedCurrency(items);
  return currency
    ? `All amounts are in ${currency}.`
    : "Each row is in its own country's currency, so rows cannot be compared directly. Switch to USD to compare.";
}

export interface RangeBarGeometry {
  lineLeft: number; // all values are percentages of the bar's width
  lineWidth: number; // lowest to highest
  boxLeft: number;
  boxWidth: number; // typical range: 25th to 75th percentile
  medianLeft: number;
}

/** Where to draw one row's mini range chart on a shared 0 to `scaleMax` scale. */
export function rangeBar(
  stats: GroupStats,
  scaleMax: number,
): RangeBarGeometry {
  if (scaleMax <= 0)
    return {
      lineLeft: 0,
      lineWidth: 0,
      boxLeft: 0,
      boxWidth: 0,
      medianLeft: 0,
    };
  const pct = (value: number) => (value / scaleMax) * 100;
  return {
    lineLeft: pct(stats.min),
    lineWidth: pct(stats.max) - pct(stats.min),
    boxLeft: pct(stats.p25),
    boxWidth: pct(stats.p75) - pct(stats.p25),
    medianLeft: pct(stats.median),
  };
}
