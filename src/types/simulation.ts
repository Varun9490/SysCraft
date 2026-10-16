import { z } from "zod";

/**
 * Discrete-event simulation tick state, M/M/c/K queue metrics,
 * OpenTelemetry span types, topology envelopes, and chaos state.
 * Produced by simulationCore.ts at 20Hz inside the Web Worker and
 * consumed by useSimStore (10Hz UI badges) + TrafficParticleLayer (60fps ref).
 */

export const TICK_INTERVAL_S = 0.05;
export const UI_SYNC_INTERVAL_S = 0.1;
export const HISTORY_RING_CAPACITY = 1200; // 60s at 20Hz
export const MAX_GAUSS_SEIDEL_PASSES = 8;
export const CYCLE_DAMPING_BASE = 0.85;

export const LoadBalancerAlgorithmSchema = z.enum([
  "round_robin",
  "least_connections",
  "consistent_hashing",
]);

export type LoadBalancerAlgorithm = z.infer<typeof LoadBalancerAlgorithmSchema>;

export const CircuitStateSchema = z.enum(["closed", "half_open", "open"]);

export type CircuitState = z.infer<typeof CircuitStateSchema>;

export const ChaosKindSchema = z.enum([
  "none",
  "zone_outage",
  "latency_spike",
  "packet_loss",
  "cpu_hog",
  "traffic_surge",
  "dependency_down",
  "dns_failure",
]);

export type ChaosKind = z.infer<typeof ChaosKindSchema>;

export const ChaosStateSchema = z.object({
  active: z.boolean().default(false),
  kind: ChaosKindSchema.default("none"),
  /** 0-1 fraction of capacity removed while chaos is active. */
  capacityPenalty: z.number().min(0).max(0.99).default(0),
  /** Extra latency injected in ms. */
  latencyPenaltyMs: z.number().min(0).default(0),
  targetNodeIds: z.array(z.string()).default([]),
  targetRegion: z.string().nullable().default(null),
  startedAtTick: z.number().int().min(0).default(0),
});

export type ChaosState = z.infer<typeof ChaosStateSchema>;

export const GraphNodeSchema = z.object({
  id: z.string().min(1),
  resourceId: z.string().min(1),
  position: z.object({ x: z.number(), y: z.number() }),
  clientRps: z.number().min(0).default(0),
  replicationFactor: z.number().int().min(1).default(1),
  baseThroughputRps: z.number().min(1).default(1000),
  maxConcurrency: z.number().int().min(1).default(500),
  cacheHitRate: z.number().min(0).max(1).default(0),
  rateLimitRps: z.number().min(1).default(10000),
  writeRatio: z.number().min(0).max(1).default(0.2),
  vramGbPerReplica: z.number().min(0).default(0),
  avgPromptTokens: z.number().int().min(1).default(1024),
  avgOutputTokens: z.number().int().min(1).default(256),
  baseP50Ms: z.number().min(0).default(5),
  baseP95Ms: z.number().min(0).default(15),
  baseP99Ms: z.number().min(0).default(40),
  region: z.string().default("us-east-1"),
  loadBalancer: LoadBalancerAlgorithmSchema.default("round_robin"),
});

export type GraphNode = z.infer<typeof GraphNodeSchema>;

export const GraphEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  /** Fraction of source output routed down this edge (LB weights sum ~1). */
  weight: z.number().min(0).max(1).default(1),
  circuit: CircuitStateSchema.default("closed"),
  consecutiveErrorTicks: z.number().int().min(0).default(0),
});

export type GraphEdge = z.infer<typeof GraphEdgeSchema>;

export const GraphTopologySchema = z.object({
  nodes: z.array(GraphNodeSchema),
  edges: z.array(GraphEdgeSchema),
});

export type GraphTopology = z.infer<typeof GraphTopologySchema>;

export const NodeTelemetrySchema = z.object({
  nodeId: z.string(),
  arrivalRps: z.number().min(0),
  outputRps: z.number().min(0),
  capacityRps: z.number().min(0),
  utilization: z.number().min(0),
  p50Ms: z.number().min(0),
  p95Ms: z.number().min(0),
  p99Ms: z.number().min(0),
  queueDepth: z.number().min(0),
  errorRate: z.number().min(0).max(1),
  cpuPct: z.number().min(0).max(100),
  cacheHitPct: z.number().min(0).max(100),
  ttftMs: z.number().min(0).default(0),
  kvCachePct: z.number().min(0).max(100).default(0),
  droppedRps: z.number().min(0).default(0),
});

export type NodeTelemetry = z.infer<typeof NodeTelemetrySchema>;

export const EdgeFlowSchema = z.object({
  edgeId: z.string(),
  rps: z.number().min(0),
  latencyMs: z.number().min(0),
  errorRate: z.number().min(0).max(1),
});

export type EdgeFlow = z.infer<typeof EdgeFlowSchema>;

export const SimTickSnapshotSchema = z.object({
  tick: z.number().int().min(0),
  timestampMs: z.number().min(0),
  nodes: z.record(z.string(), NodeTelemetrySchema),
  edges: z.record(z.string(), EdgeFlowSchema),
  globalRps: z.number().min(0),
  globalP99Ms: z.number().min(0),
  globalErrorRate: z.number().min(0).max(1),
  totalCostPerHourUsd: z.number().min(0),
});

export type SimTickSnapshot = z.infer<typeof SimTickSnapshotSchema>;

/** OpenTelemetry-compatible span emitted by traceGenerator.ts. */
export const TraceSpanSchema = z.object({
  traceId: z.string().min(1),
  spanId: z.string().min(1),
  parentSpanId: z.string().nullable().default(null),
  nodeId: z.string().min(1),
  serviceName: z.string().min(1),
  operationName: z.string().min(1),
  startTimeMs: z.number().min(0),
  durationMs: z.number().min(0),
  status: z.enum(["ok", "error", "unset"]).default("unset"),
  httpStatus: z.number().int().min(100).max(599).default(200),
  attributes: z.record(z.string(), z.string()).default({}),
});

export type TraceSpan = z.infer<typeof TraceSpanSchema>;

export const TraceWaterfallSchema = z.object({
  traceId: z.string().min(1),
  rootService: z.string().min(1),
  totalDurationMs: z.number().min(0),
  spans: z.array(TraceSpanSchema),
  sampledAtTick: z.number().int().min(0),
});

export type TraceWaterfall = z.infer<typeof TraceWaterfallSchema>;

export function emptySnapshot(tick: number, timestampMs: number): SimTickSnapshot {
  return {
    tick,
    timestampMs,
    nodes: {},
    edges: {},
    globalRps: 0,
    globalP99Ms: 0,
    globalErrorRate: 0,
    totalCostPerHourUsd: 0,
  };
}
