import { describe, expect, it } from "vitest";
import {
  simulateCdn,
  simulateCacheLab,
  simulateCache,
  simulateConsistentHashing,
  simulateLoadBalancing,
  simulateRateLimit,
  simulateSharding,
} from "../simCore";
import { resolveCorrectChoice, type SimData } from "../predictionSpec";

/**
 * The kernels grade committed predictions, so they must be deterministic and
 * behave the way the teaching copy says they do. These tests pin both.
 */

describe("cache lab kernel", () => {
  const cases: Array<[number, number, number, number, number]> = [
    [64, 65, 0, 1600, 0],
    [6, 120, 0, 1600, 0],
    [40, 200, 0.85, 1600, 0],
    [40, 200, 0.85, 1600, 200],
  ];

  it("is deterministic for every caching-scenario preset", () => {
    for (const args of cases) {
      const first = simulateCacheLab(...args);
      const second = simulateCacheLab(...args);
      expect(first.hitRatio).toBe(second.hitRatio);
      expect(first.series).toEqual(second.series);
    }
  });

  it("matches the plain kernel when no flush is set", () => {
    for (const [cacheSize, keySpace, skew, requests] of cases.map((c) => c.slice(0, 4))) {
      expect(simulateCacheLab(cacheSize, keySpace, skew, requests, 0)).toEqual(
        simulateCache(cacheSize, keySpace, skew, requests),
      );
    }
  });

  it("scenario A (cache covers the key space) lands in the top bucket", () => {
    const result = simulateCacheLab(64, 65, 0, 1600, 0);
    expect(result.hitRatio).toBeGreaterThanOrEqual(0.9);
    expect(resolveCorrectChoice("cache", result).id).toBe("b4");
  });

  it("scenario B (starved cache, uniform keys) lands in the bottom bucket", () => {
    const result = simulateCacheLab(6, 120, 0, 1600, 0);
    expect(result.hitRatio).toBeLessThan(0.4);
    expect(resolveCorrectChoice("cache", result).id).toBe("b1");
  });

  it("scenario D (periodic full flush) costs throughput versus no flush", () => {
    const flushed = simulateCacheLab(40, 200, 0.85, 1600, 200);
    const steady = simulateCacheLab(40, 200, 0.85, 1600, 0);
    expect(flushed.hitRatio).toBeLessThan(steady.hitRatio);
    // The sawtooth must exist: each flush drags a bucket well below the steady rate.
    expect(Math.min(...flushed.series.slice(1))).toBeLessThan(0.55);
  });
});

describe("prediction kernel grading", () => {
  it("grades per-kind metrics into the right buckets", () => {
    const grade = (kind: Parameters<typeof resolveCorrectChoice>[0], data: SimData) =>
      resolveCorrectChoice(kind, data).id;

    // Sharding: heavy skew should be poor partitioning.
    const skewed = simulateSharding(6, 360, "hash", 0.7);
    const clean = simulateSharding(6, 360, "hash", 0);
    expect(grade("sharding", skewed)).not.toBe(grade("sharding", clean));

    // Rate limit: under-limit traffic should shed ~nothing.
    const calm = simulateRateLimit(60, 60, 40, 16);
    expect(grade("rate-limit", calm)).toBe("b1");
    const storm = simulateRateLimit(10, 20, 180, 16);
    expect(grade("rate-limit", storm)).toBe("b4");

    // CDN: hit ratio maps straight to offload.
    const cdn = simulateCdn(4, 0.9, 90, 18);
    expect(grade("cdn", cdn)).toBe("b4");

    // Consistent hashing: vnodes actually tighten the ring.
    const bare = simulateConsistentHashing(4, 96, 1);
    const vnodes = simulateConsistentHashing(4, 96, 6);
    expect(vnodes.imbalance).toBeLessThan(bare.imbalance);
  });

  it("load balancing keeps round-robin tighter than random", () => {
    const rr = simulateLoadBalancing(8, 300, "round-robin");
    const random = simulateLoadBalancing(8, 300, "random");
    expect(rr.skew).toBeLessThan(Math.max(30, random.skew / 3));
  });
});
