import { describe, expect, it } from "vitest";
import {
  cpuPercent,
  errorRate,
  llmPhysics,
  nodeLatency,
  updateQueue,
} from "@/engine/queuingMath";
import type { StorageEngine } from "@/types/resource";
import {
  beginPhysicsBatch,
  commitPhysicsBatch,
  maxPhysicsNodes,
  PHYSICS_STRIDE,
  simKernelMemoryBytes,
  simKernelStatus,
  writePhysicsNode,
} from "@/engine/wasm/simKernel";

interface Case {
  capacity: number;
  arrival: number;
  baseP50: number;
  baseP95: number;
  baseP99: number;
  engine: StorageEngine;
  writeRatio: number;
  elapsed: number;
  prevDepth: number;
  maxConcurrency: number;
  replication: number;
  prompt: number;
  output: number;
  vram: number;
  llm: boolean;
}

const CODES: Record<StorageEngine, number> = {
  none: 0,
  b_tree: 1,
  lsm_tree: 2,
  in_memory: 3,
  append_log: 4,
  columnar: 5,
};

const CASES: Case[] = [
  {
    capacity: 1000, arrival: 500, baseP50: 10, baseP95: 20, baseP99: 40,
    engine: "none", writeRatio: 0, elapsed: 0, prevDepth: 0,
    maxConcurrency: 100, replication: 1, prompt: 1024, output: 256, vram: 24, llm: false,
  },
  {
    capacity: 1000, arrival: 2000, baseP50: 10, baseP95: 20, baseP99: 40,
    engine: "b_tree", writeRatio: 0.7, elapsed: 1, prevDepth: 4,
    maxConcurrency: 100, replication: 2, prompt: 4096, output: 512, vram: 80, llm: false,
  },
  {
    capacity: 500, arrival: 520, baseP50: 180, baseP95: 320, baseP99: 640,
    engine: "lsm_tree", writeRatio: 0.3, elapsed: 3, prevDepth: 12,
    maxConcurrency: 24, replication: 1, prompt: 8192, output: 1024, vram: 48, llm: true,
  },
  {
    capacity: 1, arrival: 0, baseP50: 0, baseP95: 0, baseP99: 0,
    engine: "append_log", writeRatio: 1, elapsed: 60, prevDepth: 100,
    maxConcurrency: 1, replication: 0, prompt: 1, output: 1, vram: 0, llm: true,
  },
  {
    capacity: 1000, arrival: 10, baseP50: 20, baseP95: 30, baseP99: 40,
    engine: "none", writeRatio: 0, elapsed: 0, prevDepth: 0,
    maxConcurrency: 10, replication: 1, prompt: Number.NaN, output: Number.POSITIVE_INFINITY, vram: 24, llm: true,
  },
  {
    capacity: 1, arrival: Number.MAX_VALUE, baseP50: Number.MAX_VALUE, baseP95: Number.MAX_VALUE, baseP99: Number.MAX_VALUE,
    engine: "b_tree", writeRatio: Number.MAX_VALUE, elapsed: Number.POSITIVE_INFINITY, prevDepth: Number.MAX_VALUE,
    maxConcurrency: Number.MAX_VALUE, replication: Number.MAX_VALUE, prompt: Number.MAX_VALUE, output: Number.MAX_VALUE,
    vram: Number.MIN_VALUE, llm: true,
  },
  {
    capacity: Number.NaN, arrival: Number.POSITIVE_INFINITY, baseP50: Number.NEGATIVE_INFINITY,
    baseP95: -1, baseP99: Number.MIN_VALUE, engine: "lsm_tree", writeRatio: Number.NaN,
    elapsed: Number.NEGATIVE_INFINITY, prevDepth: Number.NaN, maxConcurrency: 0,
    replication: Number.NEGATIVE_INFINITY, prompt: Number.NEGATIVE_INFINITY,
    output: -1, vram: Number.NaN, llm: true,
  },
];

