import type { StorageEngine } from "@/types/resource";

/**
 * Clamped M/M/c/K + Kingman queuing physics, LLM token-stream math,
 * Little's Law helpers, and availability composition.
 *
 * Every export is a pure, total function: inputs are sanitized so NaN,
 * Infinity, or negative latencies can never escape, exactly per
 * ARCHITECTURE.md §2. Safe to call at 20Hz inside the Web Worker and
 * directly from Vitest in Node.js.
 */

export const MAX_EFFECTIVE_RHO = 0.995;
export const TICK_INTERVAL_S = 0.05;
export const KV_SATURATE_PENALTY = 3.5;

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function sanitizeNonNegative(value: number, fallback = 0): number {
  if (!Number.isFinite(value) || value < 0) return fallback;
  return value;
}

/** Active replicas c_i = max(1, replicationFactor). */
export function activeReplicas(replicationFactor: number): number {
  if (!Number.isFinite(replicationFactor)) return 1;
  return Math.max(1, Math.floor(replicationFactor));
}

/** Per-replica base throughput mu_i = max(1, baseThroughputRps). */
export function perReplicaThroughput(baseThroughputRps: number): number {
  if (!Number.isFinite(baseThroughputRps)) return 1;
  return Math.max(1, baseThroughputRps);
}

/**
 * Effective total capacity C_i = c * mu * (1 - chaosCapacityPenalty).
 * Penalty is clamped to [0, 0.99] so capacity never collapses to zero/negative.
 */
export function effectiveCapacity(
  replicationFactor: number,
  baseThroughputRps: number,
  chaosCapacityPenalty = 0,
): number {
  const c = activeReplicas(replicationFactor);
  const mu = perReplicaThroughput(baseThroughputRps);
  const penalty = clamp(chaosCapacityPenalty, 0, 0.99);
  const capacity = c * mu * (1 - penalty);
  return Math.max(1, capacity);
}

/** Utilization rho_i = lambda / C. Always finite and >= 0. */
export function utilization(arrivalRps: number, capacityRps: number): number {
  const lambda = sanitizeNonNegative(arrivalRps);
  const capacity = capacityRps > 0 && Number.isFinite(capacityRps) ? capacityRps : 1;
  return lambda / capacity;
}

/** Effective (clamped) utilization hat-rho = min(rho, 0.995). */
export function clampedUtilization(rho: number): number {
  if (!Number.isFinite(rho) || rho < 0) return 0;
  return Math.min(rho, MAX_EFFECTIVE_RHO);
}

/**
 * Queueing delay multiplier M(hat-rho) = 1 + hat-rho^2 / (2 * (1 - hat-rho)).
 * Denominator is bounded away from zero by the 0.995 clamp.
 */
export function queueMultiplier(rho: number): number {
  const hatRho = clampedUtilization(rho);
  const denom = 2 * (1 - hatRho);
  if (denom <= 0) return 1;
  return 1 + (hatRho * hatRho) / denom;
}

/** Compaction spike for LSM trees: deterministic 0-0.25 sawtooth over time. */
export function compactionSpike(elapsedSeconds: number): number {
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) return 0;
  const phase = (elapsedSeconds % 60) / 60;
  return phase < 0.1 ? (0.1 - phase) * 2.5 : 0;
}

export function writeAmplification(
  engine: StorageEngine,
  writeRatio: number,
  elapsedSeconds = 0,
): number {
  const rw = clamp(writeRatio, 0, 1);
  switch (engine) {
    case "b_tree":
      return 1.0 + 1.5 * rw;
    case "lsm_tree":
      return 1.0 + 0.3 * rw + compactionSpike(elapsedSeconds);
    case "in_memory":
    case "none":
      return 1.0;
    case "append_log":
      return 1.0 + 0.15 * rw;
    case "columnar":
      return 1.0 + 0.5 * rw;
    default:
      return 1.0;
  }
}

