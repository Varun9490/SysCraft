import type { CacheResult, CdnResult, HashRing, LBResult, RateResult, ShardResult } from "./simCore";

/**
 * The predict-first grading kernel: turns a live sim result into a bucketed
 * prediction question. Every interactive topic uses the same mechanism, so
 * /progress accuracy is comparable across surfaces.
 */

export type SimData = HashRing | LBResult | CacheResult | RateResult | ShardResult | CdnResult;

export interface SimBundle {
  kind: TopicSimKind;
  data: SimData;
}

/** Mirrors Topic["kind"] without importing the data module (avoids cycles). */
export type TopicSimKind = "cache" | "rate-limit" | "sharding" | "cdn" | "consistent-hashing" | "load-balancing";

export interface BucketChoice {
  id: string;
  label: string;
}

export interface PredictionSpec {
  /** The thing being estimated, stated as a question. */
  prompt: string;
  hint?: string;
  metricLabel: string;
  choices: BucketChoice[];
  /** Resolve the predicted metric value from the sim result (a 0..1 share). */
  metric: (data: SimData) => number;
  /** Value the UI shows after commitment, formatted. */
  format: (value: number) => string;
  /** Ascending cut-points separating the choices, ascending; length = choices - 1. */
  thresholds: [number, number, number];
}

const FRACTION_BUCKETS: BucketChoice[] = [
  { id: "b1", label: "Under 40%" },
  { id: "b2", label: "40–70%" },
  { id: "b3", label: "70–90%" },
  { id: "b4", label: "90% or higher" },
];

const SHARE_THRESHOLDS: [number, number, number] = [0.4, 0.7, 0.9];

const SKEW_BUCKETS: BucketChoice[] = [
  { id: "b1", label: "Tight — under 20%" },
  { id: "b2", label: "20–45%" },
  { id: "b3", label: "45–80%" },
  { id: "b4", label: "Worse than 80%" },
];

const SKEW_THRESHOLDS: [number, number, number] = [0.2, 0.45, 0.8];

function fmtPct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/** Standardized per-kind specs. */
export const PREDICTION_SPECS: Record<TopicSimKind, PredictionSpec> = {
  cache: {
    prompt: "Before it runs: what share of requests will this cache absorb?",
    hint: "Think about the hot set vs the cache size — the technology is not the argument.",
    metricLabel: "Hit rate",
    choices: FRACTION_BUCKETS,
    thresholds: SHARE_THRESHOLDS,
    metric: (d) => (d as CacheResult).hitRatio,
    format: fmtPct,
  },
  "rate-limit": {
    prompt: "Before it runs: what share of requests gets refused?",
    hint: "The refill rate vs the sustained arrival rate decides the steady state.",
    metricLabel: "Rejected share",
    choices: FRACTION_BUCKETS,
    thresholds: SHARE_THRESHOLDS,
    metric: (d) => (d as RateResult).rejectRate,
    format: fmtPct,
  },
  "consistent-hashing": {
    prompt: "Before it runs: how uneven will the distribution land?",
    hint: "Compare with modulo hashing — then account for what virtual nodes buy.",
    metricLabel: "Imbalance (max vs average)",
    choices: SKEW_BUCKETS,
    thresholds: SKEW_THRESHOLDS,
    metric: (d) => (d as HashRing).imbalance / 100,
    format: fmtPct,
  },
  "load-balancing": {
    prompt: "Before it runs: how skewed will the busiest server be?",
    hint: "Least-connections adapts to server-specific slowness; round-robin assumes uniform machines.",
    metricLabel: "Peak-to-average skew",
    choices: SKEW_BUCKETS,
    thresholds: SKEW_THRESHOLDS,
    metric: (d) => (d as LBResult).skew / 100,
    format: fmtPct,
  },
  sharding: {
    prompt: "Before it runs: what load picture will the shards show?",
    hint: "Hash partitions uniform keys evenly; skew walks past the partition function entirely.",
    metricLabel: "Imbalance (max vs average)",
    choices: [
      { id: "b1", label: "Tight — under 15%" },
      { id: "b2", label: "15–40%" },
      { id: "b3", label: "40–90%" },
      { id: "b4", label: "Worse than 90%" },
    ],
    thresholds: [0.15, 0.4, 0.9],
    metric: (d) => Math.min(1, (d as ShardResult).imbalance / 100),
    format: fmtPct,
  },
  cdn: {
    prompt: "Before it runs: what share of requests never reaches the origin?",
    hint: "The branch arithmetic is the answer: hit share × edge cost plus miss share × origin cost.",
    metricLabel: "Offloaded from origin",
    choices: [
      { id: "b1", label: "Under 45%" },
      { id: "b2", label: "45–70%" },
      { id: "b3", label: "70–90%" },
      { id: "b4", label: "90% or higher" },
    ],
    thresholds: [0.45, 0.7, 0.9],
    metric: (d) => (d as CdnResult).offload / 100,
    format: fmtPct,
  },
};

/** Bucket the metric: choice index = which thresholds the value clears (inclusive floor). */
export function resolveCorrectChoice(kind: TopicSimKind, data: SimData): BucketChoice {
  const spec = PREDICTION_SPECS[kind];
  const value = spec.metric(data);
  const [t1, t2, t3] = spec.thresholds;
  const idx = value >= t3 ? 3 : value >= t2 ? 2 : value >= t1 ? 1 : 0;
  return spec.choices[Math.min(idx, spec.choices.length - 1)];
}

/** Which choice id a value lands in — used by pure kernel tests. */
export function resolvedChoiceId(kind: TopicSimKind, data: SimData): string {
  return resolveCorrectChoice(kind, data).id;
}
