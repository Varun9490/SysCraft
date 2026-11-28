import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  computeBackEdges,
  createInitialEngineState,
  stepSimulationTick,
} from "@/engine/simulationCore";
import { MAX_SIM_VALUE } from "@/engine/queuingMath";
import {
  FALLBACK_TICK_MS,
  HISTORY_CAP,
  HISTORY_WINDOW_MS,
  simSnapshotRef,
  UI_SYNC_MS,
  useSimStore,
} from "@/store/useSimStore";
import type { ChaosState, GraphTopology, SimTickSnapshot } from "@/types/simulation";

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

function expectFiniteSnapshot(snapshot: SimTickSnapshot): void {
  const records: object[] = [
    snapshot,
    ...Object.values(snapshot.nodes),
    ...Object.values(snapshot.edges),
  ];
  for (const record of records) {
    for (const [key, value] of Object.entries(record)) {
      if (typeof value !== "number") continue;
      expect(Number.isFinite(value), `${key} should be finite`).toBe(true);
      expect(value, `${key} should be non-negative`).toBeGreaterThanOrEqual(0);
      expect(value, `${key} should be capped`).toBeLessThanOrEqual(MAX_SIM_VALUE);
    }
  }
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
    const state = createInitialEngineState();
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

  it("marks only the deterministic DFS closing edge, not every cycle edge", () => {
    const topology: GraphTopology = {
      nodes: [node("c", "rest_service"), node("a", "rest_service"), node("b", "rest_service")],
      edges: [edge("e3", "c", "a"), edge("e1", "a", "b"), edge("e2", "b", "c")],
    };
    expect([...computeBackEdges(topology)]).toEqual(["e3"]);

    const reordered: GraphTopology = {
      nodes: [...topology.nodes].reverse(),
      edges: [...topology.edges].reverse(),
    };
    expect([...computeBackEdges(reordered)]).toEqual(["e3"]);
  });

  it("detects self-loops but leaves acyclic cross edges undamped", () => {
    const topology: GraphTopology = {
      nodes: [node("a", "rest_service"), node("b", "rest_service"), node("c", "rest_service")],
      edges: [edge("loop", "b", "b"), edge("ab", "a", "b"), edge("ac", "a", "c"), edge("cb", "c", "b")],
    };
    expect([...computeBackEdges(topology)]).toEqual(["loop"]);
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
    const state = createInitialEngineState();
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
    const state = stepSimulationTick(topology, FLUSH_CHAOS, createInitialEngineState()).nextState;
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

describe("hostile graph numeric totality", () => {
  const hostileValues = [
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    -1,
    0,
    Number.MIN_VALUE,
    Number.MAX_VALUE,
  ];

  it.each(hostileValues)("publishes only capped finite telemetry for scalar %s", (value) => {
    const service = {
      ...node("svc", "rest_service", { clientRps: value }),
      replicationFactor: value,
      baseThroughputRps: value,
      maxConcurrency: value,
      cacheHitRate: value,
      rateLimitRps: value,
      writeRatio: value,
      vramGbPerReplica: value,
      avgPromptTokens: value,
      avgOutputTokens: value,
      baseP50Ms: value,
      baseP95Ms: value,
      baseP99Ms: value,
      costPerHourUsdOverride: value,
    };
    const llm = {
      ...node("llm", "llm_inference", { clientRps: value }),
      replicationFactor: value,
      baseThroughputRps: value,
      maxConcurrency: value,
      writeRatio: value,
      vramGbPerReplica: value,
      avgPromptTokens: value,
      avgOutputTokens: value,
      baseP50Ms: value,
      baseP95Ms: value,
      baseP99Ms: value,
      costPerHourUsdOverride: value,
    };
    const topology: GraphTopology = {
      nodes: [service, llm],
      edges: [{ ...edge("e1", "svc", "llm"), weight: value }],
    };

    const { snapshot, nextState } = stepSimulationTick(topology, IDLE_CHAOS, createInitialEngineState());
    expectFiniteSnapshot(snapshot);
    expect(Number.isFinite(nextState.elapsedSeconds)).toBe(true);
    expect(Number.isFinite(nextState.queueDepths["llm"] ?? 0)).toBe(true);
  });

  it("does not turn MAX_VALUE latency or cost into zero or Infinity", () => {
    const topology: GraphTopology = {
      nodes: [{
        ...node("max", "llm_inference", { clientRps: Number.MAX_VALUE }),
        replicationFactor: Number.MAX_VALUE,
        baseThroughputRps: Number.MAX_VALUE,
        maxConcurrency: Number.MAX_VALUE,
        baseP50Ms: Number.MAX_VALUE,
        baseP95Ms: Number.MAX_VALUE,
        baseP99Ms: Number.MAX_VALUE,
        avgPromptTokens: Number.MAX_VALUE,
        avgOutputTokens: Number.MAX_VALUE,
        costPerHourUsdOverride: Number.MAX_VALUE,
      }],
      edges: [],
    };
    const { snapshot } = stepSimulationTick(topology, IDLE_CHAOS, createInitialEngineState());
    expectFiniteSnapshot(snapshot);
    expect(snapshot.nodes["max"]?.p99Ms).toBeGreaterThan(0);
    expect(snapshot.nodes["max"]?.ttftMs).toBeGreaterThan(0);
    expect(snapshot.totalCostPerHourUsd).toBeGreaterThan(0);
  });

  it("keeps the JavaScript fallback finite beyond the 96-node WASM limit", () => {
    const topology: GraphTopology = {
      nodes: Array.from({ length: 97 }, (_, index) => ({
        ...node(`node-${index}`, "rest_service", { clientRps: Number.MAX_VALUE }),
        replicationFactor: Number.MAX_VALUE,
        baseThroughputRps: Number.MAX_VALUE,
        maxConcurrency: Number.MAX_VALUE,
        baseP50Ms: Number.MAX_VALUE,
        baseP95Ms: Number.MAX_VALUE,
        baseP99Ms: Number.MAX_VALUE,
        costPerHourUsdOverride: Number.MAX_VALUE,
      })),
      edges: [],
    };
    const { snapshot } = stepSimulationTick(topology, IDLE_CHAOS, createInitialEngineState());
    expectFiniteSnapshot(snapshot);
    expect(Object.keys(snapshot.nodes)).toHaveLength(97);
    expect(snapshot.globalP99Ms).toBeGreaterThan(0);
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

class WorkerDouble {
  static instances: WorkerDouble[] = [];
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessageerror: ((event: Event) => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();

  constructor() {
    WorkerDouble.instances.push(this);
  }
}

describe("simulation worker fallback and lifecycle", () => {
  const topology: GraphTopology = {
    nodes: [node("svc", "rest_service", { clientRps: 100 })],
    edges: [],
  };

  beforeEach(() => {
    vi.useFakeTimers({ now: 0 });
    vi.spyOn(performance, "now").mockImplementation(() => Date.now());
    WorkerDouble.instances = [];
    vi.stubGlobal("window", {});
    vi.stubGlobal("Worker", WorkerDouble);
    const sim = useSimStore.getState();
    sim.stopSimulation();
    sim.resetEngine();
    sim.clearHistory();
  });

  afterEach(() => {
    useSimStore.getState().stopSimulation();
    vi.clearAllTimers();
    vi.restoreAllMocks();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("resets on failover, terminates the failed owner, and rejects stale callbacks", () => {
    useSimStore.getState().startSimulation(() => topology);
    const instance = WorkerDouble.instances[0];
    expect(instance).toBeDefined();
    if (!instance) throw new Error("Worker was not constructed");

    const sample = stepSimulationTick(topology, IDLE_CHAOS, createInitialEngineState()).snapshot;
    sample.tick = 42;
    const trace = {
      traceId: "trace-42",
      rootService: "svc",
      totalDurationMs: sample.globalP99Ms,
      spans: [],
      sampledAtTick: 42,
    };
    instance.onmessage?.({ data: { type: "snapshot", snapshot: sample, trace } } as MessageEvent);
    expect(useSimStore.getState().tick).toBe(42);

    const staleSnapshot = instance.onmessage;
    instance.onerror?.(new Event("worker-error"));
    expect(instance.terminate).toHaveBeenCalledOnce();
    expect(instance.onmessage).toBeNull();
    expect(instance.onerror).toBeNull();
    expect(instance.onmessageerror).toBeNull();
    expect(useSimStore.getState().useWorker).toBe(false);
    expect(useSimStore.getState().workerError).toContain("fallback");
    expect(simSnapshotRef.current).toBeNull();

    vi.advanceTimersByTime(FALLBACK_TICK_MS);
    expect(simSnapshotRef.current?.tick).toBe(1);

    const stale = { ...sample, tick: 999 };
    staleSnapshot?.({ data: { type: "snapshot", snapshot: stale, trace: null } } as MessageEvent);
    expect(simSnapshotRef.current?.tick).toBe(1);
  });

  it("detaches on stop and cannot restart a fallback from a stale worker error", () => {
    useSimStore.getState().startSimulation(() => topology);
    const instance = WorkerDouble.instances[0];
    if (!instance) throw new Error("Worker was not constructed");
    const staleError = instance.onerror;

    useSimStore.getState().stopSimulation();
    expect(instance.terminate).toHaveBeenCalledOnce();
    expect(instance.onmessage).toBeNull();
    expect(useSimStore.getState().running).toBe(false);

    staleError?.(new Event("late-worker-error"));
    vi.advanceTimersByTime(1000);
    expect(useSimStore.getState().running).toBe(false);
    expect(simSnapshotRef.current).toBeNull();
  });

  it("starts a trace on the same 20-tick cadence when Worker construction fails", () => {
    vi.stubGlobal("Worker", class {
      constructor() {
        throw new Error("restricted iframe");
      }
    });
    useSimStore.getState().startSimulation(() => topology);
    expect(useSimStore.getState().useWorker).toBe(false);

    vi.advanceTimersByTime(19 * FALLBACK_TICK_MS);
    expect(useSimStore.getState().latestTrace).toBeNull();
    vi.advanceTimersByTime(FALLBACK_TICK_MS);
    expect(useSimStore.getState().latestTrace?.sampledAtTick).toBe(20);
  });

  it("keeps a 60-second DVR at the documented 10Hz sample cadence", () => {
    vi.stubGlobal("Worker", class {
      constructor() {
        throw new Error("restricted iframe");
      }
    });
    useSimStore.getState().startSimulation(() => topology);
    expect(HISTORY_CAP * UI_SYNC_MS).toBe(HISTORY_WINDOW_MS);

    vi.advanceTimersByTime(HISTORY_WINDOW_MS);
    const history = useSimStore.getState().history;
    expect(history).toHaveLength(HISTORY_CAP);
    expect(history[0]?.timestampMs).toBe(UI_SYNC_MS);
    expect(history[history.length - 1]?.timestampMs).toBe(HISTORY_WINDOW_MS);

    useSimStore.getState().stopSimulation();
    vi.advanceTimersByTime(1000);
    expect(useSimStore.getState().history).toHaveLength(HISTORY_CAP);
  });
});
