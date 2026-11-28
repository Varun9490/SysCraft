import { SEED_RESOURCES } from "@/data/seedResources";
import { getOneWayLatencyMs } from "@/data/regionLatency";
import { getCustomResource } from "@/store/customResourceRegistry";
import type { ResourceCategory, StorageEngine } from "@/types/resource";
import {
  CACHE_FLUSH_WARMUP_S,
  CYCLE_DAMPING_BASE,
  TICK_INTERVAL_S,
  type ChaosState,
  type CircuitState,
  type EdgeFlow,
  type GraphEdge,
  type GraphNode,
  type GraphTopology,
  type NodeTelemetry,
  type SimTickSnapshot,
} from "@/types/simulation";
import {
  activeReplicas,
  cappedAdd,
  cappedDivide,
  cappedMultiply,
  cpuPercent,
  effectiveCapacity,
  errorRate,
  llmPhysics,
  MAX_SIM_VALUE,
  nodeLatency,
  sanitizeNonNegative,
  sanitizePositive,
  updateQueue,
  utilization,
} from "./queuingMath";
import {
  beginPhysicsBatch,
  commitPhysicsBatch,
  PHYSICS_STRIDE,
  writePhysicsNode,
} from "./wasm/simKernel";

const STORAGE_ENGINE_CODE: Record<StorageEngine, number> = {
  none: 0,
  b_tree: 1,
  lsm_tree: 2,
  in_memory: 3,
  append_log: 4,
  columnar: 5,
};

/**
 * Milestone 3 simulation core.
 *
 * Pure, deterministic discrete-event queuing engine shared by the 20Hz Web
 * Worker (`src/workers/simulation.worker.ts`), the main-thread fallback
 * interval in `useSimStore`, and Vitest unit tests. No browser globals, no
 * randomness, no NaN/Infinity escape hatches beyond the clamped math in
 * `queuingMath.ts`.
 *
 * Each tick runs:
 *  1. Topology compiler (adjacency lists + back-edge cycle detection).
 *  2. Fixed 8-pass damped Gauss-Seidel flow solver (cycle-safe, no recursion).
 *  3. Per-node M/M/c/K + Kingman physics, token-stream LLM math, bounded
 *     queues, circuit-breaker state machine, cache-hit decay.
 *  4. Aggregate snapshot for the 10Hz UI sync + 60fps particle overlay ref.
 */

export const GAUSS_SEIDEL_PASSES = 8;
export const CIRCUIT_ERROR_THRESHOLD = 0.5;
export const CIRCUIT_OPEN_TICKS = 60;
export const CIRCUIT_HALF_OPEN_TICKS = 100;
export const CIRCUIT_RECOVER_ERROR = 0.2;
export const CIRCUIT_RECOVER_TICKS = 20;
export const DEFAULT_ENTRY_RPS = 500;

export interface EngineEdgeCircuit {
  state: CircuitState;
  consecutiveErrorTicks: number;
  openTicks: number;
  halfOpenCalmTicks: number;
}

export interface SimulationEngineState {
  tick: number;
  elapsedSeconds: number;
  queueDepths: Record<string, number>;
  edgeCircuits: Record<string, EngineEdgeCircuit>;
  cacheEffectiveHit: Record<string, number>;
}

export interface StepResult {
  snapshot: SimTickSnapshot;
  nextState: SimulationEngineState;
}

interface ResourceMeta {
  category: ResourceCategory;
  storageEngine: StorageEngine;
  costPerHourUsd: number;
}

const META_CACHE = new Map<string, ResourceMeta>();

