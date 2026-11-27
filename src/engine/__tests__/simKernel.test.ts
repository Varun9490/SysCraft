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
      expect(output[slot + 10]).toBeCloseTo(entry.llm ? llm.ttftMs : 0, 9);
      expect(output[slot + 11]).toBeCloseTo(entry.llm ? llm.kvCachePct : 0, 9);
      expect(output[slot + 12]).toBeCloseTo(entry.llm ? llm.latencyPenalty : 1, 10);
      expect(output[slot + 13]).toBe(entry.llm && llm.preempted ? 1 : 0);
    });
  });
});
