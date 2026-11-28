import { describe, expect, it } from "vitest";
import { applyEdgeCondition, particleCountForRps } from "./TrafficParticleLayer";

describe("traffic particle condition scaling", () => {
  it("treats engine errorRate as a 0–1 fraction instead of a percentage", () => {
    const errorRps = applyEdgeCondition(1_000, "error", { errorRate: 0.25 });

    expect(errorRps).toBe(250);
    expect(particleCountForRps(errorRps, 1)).toBe(2);
  });

  it("keeps non-error branches on their existing traffic fractions", () => {
    expect(applyEdgeCondition(1_000, "cache_hit", { cacheHitPct: 80 })).toBe(800);
    expect(applyEdgeCondition(1_000, "cache_miss", { cacheHitPct: 80 })).toBeCloseTo(200);
    expect(applyEdgeCondition(1_000, "write", {}, 0.3)).toBe(300);
    expect(applyEdgeCondition(1_000, "rate_limited", { droppedRps: 12 })).toBe(12);
  });
});
