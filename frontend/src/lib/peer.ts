/**
 * Compares one salary with how its peers (same job title, same country) are paid.
 *
 * "Above range" / "below range": outside the typical range, the middle half of the group
 * (25th to 75th percentile). "Far above" / "far below": more than 1.5 times the width of that
 * range beyond it, the standard statistical rule for an outlier.
 */

import type { PeerStats } from "./types";

/** With fewer people than this, quartiles say very little, so nobody is flagged. */
export const MIN_PEERS_FOR_FLAGS = 4;

export type PeerPosition = "far-above" | "above" | "within" | "below" | "far-below";

export const PEER_LABELS: Record<Exclude<PeerPosition, "within">, string> = {
  "far-above": "Far above range",
  above: "Above range",
  below: "Below range",
  "far-below": "Far below range",
};

export function peerPosition(salary: number, peers: PeerStats | null): PeerPosition | null {
  if (!peers || peers.count < MIN_PEERS_FOR_FLAGS) return null;

  const margin = 1.5 * (peers.p75 - peers.p25);
  if (salary > peers.p75 + margin) return "far-above";
  if (salary > peers.p75) return "above";
  if (salary < peers.p25 - margin) return "far-below";
  if (salary < peers.p25) return "below";
  return "within";
}

/** How far a salary is from its group's median, in whole percent (negative when below). */
export function percentFromMedian(salary: number, peers: PeerStats): number {
  if (peers.median <= 0) return 0;
  return Math.round(((salary - peers.median) / peers.median) * 100);
}

export function formatPercentFromMedian(percent: number): string {
  if (percent === 0) return "at the median";
  return `${percent > 0 ? "+" : "\u2212"}${Math.abs(percent)}% vs median`;
}
