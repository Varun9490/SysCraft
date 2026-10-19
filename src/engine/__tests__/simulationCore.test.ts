import { describe, expect, it } from "vitest";
import {
  computeBackEdges,
  createInitialEngineState,
  stepSimulationTick,
} from "@/engine/simulationCore";
import type { ChaosState, GraphTopology } from "@/types/simulation";

const IDLE_CHAOS: ChaosState = {
  active: false,
  kind: "none",
  capacityPenalty: 0,
  latencyPenaltyMs: 0,
  targetNodeIds: [],
  targetRegion: null,
  startedAtTick: 0,
};

function node(
  id: string,
  resourceId: string,
  overrides: Partial<Record<string, number | string>> = {},
) {
  return {
    id,
    resourceId,
    position: { x: 0, y: 0 },
    clientRps: typeof overrides["clientRps"] === "number" ? (overrides["clientRps"] as number) : 0,
    replicationFactor: 2,
    baseThroughputRps: 5000,
    maxConcurrency: 500,
    cacheHitRate: 0,
    rateLimitRps: 10000,
    writeRatio: 0.2,
    vramGbPerReplica: 0,
    avgPromptTokens: 1024,
    avgOutputTokens: 256,
    baseP50Ms: 5,
    baseP95Ms: 15,
    baseP99Ms: 40,
    region: typeof overrides["region"] === "string" ? (overrides["region"] as string) : "us-east-1",
    loadBalancer: "round_robin" as const,
  };
}

function edge(id: string, source: string, target: string) {
  return { id, source, target, weight: 1, circuit: "closed" as const, consecutiveErrorTicks: 0 };
}

describe("empty and trivial topologies", () => {
  it("produces a zero snapshot for an empty canvas", () => {
    const { snapshot, nextState } = stepSimulationTick({ nodes: [], edges: [] }, IDLE_CHAOS, createInitialEngineState());
    expect(snapshot.tick).toBe(1);
    expect(snapshot.globalRps).toBe(0);
    expect(snapshot.globalErrorRate).toBe(0);
    expect(nextState.tick).toBe(1);
  });

  it("serves an isolated generator node without errors", () => {
    const topology: GraphTopology = { nodes: [node("gen", "rest_service", { clientRps: 800 })], edges: [] };
    const { snapshot } = stepSimulationTick(topology, IDLE_CHAOS, createInitialEngineState());
    expect(snapshot.nodes["gen"]?.arrivalRps).toBe(800);
    expect(snapshot.nodes["gen"]?.errorRate).toBe(0);
    expect(snapshot.globalRps).toBeCloseTo(800, 3);
  });
});

describe("flow propagation", () => {
  it("propagates traffic down a linear chain", () => {
    const topology: GraphTopology = {
      nodes: [node("a", "api_gateway", { clientRps: 1000 }), node("b", "rest_service"), node("c", "postgres_db")],
      edges: [edge("e1", "a", "b"), edge("e2", "b", "c")],
    };
    const { snapshot } = stepSimulationTick(topology, IDLE_CHAOS, createInitialEngineState());
    expect(snapshot.nodes["b"]?.arrivalRps ?? 0).toBeGreaterThan(900);
    expect(snapshot.nodes["c"]?.arrivalRps ?? 0).toBeGreaterThan(900);
    expect(snapshot.edges["e1"]?.rps ?? 0).toBeGreaterThan(900);
  });

  it("absorbs cache hits before the origin", () => {
    const topology: GraphTopology = {
      nodes: [
        node("svc", "rest_service", { clientRps: 2000 }),
        { ...node("cache", "redis_cache"), cacheHitRate: 0.9 },
        node("db", "postgres_db"),
      ],
      edges: [edge("e1", "svc", "cache"), edge("e2", "cache", "db")],
    };
    const { snapshot } = stepSimulationTick(topology, IDLE_CHAOS, createInitialEngineState());
    const dbArrival = snapshot.nodes["db"]?.arrivalRps ?? Number.POSITIVE_INFINITY;
    expect(dbArrival).toBeLessThan(2000);
    expect(snapshot.nodes["cache"]?.cacheHitPct ?? 0).toBeGreaterThan(0);
  });

  it("sheds overload as errors with bounded queues", () => {
    const small = { ...node("tiny", "rest_service", { clientRps: 50000 }), replicationFactor: 1, baseThroughputRps: 100, maxConcurrency: 10 };
    const topology: GraphTopology = { nodes: [small], edges: [] };
    let state = createInitialEngineState();
    let last = stepSimulationTick(topology, IDLE_CHAOS, state);
    for (let i = 0; i < 30; i += 1) {
      last = stepSimulationTick(topology, IDLE_CHAOS, last.nextState);
    }
    expect(last.snapshot.nodes["tiny"]?.errorRate ?? 0).toBeGreaterThan(0.5);
    expect(last.snapshot.nodes["tiny"]?.queueDepth ?? 0).toBeLessThanOrEqual(10);
    expect(Number.isFinite(last.snapshot.globalP99Ms)).toBe(true);
  });
});