export function getResourceMeta(resourceId: string): ResourceMeta {
  const cached = META_CACHE.get(resourceId);
  if (cached) return cached;
  const custom = getCustomResource(resourceId);
  if (custom) {
    const meta: ResourceMeta = {
      category: custom.category,
      storageEngine: custom.storageEngine,
      costPerHourUsd: sanitizeNonNegative(custom.costPerHourUsd),
    };
    META_CACHE.set(resourceId, meta);
    return meta;
  }
  const fallback: ResourceMeta = {
    category: "compute",
    storageEngine: "none",
    costPerHourUsd: 0.1,
  };
  const def = SEED_RESOURCES.find((r) => r.id === resourceId);
  const meta: ResourceMeta = def
    ? {
        category: def.category,
        storageEngine: def.defaults.storageEngine,
        costPerHourUsd: sanitizeNonNegative(def.defaults.costPerHourUsd),
      }
    : fallback;
  META_CACHE.set(resourceId, meta);
  return meta;
}

export function isCacheLike(resourceId: string, category: ResourceCategory): boolean {
  if (category === "cache" || category === "edge") return true;
  const id = resourceId.toLowerCase();
  return id.includes("cache") || id.includes("cdn") || id.includes("redis") || id.includes("memcached");
}

export function isThrottleLike(resourceId: string, category: ResourceCategory): boolean {
  if (category === "api" || category === "security") return true;
  const id = resourceId.toLowerCase();
  return (
    id.includes("gateway") ||
    id.includes("waf") ||
    id.includes("rate") ||
    id.includes("load_balancer") ||
    id.includes("throttle")
  );
}

export function isLlmLike(category: ResourceCategory): boolean {
  return category === "ai_llm" || category === "vector_db";
}

export interface NodeChaosPenalty {
  capacityPenalty: number;
  latencyMs: number;
  arrivalMultiplier: number;
  extraError: number;
  /** True when a cache_flush targets this node — effective hit re-warms from cold. */
  cacheFlushed: boolean;
}

const NO_PENALTY: NodeChaosPenalty = {
  capacityPenalty: 0,
  latencyMs: 0,
  arrivalMultiplier: 1,
  extraError: 0,
  cacheFlushed: false,
};

function clamp01(value: number): number {
  if (Number.isNaN(value) || value < 0) return 0;
  return Math.min(value, 1);
}

function tickCounter(value: number): number {
  return Math.floor(sanitizeNonNegative(value));
}

/** Per-node chaos penalty honoring explicit fields plus kind defaults. */
export function chaosPenaltyForNode(node: GraphNode, chaos: ChaosState): NodeChaosPenalty {
  if (!chaos.active || chaos.kind === "none") return NO_PENALTY;
  const hasNodeTargets = chaos.targetNodeIds.length > 0;
  const hasRegionTarget = chaos.targetRegion !== null && chaos.targetRegion !== "";
  let targeted: boolean;
  if (!hasNodeTargets && !hasRegionTarget) {
    targeted = true;
  } else {
    targeted =
      (hasNodeTargets && chaos.targetNodeIds.includes(node.id)) ||
      (hasRegionTarget && node.region === chaos.targetRegion);
  }
  if (!targeted) return NO_PENALTY;

  const basePenalty = clamp01(chaos.capacityPenalty);
  const baseLatency = sanitizeNonNegative(chaos.latencyPenaltyMs);
  const penalty: NodeChaosPenalty = {
    capacityPenalty: basePenalty,
    latencyMs: baseLatency,
    arrivalMultiplier: 1,
    extraError: 0,
    cacheFlushed: false,
  };
  switch (chaos.kind) {
    case "zone_outage":
      penalty.capacityPenalty = Math.max(basePenalty, 0.34);
      break;
    case "cpu_hog":
      penalty.capacityPenalty = Math.max(basePenalty, 0.5);
      break;
    case "dependency_down":
      penalty.capacityPenalty = Math.max(basePenalty, 0.9);
      break;
    case "dns_failure":
      penalty.capacityPenalty = Math.max(basePenalty, 0.6);
      penalty.extraError = Math.max(penalty.extraError, 0.1);
      break;
    case "latency_spike":
      penalty.latencyMs = Math.max(baseLatency, 250);
      break;
    case "packet_loss":
      penalty.extraError = Math.max(penalty.extraError, 0.08);
      penalty.latencyMs = Math.max(baseLatency, 40);
      break;
    case "traffic_surge":
      penalty.arrivalMultiplier = 2.5;
      break;
    case "cache_flush":
      // A purge removes no compute capacity and adds no latency — it empties
      // the cache. The queued math in stepSimulationTick re-warms effective
      // hit rate from cold over CACHE_FLUSH_WARMUP_S.
      penalty.cacheFlushed = true;
      break;
    default:
      break;
  }
  return penalty;
}