export interface NodeLatencyInput {
  baseP50Ms: number;
  baseP95Ms: number;
  baseP99Ms: number;
  arrivalRps: number;
  capacityRps: number;
  storageEngine?: StorageEngine;
  writeRatio?: number;
  elapsedSeconds?: number;
  queueDepth?: number;
}

export interface NodeLatencyResult {
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  queueWaitMs: number;
  utilization: number;
  multiplier: number;
}

/**
 * L_p50 = baseP50 * W_amp * M(hat-rho)
 * L_p95 = baseP95 * W_amp * M(hat-rho)^1.15
 * L_p99 = baseP99 * W_amp * M(hat-rho)^1.30 + queueWaitMs
 */
export function nodeLatency(input: NodeLatencyInput): NodeLatencyResult {
  const baseP50 = sanitizeNonNegative(input.baseP50Ms);
  const baseP95 = sanitizeNonNegative(input.baseP95Ms);
  const baseP99 = sanitizeNonNegative(input.baseP99Ms);
  const capacity = input.capacityRps > 0 && Number.isFinite(input.capacityRps)
    ? input.capacityRps
    : 1;
  const lambda = sanitizeNonNegative(input.arrivalRps);
  const queueDepth = sanitizeNonNegative(input.queueDepth ?? 0);
  const rho = utilization(lambda, capacity);
  const m = queueMultiplier(rho);
  const wAmp = writeAmplification(
    input.storageEngine ?? "none",
    input.writeRatio ?? 0,
    input.elapsedSeconds ?? 0,
  );
  const queueWaitMs = (queueDepth / capacity) * 1000;
  const p50 = baseP50 * wAmp * m;
  const p95 = baseP95 * wAmp * Math.pow(m, 1.15);
  const p99 = baseP99 * wAmp * Math.pow(m, 1.3) + queueWaitMs;
  return {
    p50Ms: sanitizeNonNegative(p50),
    p95Ms: sanitizeNonNegative(p95),
    p99Ms: sanitizeNonNegative(p99),
    queueWaitMs: sanitizeNonNegative(queueWaitMs),
    utilization: rho,
    multiplier: m,
  };
}

export interface QueueState {
  queueDepth: number;
  dropped: boolean;
}

/**
 * Bounded queue buffer K = maxConcurrency * c, tick dt = 0.05s.
 * Overload: Q(t) = min(K, Q(t-dt) + (lambda - C) * dt).
 * Drain:    Q(t) = max(0, Q(t-dt) - (C - lambda) * dt).
 */
export function updateQueue(
  prevDepth: number,
  arrivalRps: number,
  capacityRps: number,
  maxConcurrency: number,
  replicationFactor: number,
  dtSeconds = TICK_INTERVAL_S,
): QueueState {
  const prev = sanitizeNonNegative(prevDepth);
  const lambda = sanitizeNonNegative(arrivalRps);
  const capacity = Math.max(1, sanitizeNonNegative(capacityRps, 1));
  const perReplica = Number.isFinite(maxConcurrency) && maxConcurrency > 0 ? maxConcurrency : 1;
  const k = perReplica * activeReplicas(replicationFactor);
  const dt = dtSeconds > 0 && Number.isFinite(dtSeconds) ? dtSeconds : TICK_INTERVAL_S;
  if (lambda > capacity) {
    const next = Math.min(k, prev + (lambda - capacity) * dt);
    return { queueDepth: next, dropped: next >= k };
  }
  return { queueDepth: Math.max(0, prev - (capacity - lambda) * dt), dropped: false };
}

/** Error rate E = clamp(max(0, lambda - C) / max(1, lambda), 0, 1). */
export function errorRate(arrivalRps: number, capacityRps: number): number {
  const lambda = sanitizeNonNegative(arrivalRps);
  const capacity = sanitizeNonNegative(capacityRps, 1);
  if (lambda <= 0) return 0;
  return clamp(Math.max(0, lambda - capacity) / Math.max(1, lambda), 0, 1);
}