describe("embedded WASM physics kernel", () => {
  it("loads the real module and keeps its memory capped at one page", () => {
    expect(simKernelStatus()).toBe("wasm");
    expect(maxPhysicsNodes()).toBe(96);
    expect(simKernelMemoryBytes()).toBe(65_536);
  });

  it("matches the TypeScript queue, latency, error, CPU, and LLM formulas", () => {
    expect(beginPhysicsBatch()).not.toBeNull();
    CASES.forEach((entry, index) => {
      writePhysicsNode(
        index,
        entry.capacity,
        entry.arrival,
        entry.baseP50,
        entry.baseP95,
        entry.baseP99,
        CODES[entry.engine],
        entry.writeRatio,
        entry.elapsed,
        entry.prevDepth,
        entry.maxConcurrency,
        entry.replication,
        entry.prompt,
        entry.output,
        entry.vram,
        entry.llm,
      );
    });
    const output = commitPhysicsBatch(CASES.length);
    expect(output).not.toBeNull();
    if (!output) return;

    CASES.forEach((entry, index) => {
      const slot = index * PHYSICS_STRIDE;
      for (let offset = 0; offset < PHYSICS_STRIDE; offset += 1) {
        expect(Number.isFinite(output[slot + offset]), `case ${index} slot ${offset}`).toBe(true);
        expect(output[slot + offset]).toBeGreaterThanOrEqual(0);
      }
      const queue = updateQueue(entry.prevDepth, entry.arrival, entry.capacity, entry.maxConcurrency, entry.replication);
      const latency = nodeLatency({
        baseP50Ms: entry.baseP50,
        baseP95Ms: entry.baseP95,
        baseP99Ms: entry.baseP99,
        arrivalRps: entry.arrival,
        capacityRps: entry.capacity,
        storageEngine: entry.engine,
        writeRatio: entry.writeRatio,
        elapsedSeconds: entry.elapsed,
        queueDepth: queue.queueDepth,
      });
      const rho = latency.utilization;
      const llm = llmPhysics({
        baseP50Ms: entry.baseP50,
        arrivalRps: entry.arrival,
        capacityRps: entry.capacity,
        avgPromptTokens: entry.prompt,
        avgOutputTokens: entry.output,
        vramGbPerReplica: entry.vram,
        replicationFactor: entry.replication,
        activeConcurrentRequests: entry.arrival * (latency.p50Ms / 1000),
      });

      expect(output[slot]).toBeCloseTo(queue.queueDepth, 10);
      expect(output[slot + 1]).toBe(queue.dropped ? 1 : 0);
      expect(output[slot + 2]).toBeCloseTo(latency.p50Ms, 9);
      expect(output[slot + 3]).toBeCloseTo(latency.p95Ms, 9);
      expect(output[slot + 4]).toBeCloseTo(latency.p99Ms, 9);
      expect(output[slot + 5]).toBeCloseTo(latency.queueWaitMs, 9);
      expect(output[slot + 6]).toBeCloseTo(rho, 10);
      expect(output[slot + 7]).toBeCloseTo(latency.multiplier, 10);
      expect(output[slot + 8]).toBeCloseTo(errorRate(entry.arrival, entry.capacity), 10);
      expect(output[slot + 9]).toBeCloseTo(cpuPercent(rho, queue.queueDepth, entry.capacity), 10);
      expect(output[slot + 10], `case ${index} TTFT`).toBeCloseTo(entry.llm ? llm.ttftMs : 0, 9);
      expect(output[slot + 11], `case ${index} KV`).toBeCloseTo(entry.llm ? llm.kvCachePct : 0, 9);
      expect(output[slot + 12], `case ${index} penalty`).toBeCloseTo(entry.llm ? llm.latencyPenalty : 1, 10);
      expect(output[slot + 13]).toBe(entry.llm && llm.preempted ? 1 : 0);
    });
  });

  it("matches JavaScript token fallback semantics across the hostile matrix", () => {
    const values = [
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      -1,
      0,
      Number.MIN_VALUE,
      Number.MAX_VALUE,
    ];
    expect(beginPhysicsBatch()).not.toBeNull();

    for (const prompt of values) {
      for (const outputTokens of values) {
        writePhysicsNode(
          0, 1000, 10, 20, 30, 40, CODES.none, 0, 0, 0,
          10, 1, prompt, outputTokens, 24, true,
        );
        const output = commitPhysicsBatch(1);
        expect(output).not.toBeNull();
        if (!output) return;
        const expected = llmPhysics({
          baseP50Ms: 20,
          arrivalRps: 10,
          capacityRps: 1000,
          avgPromptTokens: prompt,
          avgOutputTokens: outputTokens,
          vramGbPerReplica: 24,
          replicationFactor: 1,
          activeConcurrentRequests: 10 * (
            nodeLatency({
              baseP50Ms: 20,
              baseP95Ms: 30,
              baseP99Ms: 40,
              arrivalRps: 10,
              capacityRps: 1000,
            }).p50Ms / 1000
          ),
        });
        expect(output[10]).toBeCloseTo(expected.ttftMs, 9);
        expect(output[11]).toBeCloseTo(expected.kvCachePct, 9);
        expect(output[12]).toBeCloseTo(expected.latencyPenalty, 10);
        expect(output[13]).toBe(expected.preempted ? 1 : 0);
      }
    }
  });
});