export function createInitialEngineState(): SimulationEngineState {
  return {
    tick: 0,
    elapsedSeconds: 0,
    queueDepths: {},
    edgeCircuits: {},
    cacheEffectiveHit: {},
  };
}

function buildNodeIndex(topology: GraphTopology): Map<string, GraphNode> {
  const index = new Map<string, GraphNode>();
  for (const node of topology.nodes) {
    if (!index.has(node.id)) index.set(node.id, node);
  }
  return index;
}

function buildAdjacency(topology: GraphTopology): {
  outgoing: Map<string, GraphEdge[]>;
  indegree: Map<string, number>;
} {
  const outgoing = new Map<string, GraphEdge[]>();
  const indegree = new Map<string, number>();
  for (const node of topology.nodes) {
    outgoing.set(node.id, []);
    indegree.set(node.id, 0);
  }
  for (const edge of topology.edges) {
    if (!outgoing.has(edge.source) || !indegree.has(edge.target)) continue;
    outgoing.get(edge.source)?.push(edge);
    indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
  }
  return { outgoing, indegree };
}

/**
 * Deterministic DFS back-edge detection. Only an edge to a currently-gray
 * vertex closes a cycle; tree/forward/cross edges remain undamped. Node and
 * edge IDs are sorted so the result does not depend on canvas insertion order.
 */
export function computeBackEdges(topology: GraphTopology): Set<string> {
  const { outgoing } = buildAdjacency(topology);
  const compareIds = (left: string, right: string): number => {
    if (left < right) return -1;
    if (left > right) return 1;
    return 0;
  };
  const orderedOutgoing = new Map<string, GraphEdge[]>();
  for (const [nodeId, edges] of outgoing) {
    orderedOutgoing.set(
      nodeId,
      [...edges].sort((left, right) => compareIds(left.id, right.id)),
    );
  }

  const color = new Map<string, 0 | 1 | 2>();
  const backEdges = new Set<string>();
  const nodeIds = [...orderedOutgoing.keys()].sort(compareIds);

  for (const root of nodeIds) {
    if ((color.get(root) ?? 0) !== 0) continue;
    color.set(root, 1);
    const stack: Array<{ nodeId: string; nextEdge: number }> = [{ nodeId: root, nextEdge: 0 }];

    while (stack.length > 0) {
      const frame = stack[stack.length - 1];
      const edges = orderedOutgoing.get(frame.nodeId) ?? [];
      if (frame.nextEdge >= edges.length) {
        color.set(frame.nodeId, 2);
        stack.pop();
        continue;
      }

      const edge = edges[frame.nextEdge];
      frame.nextEdge += 1;
      const targetColor = color.get(edge.target) ?? 0;
      if (targetColor === 1) {
        backEdges.add(edge.id);
      } else if (targetColor === 0) {
        color.set(edge.target, 1);
        stack.push({ nodeId: edge.target, nextEdge: 0 });
      }
    }
  }

  return backEdges;
}

function defaultCircuit(): EngineEdgeCircuit {
  return { state: "closed", consecutiveErrorTicks: 0, openTicks: 0, halfOpenCalmTicks: 0 };
}

