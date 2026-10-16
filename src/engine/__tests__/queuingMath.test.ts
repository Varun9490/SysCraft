import { describe, expect, it } from "vitest";
import {
  cpuPercent,
  effectiveCapacity,
  errorRate,
  littlesLawConcurrent,
  llmPhysics,
  nodeLatency,
  parallelAvailability,
  queueMultiplier,
  requiredReplicas,
  seriesAvailability,
  updateQueue,
  utilization,
  writeAmplification,
} from "@/engine/queuingMath";

describe("capacity and utilization", () => {
  it("floors replicas and throughput at 1", () => {
    expect(effectiveCapacity(0, 0)).toBe(1);
    expect(effectiveCapacity(3, 1000)).toBe(3000);
  });

  it("applies chaos penalty without collapsing to zero", () => {
    expect(effectiveCapacity(2, 1000, 0.99)).toBeCloseTo(20, 5);
    expect(effectiveCapacity(2, 1000, 5)).toBeGreaterThanOrEqual(1);
  });

  it("computes finite utilization for degenerate inputs", () => {
    expect(utilization(500, 1000)).toBe(0.5);
    expect(utilization(0, 0)).toBe(0);
    expect(Number.isFinite(utilization(-10, 100))).toBe(true);
  });
});

describe("clamped Kingman latency", () => {
  it("is idle multiplier 1 at zero load", () => {
    expect(queueMultiplier(0)).toBe(1);
  });

  it("stays finite past saturation via the 0.995 clamp", () => {
    const m = queueMultiplier(50);
    expect(Number.isFinite(m)).toBe(true);
    expect(m).toBeLessThan(200);
    expect(queueMultiplier(50)).toBe(queueMultiplier(0.995));
    expect(queueMultiplier(Number.NaN)).toBe(1);
  });

  it("never emits negative or NaN latencies", () => {
    const lat = nodeLatency({
      baseP50Ms: 5,
      baseP95Ms: 15,
      baseP99Ms: 40,
      arrivalRps: 100000,
      capacityRps: 10,
      storageEngine: "b_tree",
      writeRatio: 1,
      elapsedSeconds: 3,
      queueDepth: 900,
    });
    expect(lat.p50Ms).toBeGreaterThanOrEqual(0);
    expect(lat.p95Ms).toBeGreaterThanOrEqual(lat.p50Ms);
    expect(lat.p99Ms).toBeGreaterThanOrEqual(0);
    for (const v of [lat.p50Ms, lat.p95Ms, lat.p99Ms, lat.queueWaitMs]) {
      expect(Number.isFinite(v)).toBe(true);
    }
  });

  it("grows monotonically with load", () => {
    const at = (rps: number) =>
      nodeLatency({
        baseP50Ms: 5,
        baseP95Ms: 15,
        baseP99Ms: 40,
        arrivalRps: rps,
        capacityRps: 1000,
      }).p50Ms;
    expect(at(900)).toBeGreaterThan(at(100));
  });
});

describe("storage write amplification", () => {
  it("matches architecture factors", () => {
    expect(writeAmplification("b_tree", 1)).toBeCloseTo(2.5, 5);
    expect(writeAmplification("in_memory", 1)).toBe(1);
    expect(writeAmplification("append_log", 0.5)).toBeCloseTo(1.075, 5);
    expect(writeAmplification("lsm_tree", 0, 30)).toBeGreaterThanOrEqual(1);
  });
});

describe("bounded queue and errors", () => {
  it("accumulates overflow and drains under capacity", () => {
    const full = updateQueue(0, 2000, 1000, 100, 1);
    expect(full.queueDepth).toBeGreaterThan(0);
    const drained = updateQueue(full.queueDepth, 100, 1000, 100, 1);
    expect(drained.queueDepth).toBeLessThan(full.queueDepth);
  });

  it("flags drops only when the buffer is full", () => {
    const room = updateQueue(0, 1100, 1000, 10000, 1);
    expect(room.dropped).toBe(false);
    const tight = updateQueue(9999, 20000, 100, 100, 1, 1);
    expect(tight.dropped).toBe(true);
  });

  it("computes overload error ratios", () => {
    expect(errorRate(0, 1000)).toBe(0);
    expect(errorRate(2000, 1000)).toBeCloseTo(0.5, 5);
    expect(errorRate(1000, 1000)).toBe(0);
  });

  it("bounds cpu percent", () => {
    expect(cpuPercent(2.5, 10000, 100)).toBeLessThanOrEqual(100);
    expect(cpuPercent(0, 0, 100)).toBeGreaterThanOrEqual(0);
  });
});

describe("LLM token-stream physics", () => {
  it("adds prompt prefill cost to TTFT", () => {
    const short = llmPhysics({ baseP50Ms: 20, arrivalRps: 10, capacityRps: 1000, avgPromptTokens: 128 });
    const long = llmPhysics({ baseP50Ms: 20, arrivalRps: 10, capacityRps: 1000, avgPromptTokens: 4096 });
    expect(long.ttftMs).toBeGreaterThan(short.ttftMs);
  });

  it("preempts past 95% KV-cache saturation", () => {
    const saturated = llmPhysics({
      baseP50Ms: 20,
      arrivalRps: 5000,
      capacityRps: 100,
      vramGbPerReplica: 1,
      replicationFactor: 1,
      activeConcurrentRequests: 50000,
    });
    expect(saturated.kvCachePct).toBeLessThanOrEqual(100);
    expect(saturated.preempted).toBe(true);
    expect(saturated.latencyPenalty).toBe(3.5);
  });
});

describe("capacity planning helpers", () => {
  it("implements Little's law", () => {
    expect(littlesLawConcurrent(1000, 50)).toBeCloseTo(50, 5);
  });

  it("sizes replicas with headroom", () => {
    expect(requiredReplicas(1000, 1000)).toBeGreaterThanOrEqual(2);
    expect(requiredReplicas(0, 1000)).toBe(1);
  });

  it("composes availability in series and parallel", () => {
    expect(seriesAvailability([0.99, 0.99])).toBeCloseTo(0.9801, 4);
    expect(parallelAvailability([0.9, 0.9])).toBeCloseTo(0.99, 4);
    expect(seriesAvailability([])).toBe(1);
  });
});
