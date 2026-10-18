import { SEED_RESOURCES } from "@/data/seedResources";
import { getOneWayLatencyMs } from "@/data/regionLatency";
import { getCustomResource } from "@/store/customResourceRegistry";
import type { ResourceCategory, StorageEngine } from "@/types/resource";
import {
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
  cpuPercent,
  effectiveCapacity,
  errorRate,
  llmPhysics,
  nodeLatency,
  updateQueue,
  utilization,
} from "./queuingMath";

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
      costPerHourUsd: custom.costPerHourUsd,
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
        costPerHourUsd: def.defaults.costPerHourUsd,
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
}

const NO_PENALTY: NodeChaosPenalty = {
  capacityPenalty: 0,
  latencyMs: 0,
  arrivalMultiplier: 1,
  extraError: 0,
};

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
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
  const baseLatency = Number.isFinite(chaos.latencyPenaltyMs) && chaos.latencyPenaltyMs > 0
    ? chaos.latencyPenaltyMs
    : 0;
  const penalty: NodeChaosPenalty = {
    capacityPenalty: basePenalty,
    latencyMs: baseLatency,
    arrivalMultiplier: 1,
    extraError: 0,
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

/** Back-edge detection: true when target can reach source (closes a cycle). */
export function computeBackEdges(topology: GraphTopology): Set<string> {
  const { outgoing } = buildAdjacency(topology);
  const backEdges = new Set<string>();
  const reaches = (from: string, goal: string): boolean => {
    if (from === goal) return true;
    const visited = new Set<string>([from]);
    const stack: string[] = [from];
    let guard = 0;
    while (stack.length > 0 && guard < 4096) {
      guard += 1;
      const current = stack.pop() as string;
      for (const edge of outgoing.get(current) ?? []) {
        if (edge.target === goal) return true;
        if (!visited.has(edge.target)) {
          visited.add(edge.target);
          stack.push(edge.target);
        }
      }
    }
    return false;
  };
  for (const edge of topology.edges) {
    if (reaches(edge.target, edge.source)) backEdges.add(edge.id);
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
      const consecutive = err > CIRCUIT_ERROR_THRESHOLD ? prev.consecutiveErrorTicks + 1 : 0;
      if (consecutive >= CIRCUIT_OPEN_TICKS) {
        return { state: "open", consecutiveErrorTicks: 0, openTicks: 0, halfOpenCalmTicks: 0 };
      }
      return { state: "closed", consecutiveErrorTicks: consecutive, openTicks: 0, halfOpenCalmTicks: 0 };
    }
    case "open": {
      const openTicks = prev.openTicks + 1;
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
        const calm = prev.halfOpenCalmTicks + 1;
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
    const raw = Number.isFinite(node.clientRps) && node.clientRps > 0 ? node.clientRps : 0;
    const injected = raw > 0 ? raw * penalty.arrivalMultiplier : 0;
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
  for (const node of topology.nodes) {
    const meta = getResourceMeta(node.resourceId);
    if (!isCacheLike(node.resourceId, meta.category)) continue;
    const base = clamp01(node.cacheHitRate);
    const prev = prevTick.cacheEffectiveHit[node.id];
    const smoothed = typeof prev === "number" && Number.isFinite(prev) ? prev : base;
    const surgeCollapse = (penalties.get(node.id)?.arrivalMultiplier ?? 1) > 1 ? 0.05 : base;
    effectiveHit.set(node.id, clamp01(0.7 * smoothed + 0.3 * surgeCollapse));
  }

  const computeOutput = (node: GraphNode, arrivalRps: number): number => {
    const meta = getResourceMeta(node.resourceId);
    const capacity = capacities.get(node.id) ?? 1;
    const served = Math.min(Math.max(0, arrivalRps), capacity);
    if (isCacheLike(node.resourceId, meta.category)) {
      const hit = effectiveHit.get(node.id) ?? clamp01(node.cacheHitRate);
      return served * (1 - hit);
    }
    if (isThrottleLike(node.resourceId, meta.category)) {
      const limit = node.rateLimitRps > 0 ? node.rateLimitRps : capacity;
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
        const total = weights.reduce((sum, w) => sum + w, 0) || 1;
        shares = weights.map((w) => w / total);
      } else {
        const weights = downstream.map((edge) => (edge.weight > 0 ? edge.weight : 1));
        const total = weights.reduce((sum, w) => sum + w, 0) || 1;
        shares = weights.map((w) => w / total);
      }

      downstream.forEach((edge, index) => {
        const damping = backEdges.has(edge.id)
          ? Math.pow(CYCLE_DAMPING_BASE, pass + 1)
          : 1;
        const flow = out * (shares[index] ?? 0) * damping;
        passArrival.set(edge.target, (passArrival.get(edge.target) ?? 0) + flow);
        passEdgeRps.set(edge.id, (passEdgeRps.get(edge.id) ?? 0) + flow);
      });
    }

    arrival = passArrival;
    edgeRps = passEdgeRps;
  }

  const elapsedSeconds = prevTick.elapsedSeconds + TICK_INTERVAL_S;
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

  for (const node of topology.nodes) {
    const meta = getResourceMeta(node.resourceId);
    const penalty = penalties.get(node.id) ?? NO_PENALTY;
    const lambda = Math.max(0, arrival.get(node.id) ?? 0);
    const capacity = capacities.get(node.id) ?? 1;
    const prevDepth = prevTick.queueDepths[node.id] ?? 0;
    const queue = updateQueue(prevDepth, lambda, capacity, node.maxConcurrency, node.replicationFactor);
    nextQueueDepths[node.id] = queue.queueDepth;

    if (isCacheLike(node.resourceId, meta.category)) {
      const base = clamp01(node.cacheHitRate);
      const rhoGuess = utilization(lambda, capacity);
      const overloadDecay = Math.min(0.6, Math.max(0, rhoGuess - 0.8) * 0.8);
      const target = (effectiveHit.get(node.id) ?? base) * (1 - overloadDecay);
      const smoothed = clamp01(0.85 * (effectiveHit.get(node.id) ?? base) + 0.15 * target);
      nextCacheHit[node.id] = smoothed;
      effectiveHit.set(node.id, smoothed);
    }

    const served = Math.min(lambda, capacity);
    const forwarded = computeOutput(node, lambda);
    const overloadError = errorRate(lambda, capacity);
    const combinedError = Math.min(1, Math.max(0, overloadError + penalty.extraError));
    const overloadDrops = Math.max(0, lambda - served) * (queue.dropped ? 1 : 0.25);
    const accountedDrops = Math.max(combinedError * lambda, overloadDrops);
    const outputRps = Math.max(0, forwarded);

    const lat = nodeLatency({
      baseP50Ms: node.baseP50Ms,
      baseP95Ms: node.baseP95Ms,
      baseP99Ms: node.baseP99Ms,
      arrivalRps: lambda,
      capacityRps: capacity,
      storageEngine: meta.storageEngine,
      writeRatio: node.writeRatio,
      elapsedSeconds,
      queueDepth: queue.queueDepth,
    });

    let p50 = lat.p50Ms + penalty.latencyMs;
    let p95 = lat.p95Ms + penalty.latencyMs;
    let p99 = lat.p99Ms + penalty.latencyMs;
    let ttftMs = 0;
    let kvCachePct = 0;
    if (isLlmLike(meta.category)) {
      const llm = llmPhysics({
        baseP50Ms: node.baseP50Ms,
        arrivalRps: lambda,
        capacityRps: capacity,
        avgPromptTokens: node.avgPromptTokens,
        avgOutputTokens: node.avgOutputTokens,
        vramGbPerReplica: node.vramGbPerReplica,
        replicationFactor: node.replicationFactor,
        activeConcurrentRequests: lambda * (lat.p50Ms / 1000),
      });
      ttftMs = llm.ttftMs + penalty.latencyMs;
      kvCachePct = llm.kvCachePct;
      if (llm.preempted) {
        p50 *= llm.latencyPenalty;
        p95 *= llm.latencyPenalty;
        p99 *= llm.latencyPenalty;
      }
    }

    const cacheHitPct = isCacheLike(node.resourceId, meta.category)
      ? (effectiveHit.get(node.id) ?? clamp01(node.cacheHitRate)) * 100
      : 0;

    nodeTelemetry[node.id] = {
      nodeId: node.id,
      arrivalRps: lambda,
      outputRps,
      capacityRps: capacity,
      utilization: utilization(lambda, capacity),
      p50Ms: p50,
      p95Ms: p95,
      p99Ms: p99,
      queueDepth: queue.queueDepth,
      errorRate: combinedError,
      cpuPct: cpuPercent(utilization(lambda, capacity), queue.queueDepth, capacity),
      cacheHitPct,
      ttftMs,
      kvCachePct,
      droppedRps: Math.max(0, accountedDrops),
    };

    totalArrival += lambda;
    totalDropped += Math.min(lambda, accountedDrops);
    if (p99 > globalP99) globalP99 = p99;
    if ((indegree.get(node.id) ?? 0) === 0) entryRps += outputRps;
    totalCost += (node.costPerHourUsdOverride ?? meta.costPerHourUsd) * Math.max(1, Math.floor(node.replicationFactor));
  }

  for (const edge of topology.edges) {
    const source = nodeIndex.get(edge.source);
    const target = nodeIndex.get(edge.target);
    if (!source || !target) continue;
    const sourceTele = nodeTelemetry[edge.source];
    const targetTele = nodeTelemetry[edge.target];
    const rps = Math.max(0, edgeRps.get(edge.id) ?? 0);
    const latencyMs =
      (sourceTele?.p50Ms ?? 0) + getOneWayLatencyMs(source.region, target.region);
    edgeFlows[edge.id] = {
      edgeId: edge.id,
      rps,
      latencyMs,
      errorRate: clamp01(targetTele?.errorRate ?? 0),
    };
    const prev = circuits.get(edge.id) ?? defaultCircuit();
    nextCircuits[edge.id] = nextCircuit(prev, targetTele?.errorRate ?? 0);
  }

  const globalErrorRate = totalArrival > 0 ? Math.min(1, totalDropped / totalArrival) : 0;
  const tick = prevTick.tick + 1;
  const snapshot: SimTickSnapshot = {
    tick,
    timestampMs: Math.round(elapsedSeconds * 1000),
    nodes: nodeTelemetry,
    edges: edgeFlows,
    globalRps: entryRps > 0 ? entryRps : totalArrival,
    globalP99Ms: globalP99,
    globalErrorRate,
    totalCostPerHourUsd: totalCost,
  };

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