describe("cycles and circuit breakers", () => {
  it("detects back edges and terminates cyclic flow", () => {
    const topology: GraphTopology = {
      nodes: [node("a", "rest_service", { clientRps: 500 }), node("b", "redis_cache")],
      edges: [edge("e1", "a", "b"), edge("e2", "b", "a")],
    };
    expect(computeBackEdges(topology).size).toBeGreaterThan(0);
    const { snapshot } = stepSimulationTick(topology, IDLE_CHAOS, createInitialEngineState());
    for (const tele of Object.values(snapshot.nodes)) {
      expect(Number.isFinite(tele.arrivalRps)).toBe(true);
      expect(tele.arrivalRps).toBeLessThan(5000);
    }
  });

  it("opens circuits feeding sustained-failure nodes", () => {
    const down = {
      ...node("db", "postgres_db"),
      replicationFactor: 1,
      baseThroughputRps: 10,
      maxConcurrency: 5,
    };
    const topology: GraphTopology = {
      nodes: [node("api", "rest_service", { clientRps: 5000 }), down],
      edges: [edge("e1", "api", "db")],
    };
    let state = createInitialEngineState();
    let last = stepSimulationTick(topology, IDLE_CHAOS, state);
    for (let i = 0; i < 80; i += 1) {
      last = stepSimulationTick(topology, IDLE_CHAOS, last.nextState);
    }
    expect(last.nextState.edgeCircuits["e1"]?.state).toBe("open");
  });
});

describe("cache flush chaos", () => {
  const flushTopology = (): GraphTopology => ({
    nodes: [
      node("svc", "rest_service", { clientRps: 2000 }),
      { ...node("cache", "redis_cache"), cacheHitRate: 0.9 },
      node("db", "postgres_db"),
    ],
    edges: [edge("e1", "svc", "cache"), edge("e2", "cache", "db")],
  });

  const FLUSH_CHAOS: ChaosState = { ...IDLE_CHAOS, active: true, kind: "cache_flush", startedAtTick: 1 };

  it("collapses effective hit rate immediately, then re-warms deterministically", () => {
    const topology = flushTopology();
    const cold = stepSimulationTick(topology, FLUSH_CHAOS, createInitialEngineState());
    const coldHit = cold.snapshot.nodes["cache"]?.cacheHitPct ?? 100;
    expect(coldHit).toBeLessThan(15);

    // DB absorbs the miss burst while the cache is cold.
    const dbArrival = cold.snapshot.nodes["db"]?.arrivalRps ?? 0;
    expect(dbArrival).toBeGreaterThan(1500);

    // Three ticks-seconds later, still flushed: 3s is ~12% into the 25s
    // LRU warm ramp, so the hit rate is climbing back but nowhere near base.
    let state = cold.nextState;
    for (let i = 0; i < 60; i += 1) {
      state = stepSimulationTick(topology, FLUSH_CHAOS, state).nextState;
    }
    const warm = stepSimulationTick(topology, FLUSH_CHAOS, state);
    const warmHit = warm.snapshot.nodes["cache"]?.cacheHitPct ?? 0;
    expect(warmHit).toBeGreaterThan(coldHit);
    expect(warmHit).toBeLessThan(40);
  });

  it("recovers to the configured hit rate once the flush clears", () => {
    const topology = flushTopology();
    let state = stepSimulationTick(topology, FLUSH_CHAOS, createInitialEngineState()).nextState;
    let last = stepSimulationTick(topology, IDLE_CHAOS, state);
    for (let i = 0; i < 40; i += 1) {
      last = stepSimulationTick(topology, IDLE_CHAOS, last.nextState);
    }
    const recovered = last.snapshot.nodes["cache"]?.cacheHitPct ?? 0;
    expect(recovered).toBeGreaterThan(80);
  });
});

describe("concurrency telemetry", () => {
  it("reports Little's-Law in-flight concurrency within the tier's slots", () => {
    const topology: GraphTopology = {
      nodes: [
        node("gw", "api_gateway", { clientRps: 3000 }),
        node("svc", "rest_service"),
        node("db", "postgres_db"),
      ],
      edges: [edge("e1", "gw", "svc"), edge("e2", "svc", "db")],
    };
    const { snapshot } = stepSimulationTick(topology, IDLE_CHAOS, createInitialEngineState());
    const busy = snapshot.nodes["svc"]?.concurrentInFlight ?? 0;
    expect(busy).toBeGreaterThan(0);
    expect(busy).toBeLessThanOrEqual(2 * 500); // replicas x maxConcurrency
    const dbBusy = snapshot.nodes["db"]?.concurrentInFlight ?? 0;
    expect(dbBusy).toBeGreaterThan(0);
  });

  it("stays zero when the tier receives no traffic", () => {
    const topology: GraphTopology = {
      nodes: [node("idle", "rest_service")],
      edges: [],
    };
    const { snapshot } = stepSimulationTick(topology, IDLE_CHAOS, createInitialEngineState());
    expect(snapshot.nodes["idle"]?.concurrentInFlight ?? 0).toBe(0);
  });
});

describe("chaos and determinism", () => {
  it("zone outage removes roughly a third of capacity", () => {
    const topology: GraphTopology = {
      nodes: [{ ...node("svc", "rest_service", { clientRps: 1000 }), replicationFactor: 1, baseThroughputRps: 1000 }],
      edges: [],
    };
    const chaos: ChaosState = { ...IDLE_CHAOS, active: true, kind: "zone_outage", capacityPenalty: 0 };
    const { snapshot } = stepSimulationTick(topology, chaos, createInitialEngineState());
    expect(snapshot.nodes["svc"]?.capacityRps ?? 0).toBeLessThan(1000);
    expect(snapshot.nodes["svc"]?.capacityRps ?? 0).toBeGreaterThan(500);
  });

  it("is deterministic tick-for-tick", () => {
    const topology: GraphTopology = {
      nodes: [node("a", "api_gateway", { clientRps: 1200 }), node("b", "rest_service"), node("c", "redis_cache")],
      edges: [edge("e1", "a", "b"), edge("e2", "b", "c"), edge("e3", "c", "b")],
    };
    const run = () => {
      let state = createInitialEngineState();
      let last = stepSimulationTick(topology, IDLE_CHAOS, state);
      state = last.nextState;
      last = stepSimulationTick(topology, IDLE_CHAOS, state);
      return last.snapshot;
    };
    expect(run()).toEqual(run());
  });
});
