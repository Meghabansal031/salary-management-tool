/** Display helpers. Amounts are always shown with their own currency, never bare numbers. */

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

/** 2400000, "INR" -> "₹2,400,000". Without a currency, falls back to a plain number. */
export function formatMoney(amount: number, currency?: string | null): string {
  if (!currency) return formatNumber(amount);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** "2021-06-01" -> "Jun 1, 2021". Parsed by hand: new Date("2021-06-01") would be UTC and can show the day before. */
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(
    new Date(year, month - 1, day),
  );
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

/** 2400000 -> "2.4M", 85000 -> "85K". For chart axes, where space is tight. */
export function formatCompact(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}
