import type { TopicParam } from "@/data/topics";

/**
 * Guided experiments for every interactive topic, plus the four caching
 * scenarios (A–D) that carry the predict-first gate by default.
 *
 * Each entry pins a param preset the deterministic kernel can grade against:
 * the user predicts the outcome bucket, the kernel reveals the truth, and the
 * prediction store remembers the accuracy. Param values must sit within the
 * topic's declared slider ranges so the controls stay honest.
 */

export interface TopicExperiment {
  id: string;
  title: string;
  /** The setup story — what differs from re-implemeted defaults and why it matters. */
  situation: string;
  /** What to check after the reveal; shown as the "watch for" line. */
  watchFor: string;
  params: Record<string, number | string>;
}

/** The four canonical caching scenarios. `flush` params feed the TTL kernel. */
export const CACHE_SCENARIOS: TopicExperiment[] = [
  {
    id: "c1-ceiling",
    title: "A — The textbook ceiling",
    situation:
      "Uniform traffic, and the cache is as big as the key space. After warm-up, every key is cached: whatever a miss looked like, the load is absorbed.",
    watchFor: "Near-total absorption — and that the cold-start dip is the only real cost.",
    params: { cacheSize: 64, keySpace: 65, skew: 0, requests: 1600, ttlFlushEvery: 0 },
  },
  {
    id: "c2-starved",
    title: "B — Memory-starved on uniform traffic",
    situation:
      "Same uniform traffic, but the cache holds a sliver of the key space. With no skew, a uniform hit is math: your share ≈ your size.",
    watchFor: "Hit ratio ≈ cache share of the key space — caching buys proportion, not miracles.",
    params: { cacheSize: 6, keySpace: 120, skew: 0, requests: 1600, ttlFlushEvery: 0 },
  },
  {
    id: "c3-zipf",
    title: "C — Skew saves the cache",
    situation:
      "Strong Zipf: most traffic lands on the small hot slice. Size the cache to just cover that slice and the hit ratio jumps despite a tiny footprint.",
    watchFor: "The cache absorbs the hot slice almost entirely — skew is doing the work, not the size.",
    params: { cacheSize: 40, keySpace: 200, skew: 0.85, requests: 1600, ttlFlushEvery: 0 },
  },
  {
    id: "c4-flush",
    title: "D — Periodic full invalidation",
    situation:
      "Same as C, but something flushes the entire cache every other wave (deploy, TTL batch, config reload). Watch the sawtooth the herd paints.",
    watchFor: "Hit ratio collapses at each flush and re-climbs: periodic expiry breeds periodic herds.",
    params: { cacheSize: 40, keySpace: 200, skew: 0.85, requests: 1600, ttlFlushEvery: 200 },
  },
];

