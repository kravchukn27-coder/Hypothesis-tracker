import { describe, expect, it } from "vitest";
import { computeScore } from "./hypothesis";

describe("computeScore", () => {
  it("computes impact * confidence * reach / effort for normal input", () => {
    expect(computeScore({ impact: 4, confidence: 80, reach: 50, effort: 2 })).toBe((4 * 80 * 50) / 2);
  });

  it("returns 0 when effort is 0, instead of dividing by zero", () => {
    expect(computeScore({ impact: 5, confidence: 100, reach: 100, effort: 0 })).toBe(0);
  });

  it("handles negative and fractional inputs by computing the same formula, not guarding them", () => {
    expect(computeScore({ impact: -2, confidence: 50, reach: 10, effort: 4 })).toBe((-2 * 50 * 10) / 4);
    expect(computeScore({ impact: 2.5, confidence: 33.3, reach: 12.5, effort: 1.5 })).toBeCloseTo(
      (2.5 * 33.3 * 12.5) / 1.5,
    );
  });
});
