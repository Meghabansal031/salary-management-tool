import { describe, expect, it } from "vitest";

import {
  MIN_PEERS_FOR_FLAGS,
  formatPercentFromMedian,
  peerPosition,
  percentFromMedian,
} from "./peer";
import type { PeerStats } from "./types";

// Typical range 2.2M to 2.6M, so its width is 0.4M and the "far" margin is 0.6M:
// far below < 1.6M, far above > 3.2M.
const peers: PeerStats = {
  country: "IN",
  job_title: "Software Engineer",
  currency: "INR",
  count: 5,
  p25: 2_200_000,
  median: 2_400_000,
  p75: 2_600_000,
};

describe("peerPosition", () => {
  it("is within the typical range, boundaries included", () => {
    expect(peerPosition(2_400_000, peers)).toBe("within");
    expect(peerPosition(2_200_000, peers)).toBe("within");
    expect(peerPosition(2_600_000, peers)).toBe("within");
  });

  it("is above or below just outside the range", () => {
    expect(peerPosition(2_700_000, peers)).toBe("above");
    expect(peerPosition(2_100_000, peers)).toBe("below");
  });

  it("is far above or far below beyond 1.5 times the range width", () => {
    expect(peerPosition(3_200_000, peers)).toBe("above"); // exactly on the fence is not beyond it
    expect(peerPosition(3_300_000, peers)).toBe("far-above");
    expect(peerPosition(1_600_000, peers)).toBe("below");
    expect(peerPosition(1_500_000, peers)).toBe("far-below");
  });

  it("flags nobody when there are no peer stats", () => {
    expect(peerPosition(2_400_000, null)).toBeNull();
  });

  it("flags nobody in a group that is too small", () => {
    expect(
      peerPosition(9_000_000, { ...peers, count: MIN_PEERS_FOR_FLAGS - 1 }),
    ).toBeNull();
    expect(
      peerPosition(9_000_000, { ...peers, count: MIN_PEERS_FOR_FLAGS }),
    ).toBe("far-above");
  });

  it("treats any difference as far when everybody earns the same", () => {
    const same = { ...peers, p25: 100, median: 100, p75: 100 };
    expect(peerPosition(100, same)).toBe("within");
    expect(peerPosition(101, same)).toBe("far-above");
    expect(peerPosition(99, same)).toBe("far-below");
  });
});

describe("percentFromMedian", () => {
  it("is the distance from the median in whole percent", () => {
    expect(percentFromMedian(2_400_000, peers)).toBe(0);
    expect(percentFromMedian(2_640_000, peers)).toBe(10);
    expect(percentFromMedian(2_160_000, peers)).toBe(-10);
    expect(percentFromMedian(2_500_000, peers)).toBe(4); // 4.17 rounds to 4
  });

  it("is 0 when the median is not a positive number", () => {
    expect(percentFromMedian(100, { ...peers, median: 0 })).toBe(0);
  });
});

describe("formatPercentFromMedian", () => {
  it("writes the sign and the words", () => {
    expect(formatPercentFromMedian(0)).toBe("at the median");
    expect(formatPercentFromMedian(10)).toBe("+10% vs median");
    expect(formatPercentFromMedian(-10)).toBe("\u221210% vs median");
  });
});