function nextCircuit(
  prev: EngineEdgeCircuit,
  targetErrorRate: number,
): EngineEdgeCircuit {
  const err = clamp01(targetErrorRate);
  switch (prev.state) {
    case "closed": {
      const consecutive = err > CIRCUIT_ERROR_THRESHOLD ? tickCounter(prev.consecutiveErrorTicks) + 1 : 0;
      if (consecutive >= CIRCUIT_OPEN_TICKS) {
        return { state: "open", consecutiveErrorTicks: 0, openTicks: 0, halfOpenCalmTicks: 0 };
      }
      return { state: "closed", consecutiveErrorTicks: consecutive, openTicks: 0, halfOpenCalmTicks: 0 };
    }
    case "open": {
      const openTicks = tickCounter(prev.openTicks) + 1;
      if (openTicks >= CIRCUIT_HALF_OPEN_TICKS) {
        return { state: "half_open", consecutiveErrorTicks: 0, openTicks: 0, halfOpenCalmTicks: 0 };
      }
      return { state: "open", consecutiveErrorTicks: 0, openTicks, halfOpenCalmTicks: 0 };
    }
    case "half_open": {
      if (err > CIRCUIT_ERROR_THRESHOLD) {
        return { state: "open", consecutiveErrorTicks: 0, openTicks: 0, halfOpenCalmTicks: 0 };
      }
      if (err < CIRCUIT_RECOVER_ERROR) {
        const calm = tickCounter(prev.halfOpenCalmTicks) + 1;
        if (calm >= CIRCUIT_RECOVER_TICKS) {
          return { state: "closed", consecutiveErrorTicks: 0, openTicks: 0, halfOpenCalmTicks: 0 };
        }
        return { state: "half_open", consecutiveErrorTicks: 0, openTicks: 0, halfOpenCalmTicks: calm };
      }
      return { state: "half_open", consecutiveErrorTicks: 0, openTicks: 0, halfOpenCalmTicks: 0 };
    }
    default:
      return defaultCircuit();
  }
}

function assertFiniteSnapshot(snapshot: SimTickSnapshot): void {
  const assertRecord = (record: Record<string, unknown>, label: string): void => {
    for (const [key, value] of Object.entries(record)) {
      if (typeof value !== "number") continue;
      if (!Number.isFinite(value) || value < 0 || value > MAX_SIM_VALUE) {
        throw new RangeError(`Simulation produced invalid ${label}.${key}: ${value}`);
      }
    }
  };

  assertRecord(snapshot as unknown as Record<string, unknown>, "snapshot");
  for (const [nodeId, telemetry] of Object.entries(snapshot.nodes)) {
    assertRecord(telemetry as unknown as Record<string, unknown>, `nodes.${nodeId}`);
  }
  for (const [edgeId, flow] of Object.entries(snapshot.edges)) {
    assertRecord(flow as unknown as Record<string, unknown>, `edges.${edgeId}`);
  }
}

/**
 * Advance the simulation by one 50ms tick.
 * Deterministic: identical (topology, chaosState, prevTick) inputs always
 * produce identical snapshots.
 */
