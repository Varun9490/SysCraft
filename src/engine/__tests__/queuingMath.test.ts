import { describe, expect, it } from "vitest";
import {
  cpuPercent,
  effectiveCapacity,
  errorRate,
  littlesLawConcurrent,
  llmPhysics,
  MAX_SIM_VALUE,
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

describe("hostile numeric totality", () => {
  it("caps overflow in capacity, queueing, CPU, LLM, and replica planning", () => {
    const max = Number.MAX_VALUE;
    const capacity = effectiveCapacity(max, max);
    const queue = updateQueue(max, max, 1, max, max);
    const latency = nodeLatency({
      baseP50Ms: max,
      baseP95Ms: max,
      baseP99Ms: max,
      arrivalRps: max,
      capacityRps: 1,
      queueDepth: max,
    });
    const llm = llmPhysics({
      baseP50Ms: max,
      arrivalRps: max,
      capacityRps: 1,
      avgPromptTokens: max,
      avgOutputTokens: max,
      vramGbPerReplica: Number.MIN_VALUE,
      replicationFactor: max,
      activeConcurrentRequests: max,
    });

    for (const value of [
      capacity,
      queue.queueDepth,
      latency.p50Ms,
      latency.p95Ms,
      latency.p99Ms,
      latency.queueWaitMs,
      latency.utilization,
      latency.multiplier,
      llm.ttftMs,
      llm.kvCachePct,
      cpuPercent(max, max, max),
      requiredReplicas(max, max, max),
      littlesLawConcurrent(max, max),
    ]) {
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
    }
    expect(latency.p99Ms).toBeGreaterThan(0);
    expect(llm.ttftMs).toBeGreaterThan(0);
    expect(capacity).toBeLessThanOrEqual(MAX_SIM_VALUE);
    expect(requiredReplicas(max, max, max)).toBeLessThanOrEqual(MAX_SIM_VALUE);
    expect(cpuPercent(max, max, max)).toBe(100);
  });

  it("saturates positive Infinity instead of treating overloaded resources as free", () => {
    const latency = nodeLatency({
      baseP50Ms: Number.POSITIVE_INFINITY,
      baseP95Ms: Number.POSITIVE_INFINITY,
      baseP99Ms: Number.POSITIVE_INFINITY,
      arrivalRps: Number.POSITIVE_INFINITY,
      capacityRps: Number.POSITIVE_INFINITY,
    });
    expect(latency.p50Ms).toBeGreaterThan(0);
    expect(latency.p99Ms).toBeGreaterThan(0);
    expect(effectiveCapacity(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY)).toBe(MAX_SIM_VALUE);
    expect(cpuPercent(Number.POSITIVE_INFINITY, 0, 1)).toBe(100);
  });

  it("saturates mixed extreme ratios instead of emitting zero or Infinity", () => {
    expect(utilization(Number.MAX_VALUE, Number.MIN_VALUE)).toBe(MAX_SIM_VALUE);
    const llm = llmPhysics({
      baseP50Ms: Number.MAX_VALUE,
      arrivalRps: Number.MAX_VALUE,
      capacityRps: Number.MIN_VALUE,
      avgPromptTokens: Number.MAX_VALUE,
      avgOutputTokens: Number.MAX_VALUE,
      vramGbPerReplica: Number.MIN_VALUE,
      replicationFactor: 1,
      activeConcurrentRequests: Number.MAX_VALUE,
    });
    expect(llm.ttftMs).toBeGreaterThan(0);
    expect(llm.kvCachePct).toBe(100);
    expect(llm.preempted).toBe(true);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "uses the documented token defaults for non-finite token counts (%s)",
    (tokenCount) => {
      const defaults = llmPhysics({ baseP50Ms: 20, arrivalRps: 10, capacityRps: 1000 });
      const hostile = llmPhysics({
        baseP50Ms: 20,
        arrivalRps: 10,
        capacityRps: 1000,
        avgPromptTokens: tokenCount,
        avgOutputTokens: tokenCount,
      });
      expect(hostile).toEqual(defaults);
    },
  );

  it("keeps every queueing result finite across a hostile scalar matrix", () => {
    const hostile = [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, -1, 0, Number.MIN_VALUE, Number.MAX_VALUE];
    for (const value of hostile) {
      const queue = updateQueue(value, value, value, value, value, value);
      const latency = nodeLatency({
        baseP50Ms: value,
        baseP95Ms: value,
        baseP99Ms: value,
        arrivalRps: value,
        capacityRps: value,
        writeRatio: value,
        elapsedSeconds: value,
        queueDepth: value,
      });
      const llm = llmPhysics({
        baseP50Ms: value,
        arrivalRps: value,
        capacityRps: value,
        avgPromptTokens: value,
        avgOutputTokens: value,
        vramGbPerReplica: value,
        replicationFactor: value,
        activeConcurrentRequests: value,
      });
      for (const result of [queue.queueDepth, latency.p50Ms, latency.p95Ms, latency.p99Ms, latency.utilization, llm.ttftMs, llm.kvCachePct]) {
        expect(Number.isFinite(result)).toBe(true);
        expect(result).toBeGreaterThanOrEqual(0);
      }
    }
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