/** CPU% ≈ clamp(rho, 0, 1) * 100 with queue-pressure headroom. */
export function cpuPercent(util: number, queueDepth: number, capacityRps: number): number {
  const rho = sanitizeNonNegative(util);
  const q = sanitizeNonNegative(queueDepth);
  const cap = capacityRps > 0 && Number.isFinite(capacityRps) ? capacityRps : 1;
  return clamp(rho * 100 + (q / (cap + q)) * 10, 0, 100);
}

export interface LlmPhysicsInput {
  baseP50Ms: number;
  arrivalRps: number;
  capacityRps: number;
  avgPromptTokens?: number;
  avgOutputTokens?: number;
  vramGbPerReplica?: number;
  replicationFactor?: number;
  activeConcurrentRequests?: number;
}

export interface LlmPhysicsResult {
  ttftMs: number;
  kvCachePct: number;
  preempted: boolean;
  latencyPenalty: number;
}

/**
 * TTFT_ms = baseP50 * M(hat-rho) + 0.04 * avgPromptTokens.
 * KV-cache % = active * (prompt + output) * 0.0005 / (vramPerReplica * c) * 100.
 * Above 95% saturation the queuing penalty spikes 3.5x.
 */
export function llmPhysics(input: LlmPhysicsInput): LlmPhysicsResult {
  const prompt = Math.max(1, Math.floor(input.avgPromptTokens ?? 1024));
  const output = Math.max(1, Math.floor(input.avgOutputTokens ?? 256));
  const baseP50 = sanitizeNonNegative(input.baseP50Ms);
  const rho = utilization(input.arrivalRps, Math.max(1, input.capacityRps));
  const m = queueMultiplier(rho);
  const ttft = baseP50 * m + 0.04 * prompt;
  const vram = sanitizeNonNegative(input.vramGbPerReplica ?? 0);
  const c = activeReplicas(input.replicationFactor ?? 1);
  const active = sanitizeNonNegative(input.activeConcurrentRequests ?? input.arrivalRps * 0.5);
  const denom = vram * c;
  const kvPct = denom > 0 ? clamp((active * (prompt + output) * 0.0005) / denom * 100, 0, 100) : 0;
  const preempted = kvPct > 95;
  return {
    ttftMs: sanitizeNonNegative(ttft),
    kvCachePct: kvPct,
    preempted,
    latencyPenalty: preempted ? KV_SATURATE_PENALTY : 1,
  };
}

/** Little's Law: L = lambda * W (W in seconds). */
export function littlesLawConcurrent(arrivalRps: number, meanLatencyMs: number): number {
  return sanitizeNonNegative(arrivalRps) * (sanitizeNonNegative(meanLatencyMs) / 1000);
}

/** Required replicas c = ceil(lambda * headroom / mu). */
export function requiredReplicas(
  arrivalRps: number,
  perReplicaThroughputRps: number,
  headroomFactor = 1.3,
): number {
  const lambda = sanitizeNonNegative(arrivalRps);
  const mu = Math.max(1, sanitizeNonNegative(perReplicaThroughputRps, 1));
  const headroom = headroomFactor > 0 && Number.isFinite(headroomFactor) ? headroomFactor : 1.3;
  return Math.max(1, Math.ceil((lambda * headroom) / mu));
}

/** Series availability: product of stage availabilities. */
export function seriesAvailability(stages: number[]): number {
  if (stages.length === 0) return 1;
  return stages.reduce((acc, a) => acc * clamp(a, 0, 1), 1);
}

/** Parallel (redundant) availability: 1 - product(1 - a_i). */
export function parallelAvailability(replicas: number[]): number {
  if (replicas.length === 0) return 1;
  return 1 - replicas.reduce((acc, a) => acc * (1 - clamp(a, 0, 1)), 1);
}