export function stepSimulationTick(
  topology: GraphTopology,
  chaosState: ChaosState,
  prevTick: SimulationEngineState,
): StepResult {
  const nodeIndex = buildNodeIndex(topology);
  const { outgoing, indegree } = buildAdjacency(topology);
  const backEdges = computeBackEdges(topology);

  const penalties = new Map<string, NodeChaosPenalty>();
  const capacities = new Map<string, number>();
  for (const node of topology.nodes) {
    const penalty = chaosPenaltyForNode(node, chaosState);
    penalties.set(node.id, penalty);
    capacities.set(
      node.id,
      effectiveCapacity(node.replicationFactor, node.baseThroughputRps, penalty.capacityPenalty),
    );
  }

  const baseInjection = new Map<string, number>();
  for (const node of topology.nodes) {
    const penalty = penalties.get(node.id) ?? NO_PENALTY;
    const raw = sanitizeNonNegative(node.clientRps);
    const injected = raw > 0 ? cappedMultiply(raw, penalty.arrivalMultiplier) : 0;
    baseInjection.set(node.id, injected);
  }

  const circuits = new Map<string, EngineEdgeCircuit>();
  for (const edge of topology.edges) {
    circuits.set(edge.id, prevTick.edgeCircuits[edge.id] ?? defaultCircuit());
  }

  let arrival = new Map<string, number>(baseInjection);
  let edgeRps = new Map<string, number>();
  for (const edge of topology.edges) edgeRps.set(edge.id, 0);

  const effectiveHit = new Map<string, number>();
  // A cache_flush empties cache tiers: effective hit rate collapses to a cold
  // sliver, then LRU re-warms linearly over CACHE_FLUSH_WARMUP_S. Seeded from
  // the tick the chaos started so the ramp is deterministic under replay.
  const CHAOS_FLUSH_COLD_HIT = 0.05;
  const flushActiveTicks =
    chaosState.active && chaosState.kind === "cache_flush"
      ? Math.max(
          0,
          tickCounter(prevTick.tick) - tickCounter(chaosState.startedAtTick),
        )
      : 0;
  for (const node of topology.nodes) {
    const meta = getResourceMeta(node.resourceId);
    if (!isCacheLike(node.resourceId, meta.category)) continue;
    const base = clamp01(node.cacheHitRate);
    const prev = prevTick.cacheEffectiveHit[node.id];
    const smoothed = typeof prev === "number" && Number.isFinite(prev) ? prev : base;
    const surgeCollapse = (penalties.get(node.id)?.arrivalMultiplier ?? 1) > 1 ? 0.05 : base;
    const seeded = clamp01(0.7 * smoothed + 0.3 * surgeCollapse);
    if (penalties.get(node.id)?.cacheFlushed ?? false) {
      const warmAlpha = Math.min(1, (flushActiveTicks * TICK_INTERVAL_S) / CACHE_FLUSH_WARMUP_S);
      const warmTarget = CHAOS_FLUSH_COLD_HIT + (base - CHAOS_FLUSH_COLD_HIT) * warmAlpha;
      effectiveHit.set(node.id, Math.min(seeded, warmTarget));
      continue;
    }
    effectiveHit.set(node.id, seeded);
  }

  const computeOutput = (node: GraphNode, arrivalRps: number): number => {
    const meta = getResourceMeta(node.resourceId);
    const capacity = capacities.get(node.id) ?? 1;
    const served = Math.min(sanitizeNonNegative(arrivalRps), capacity);
    if (isCacheLike(node.resourceId, meta.category)) {
      const hit = effectiveHit.get(node.id) ?? clamp01(node.cacheHitRate);
      return served * (1 - hit);
    }
    if (isThrottleLike(node.resourceId, meta.category)) {
      const limit = sanitizePositive(node.rateLimitRps, capacity);
      return Math.min(served, limit);
    }
    return served;
  };

  for (let pass = 0; pass < GAUSS_SEIDEL_PASSES; pass += 1) {
    const passArrival = new Map<string, number>(baseInjection);
    const passEdgeRps = new Map<string, number>();
    for (const edge of topology.edges) passEdgeRps.set(edge.id, 0);

    for (const node of topology.nodes) {
      const out = computeOutput(node, passArrival.get(node.id) ?? 0);
      const downstream = (outgoing.get(node.id) ?? []).filter(
        (edge) => (circuits.get(edge.id)?.state ?? "closed") !== "open" && nodeIndex.has(edge.target),
      );
      if (downstream.length === 0) continue;

      let shares: number[];
      if (node.loadBalancer === "least_connections") {
        const weights = downstream.map((edge) => {
          const targetArrival = passArrival.get(edge.target) ?? 0;
          const targetCapacity = capacities.get(edge.target) ?? 1;
          const rho = utilization(targetArrival, targetCapacity);
          return 1 / (1 + Math.max(0, rho));
        });
        const total = weights.reduce((sum, weight) => cappedAdd(sum, weight), 0) || 1;
        shares = weights.map((weight) => weight / total);
      } else {
        const weights = downstream.map((edge) => {
          const weight = clamp01(edge.weight);
          return weight > 0 ? weight : 1;
        });
        const total = weights.reduce((sum, weight) => cappedAdd(sum, weight), 0) || 1;
        shares = weights.map((weight) => weight / total);
      }

      downstream.forEach((edge, index) => {
        const damping = backEdges.has(edge.id)
          ? Math.pow(CYCLE_DAMPING_BASE, pass + 1)
          : 1;
        const flow = cappedMultiply(out, cappedMultiply(shares[index] ?? 0, damping));
        passArrival.set(edge.target, cappedAdd(passArrival.get(edge.target) ?? 0, flow));
        passEdgeRps.set(edge.id, cappedAdd(passEdgeRps.get(edge.id) ?? 0, flow));
      });
    }

    arrival = passArrival;
    edgeRps = passEdgeRps;
  }

  const elapsedSeconds = cappedAdd(prevTick.elapsedSeconds, TICK_INTERVAL_S);
  const nodeTelemetry: Record<string, NodeTelemetry> = {};
  const edgeFlows: Record<string, EdgeFlow> = {};
  const nextQueueDepths: Record<string, number> = {};
  const nextCacheHit: Record<string, number> = {};
  const nextCircuits: Record<string, EngineEdgeCircuit> = {};

  let totalArrival = 0;
  let totalDropped = 0;
  let globalP99 = 0;
  let entryRps = 0;
  let totalCost = 0;

  // One batched call replaces the per-node JS math object churn. The WASM
  // workspace is borrowed for this tick only and reused on the next one.
  // If WASM is unavailable (or the graph exceeds 96 nodes), the pure TypeScript
  // queueing math below remains the exact fallback.
  const wasmInput = topology.nodes.length <= 96 ? beginPhysicsBatch() : null;
  if (wasmInput) {
    topology.nodes.forEach((node, index) => {
      const meta = getResourceMeta(node.resourceId);
      const lambda = sanitizeNonNegative(arrival.get(node.id) ?? 0);
      const capacity = capacities.get(node.id) ?? 1;
      writePhysicsNode(
        index,
        capacity,
        lambda,
        node.baseP50Ms,
        node.baseP95Ms,
        node.baseP99Ms,
        STORAGE_ENGINE_CODE[meta.storageEngine],
        node.writeRatio,
        elapsedSeconds,
        prevTick.queueDepths[node.id] ?? 0,
        node.maxConcurrency,
        node.replicationFactor,
        node.avgPromptTokens ?? 1024,
        node.avgOutputTokens ?? 256,
        node.vramGbPerReplica ?? 0,
        isLlmLike(meta.category),
      );
    });
  }
  const wasmOutput = wasmInput ? commitPhysicsBatch(topology.nodes.length) : null;
  let nodeIndexCounter = 0;

  for (const node of topology.nodes) {
    const nodeSlot = nodeIndexCounter * PHYSICS_STRIDE;
    nodeIndexCounter += 1;
    const meta = getResourceMeta(node.resourceId);
    const penalty = penalties.get(node.id) ?? NO_PENALTY;
    const lambda = sanitizeNonNegative(arrival.get(node.id) ?? 0);
    const capacity = capacities.get(node.id) ?? 1;
    const prevDepth = prevTick.queueDepths[node.id] ?? 0;
    const jsQueue = wasmOutput ? null : updateQueue(prevDepth, lambda, capacity, node.maxConcurrency, node.replicationFactor);
    const queueDepth = sanitizeNonNegative(wasmOutput ? wasmOutput[nodeSlot] : jsQueue!.queueDepth);
    const queueDropped = wasmOutput ? wasmOutput[nodeSlot + 1] >= 0.5 : jsQueue!.dropped;
    nextQueueDepths[node.id] = queueDepth;

    if (isCacheLike(node.resourceId, meta.category)) {
      const base = clamp01(node.cacheHitRate);
      if (penalty.cacheFlushed) {
        // The purge ramp set the authoritative value in the seed pass; keep it
        // stable for this tick. Warm-up resumes through the ramp next tick.
        nextCacheHit[node.id] = effectiveHit.get(node.id) ?? base;
      } else {
        const rhoGuess = utilization(lambda, capacity);
        const overloadDecay = Math.min(0.6, Math.max(0, rhoGuess - 0.8) * 0.8);
        const target = (effectiveHit.get(node.id) ?? base) * (1 - overloadDecay);
        const smoothed = clamp01(0.85 * (effectiveHit.get(node.id) ?? base) + 0.15 * target);
        nextCacheHit[node.id] = smoothed;
        effectiveHit.set(node.id, smoothed);
      }
    }

    const served = Math.min(lambda, capacity);
    const forwarded = computeOutput(node, lambda);
    const rho = sanitizeNonNegative(wasmOutput ? wasmOutput[nodeSlot + 6] : utilization(lambda, capacity));
    const overloadError = clamp01(wasmOutput ? wasmOutput[nodeSlot + 8] : errorRate(lambda, capacity));
    const combinedError = clamp01(cappedAdd(overloadError, penalty.extraError));
    const overloadDrops = cappedMultiply(
      Math.max(0, lambda - served),
      queueDropped ? 1 : 0.25,
    );
    const accountedDrops = Math.max(cappedMultiply(combinedError, lambda), overloadDrops);
    const outputRps = sanitizeNonNegative(forwarded);
    const jsLatency = wasmOutput
      ? null
      : nodeLatency({
          baseP50Ms: node.baseP50Ms,
          baseP95Ms: node.baseP95Ms,
          baseP99Ms: node.baseP99Ms,
          arrivalRps: lambda,
          capacityRps: capacity,
          storageEngine: meta.storageEngine,
          writeRatio: node.writeRatio,
          elapsedSeconds,
          queueDepth,
        });
    const baseP50 = sanitizeNonNegative(wasmOutput ? wasmOutput[nodeSlot + 2] : jsLatency!.p50Ms);
    const baseP95 = sanitizeNonNegative(wasmOutput ? wasmOutput[nodeSlot + 3] : jsLatency!.p95Ms);
    const baseP99 = sanitizeNonNegative(wasmOutput ? wasmOutput[nodeSlot + 4] : jsLatency!.p99Ms);

    let p50 = cappedAdd(baseP50, penalty.latencyMs);
    let p95 = cappedAdd(baseP95, penalty.latencyMs);
    let p99 = cappedAdd(baseP99, penalty.latencyMs);
    let ttftMs = 0;
    let kvCachePct = 0;
    if (isLlmLike(meta.category)) {
      if (wasmOutput) {
        ttftMs = cappedAdd(sanitizeNonNegative(wasmOutput[nodeSlot + 10]), penalty.latencyMs);
        kvCachePct = Math.min(100, sanitizeNonNegative(wasmOutput[nodeSlot + 11]));
        if (wasmOutput[nodeSlot + 13] >= 0.5) {
          const penaltyFactor = sanitizePositive(wasmOutput[nodeSlot + 12], 1);
          p50 = cappedMultiply(p50, penaltyFactor);
          p95 = cappedMultiply(p95, penaltyFactor);
          p99 = cappedMultiply(p99, penaltyFactor);
        }
      } else {
        const llm = llmPhysics({
          baseP50Ms: node.baseP50Ms,
          arrivalRps: lambda,
          capacityRps: capacity,
          avgPromptTokens: node.avgPromptTokens,
          avgOutputTokens: node.avgOutputTokens,
          vramGbPerReplica: node.vramGbPerReplica,
          replicationFactor: node.replicationFactor,
          activeConcurrentRequests: cappedMultiply(lambda, cappedDivide(baseP50, 1000)),
        });
        ttftMs = cappedAdd(llm.ttftMs, penalty.latencyMs);
        kvCachePct = llm.kvCachePct;
        if (llm.preempted) {
          p50 = cappedMultiply(p50, llm.latencyPenalty);
          p95 = cappedMultiply(p95, llm.latencyPenalty);
          p99 = cappedMultiply(p99, llm.latencyPenalty);
        }
      }
    }

    // Little's-Law in-service estimate: RPS currently occupying service slots,
    // bounded by the tier's total concurrency (max in flight x replicas).
    const concurrentInFlight =
      lambda > 0 && baseP50 > 0
        ? Math.min(
            cappedMultiply(
              activeReplicas(node.replicationFactor),
              Math.max(1, sanitizeNonNegative(node.maxConcurrency, 1)),
            ),
            cappedMultiply(lambda, cappedDivide(baseP50, 1000)),
          )
        : 0;

    const cacheHitPct = isCacheLike(node.resourceId, meta.category)
      ? Math.min(100, (effectiveHit.get(node.id) ?? clamp01(node.cacheHitRate)) * 100)
      : 0;

    nodeTelemetry[node.id] = {
      nodeId: node.id,
      arrivalRps: lambda,
      outputRps,
      capacityRps: capacity,
      utilization: rho,
      p50Ms: p50,
      p95Ms: p95,
      p99Ms: p99,
      queueDepth,
      concurrentInFlight,
      errorRate: combinedError,
      cpuPct: Math.min(
        100,
        sanitizeNonNegative(wasmOutput ? wasmOutput[nodeSlot + 9] : cpuPercent(rho, queueDepth, capacity)),
      ),
      cacheHitPct,
      ttftMs,
      kvCachePct,
      droppedRps: sanitizeNonNegative(accountedDrops),
    };

    totalArrival = cappedAdd(totalArrival, lambda);
    totalDropped = cappedAdd(totalDropped, Math.min(lambda, accountedDrops));
    if (p99 > globalP99) globalP99 = p99;
    if ((indegree.get(node.id) ?? 0) === 0) entryRps = cappedAdd(entryRps, outputRps);
    totalCost = cappedAdd(
      totalCost,
      cappedMultiply(
        sanitizeNonNegative(node.costPerHourUsdOverride ?? meta.costPerHourUsd),
        activeReplicas(node.replicationFactor),
      ),
    );
  }

  for (const edge of topology.edges) {
    const source = nodeIndex.get(edge.source);
    const target = nodeIndex.get(edge.target);
    if (!source || !target) continue;
    const sourceTele = nodeTelemetry[edge.source];
    const targetTele = nodeTelemetry[edge.target];
    const rps = sanitizeNonNegative(edgeRps.get(edge.id) ?? 0);
    const latencyMs = cappedAdd(
      sourceTele?.p50Ms ?? 0,
      sanitizeNonNegative(getOneWayLatencyMs(source.region, target.region)),
    );
    edgeFlows[edge.id] = {
      edgeId: edge.id,
      rps,
      latencyMs,
      errorRate: clamp01(targetTele?.errorRate ?? 0),
    };
    const prev = circuits.get(edge.id) ?? defaultCircuit();
    nextCircuits[edge.id] = nextCircuit(prev, targetTele?.errorRate ?? 0);
  }

  const globalErrorRate = totalArrival > 0
    ? Math.min(1, cappedDivide(totalDropped, totalArrival))
    : 0;
  const tick = Math.floor(cappedAdd(prevTick.tick, 1));
  const snapshot: SimTickSnapshot = {
    tick,
    timestampMs: Math.round(cappedMultiply(elapsedSeconds, 1000)),
    nodes: nodeTelemetry,
    edges: edgeFlows,
    globalRps: entryRps > 0 ? entryRps : totalArrival,
    globalP99Ms: globalP99,
    globalErrorRate,
    totalCostPerHourUsd: totalCost,
  };

  assertFiniteSnapshot(snapshot);

  return {
    snapshot,
    nextState: {
      tick,
      elapsedSeconds,
      queueDepths: nextQueueDepths,
      edgeCircuits: nextCircuits,
      cacheEffectiveHit: { ...prevTick.cacheEffectiveHit, ...nextCacheHit },
    },
  };
}