export const TOPIC_EXPERIMENTS: Record<string, TopicExperiment[]> = {
  "caching-strategies": CACHE_SCENARIOS,
  "cache-invalidation": CACHE_SCENARIOS,

  "consistent-hashing": [
    {
      id: "modulo-pain",
      title: "Modulo distribution reality check",
      situation: "One token per server and no mixing: watch where keys actually land.",
      watchFor: "Single-vnode sharing leaves gaps — the equal-share promise is a small-n lie.",
      params: { nodes: 4, replicas: 1, keys: 96 },
    },
    {
      id: "vnode-cushion",
      title: "The virtual-node cushion",
      situation: "Same four servers, same keys — but nodes scatter tokens across the ring.",
      watchFor: "Imbalance tightens by an order of magnitude at realistic vnode counts.",
      params: { nodes: 4, replicas: 6, keys: 96 },
    },
  ],

  "load-balancing": [
    {
      id: "rnd-both-hosts",
      title: "Random is not even",
      situation: "Random routing over one dispatch window: the draw does not guarantee equal shares.",
      watchFor: "One server busy at ~2x average while another idles — variance is visible.",
      params: { servers: 8, rps: 300, algorithm: "random" },
    },
    {
      id: "rr-precision",
      title: "Round-robin precision",
      situation: "Identical backends and perfectly ordered dispatch.",
      watchFor: "Near-zero spread — this is the case round-robin was built for.",
      params: { servers: 8, rps: 300, algorithm: "round-robin" },
    },
  ],

  "api-gateway": [
    {
      id: "gw-rr",
      title: "Gateway dispatch, round-robin",
      situation: "Uniform services, round-robin utilization.",
      watchFor: "Per-service spread at gateway scale with uniform backends.",
      params: { servers: 6, rps: 260, algorithm: "round-robin" },
    },
    {
      id: "gw-lc",
      title: "Gateway dispatch, least-connections",
      situation: "Higher rps with least-connections smoothing in-flight differences.",
      watchFor: "Same capacity, tighter spread — least-connections buys stability in-flight.",
      params: { servers: 6, rps: 260, algorithm: "least-conn" },
    },
  ],

  "read-replicas": [
    {
      id: "rr-wide",
      title: "Read path spread, round-robin",
      situation: "Uniform replicas taking a fan-out of reads in walk order.",
      watchFor: "Reads distribute evenly across replicas in turn.",
      params: { servers: 4, rps: 400, algorithm: "round-robin" },
    },
    {
      id: "lc-wide",
      title: "Read path spread, least-connections",
      situation: "Same load with per-replica connection tracking.",
      watchFor: "Tighter spread at the price of extra bookkeeping.",
      params: { servers: 4, rps: 400, algorithm: "least-conn" },
    },
  ],

  "rate-limiting": [
    {
      id: "sustained-over",
      title: "Sustained overload",
      situation: "Arrivals run double the refill rate for a full window: the bucket holds the burst then sheds the rest.",
      watchFor: "Shed share corresponds to the sustained mismatch, not the initial burst.",
      params: { rate: 25, burst: 60, requestRps: 120, seconds: 16 },
    },
    {
      id: "under-limit",
      title: "Comfortable headroom",
      situation: "Traffic below the refill ceiling — the bucket never drains.",
      watchFor: "Near-zero sheds: the limiter exists for the storm, not the calm.",
      params: { rate: 60, burst: 60, requestRps: 40, seconds: 16 },
    },
  ],

  "message-queues": [
    {
      id: "queue-backlog",
      title: "Producer dominance",
      situation: "Producers out-run consumers: the buffer is a delay, not capacity.",
      watchFor: "How quickly the buffer saturates when the arrival rate exceeds the service rate.",
      params: { rate: 25, burst: 80, requestRps: 70, seconds: 16 },
    },
    {
      id: "queue-drain",
      title: "Consumer-dominant buffer",
      situation: "Consumer rate slightly above the producer rate: the buffer stays shallow.",
      watchFor: "The stable regime: every message is taken promptly and nothing queues.",
      params: { rate: 60, burst: 60, requestRps: 45, seconds: 12 },
    },
  ],

  "circuit-breakers": [
    {
      id: "cb-trip",
      title: "Trip and cooldown",
      situation: "Call rate at the trip threshold: the breaker opens and holds until the cooldown ends.",
      watchFor: "The breaker converts a slow death into a fast refusal that recovers.",
      params: { rate: 30, burst: 60, requestRps: 80, seconds: 12 },
    },
  ],

  "database-sharding": [
    {
      id: "hash-clean",
      title: "Hash partitioning, uniform keys",
      situation: "Clean hash spread with no hot-key pressure.",
      watchFor: "Balanced shards: each partition receives its arithmetic share.",
      params: { shards: 6, keys: 360, strategy: "hash", skew: 0 },
    },
    {
      id: "hash-skew",
      title: "Hot keys bypass the partition function",
      situation: "Heavy skew: popular keys dominate — the partitioner cannot split a hot key.",
      watchFor: "One shard eats the heat: that is hot-key routing, not partition math failing.",
      params: { shards: 6, keys: 360, strategy: "hash", skew: 0.7 },
    },
  ],

  "partition-keys": [
    {
      id: "range-lean",
      title: "Range strategy with skewed traffic",
      situation: "Range partitioning over traffic concentrated at the top of the key domain.",
      watchFor: "Boundary loads: one partition receives the popular prefix.",
      params: { shards: 8, keys: 400, strategy: "range", skew: 0.55 },
    },
    {
      id: "hash-lean",
      title: "Same traffic, hash strategy",
      situation: "Identical traffic pattern, hashed instead of ranged.",
      watchFor: "The spread — and what hash strategy cannot fix (single hot keys).",
      params: { shards: 8, keys: 400, strategy: "hash", skew: 0.55 },
    },
  ],

  "cdn-and-edge": [
    {
      id: "edge-floor",
      title: "Edge floor savings",
      situation: "Given hit ratio and latencies, compute the blended latency before running.",
      watchFor: "0.9 × 18ms + 0.1 × 90ms ≈ 25ms — the arithmetic is the prediction.",
      params: { edges: 4, hitRatio: 90, originLatency: 90, edgeLatency: 18 },
    },
    {
      id: "origin-drag",
      title: "Cold origin drag",
      situation: "Low hit ratio with a fat origin latency: watch the blended number sag.",
      watchFor: "Offload share, not cache speed, drives the blended figure.",
      params: { edges: 2, hitRatio: 30, originLatency: 200, edgeLatency: 15 },
    },
  ],
};

/** Clamp experiment overrides to the topic's declared param ranges. */
export function clampExperimentParams(
  topic: { params: TopicParam[] },
  overrides: Record<string, number | string>,
): Record<string, number | string> {
  const out: Record<string, number | string> = {};
  for (const param of topic.params) {
    const raw = overrides[param.id];
    if (raw === undefined) continue;
    if (param.kind === "choice") {
      out[param.id] = param.choices?.some((c) => c.value === raw) ? raw : (param.default as string);
    } else {
      const min = param.min ?? 0;
      const max = param.max ?? Number(raw);
      out[param.id] = Math.min(max, Math.max(min, Number(raw)));
    }
  }
  return out;
}
