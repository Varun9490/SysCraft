'use client';

/**
 * Pure, deterministic simulation kernels for the interactive topic pages.
 * No DOM, no timers — every function maps params -> state so the UI can
 * recompute on every slider tick and result in identical output for identical
 * input (seeded PRNG).
 */

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash01(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

export const NODE_COLORS = [
  "#CDA86A",
  "#93B27C",
  "#76A0B0",
  "#CE7E78",
  "#B08A52",
  "#AFC79B",
  "#6E96A8",
  "#BE5F58",
];

export function nodeColor(index: number): string {
  return NODE_COLORS[index % NODE_COLORS.length];
}

/* ------------------------------------------------------------------ */
/* Consistent hashing                                                  */
/* ------------------------------------------------------------------ */

export interface HashRing {
  vnodes: { angle: number; node: number }[];
  keys: { angle: number; node: number }[];
  counts: number[];
  avg: number;
  max: number;
  imbalance: number;
}

export function simulateConsistentHashing(nodes: number, keys: number, replicas: number): HashRing {
  const vnodes: { angle: number; node: number }[] = [];
  for (let n = 0; n < nodes; n++) {
    for (let r = 0; r < replicas; r++) {
      vnodes.push({ angle: hash01(`node-${n}-vnode-${r}`), node: n });
    }
  }
  vnodes.sort((a, b) => a.angle - b.angle);
  vnodes.push({ ...vnodes[0], angle: vnodes[0].angle + 1 });

  const keyPoints: { angle: number; node: number }[] = [];
  const counts = new Array(nodes).fill(0);

  for (let k = 0; k < keys; k++) {
    const angle = hash01(`key-${k}`);
    let chosen = vnodes[0].node;
    for (let i = 0; i < vnodes.length; i++) {
      if (vnodes[i].angle >= angle) {
        chosen = vnodes[i].node;
        break;
      }
    }
    counts[chosen]++;
    keyPoints.push({ angle, node: chosen });
  }

  const avg = keys / Math.max(1, nodes);
  const max = Math.max(...counts);
  return {
    vnodes: vnodes.slice(0, vnodes.length - 1),
    keys: keyPoints,
    counts,
    avg,
    max,
    imbalance: avg > 0 ? (max / avg - 1) * 100 : 0,
  };
}

/* ------------------------------------------------------------------ */
/* Load balancing                                                      */
/* ------------------------------------------------------------------ */

export type LBAlgorithm = "round-robin" | "least-conn" | "random";

export interface LBResult {
  served: number[];
  conns: number[];
  avg: number;
  max: number;
  skew: number;
}

export function simulateLoadBalancing(servers: number, rps: number, algorithm: LBAlgorithm): LBResult {
  const rand = mulberry32(7);
  const conns = new Array(servers).fill(0);
  const served = new Array(servers).fill(0);
  const ticks = 60;
  const dt = 1 / 20;
  let rr = 0;

  for (let t = 0; t < ticks; t++) {
    for (let s = 0; s < servers; s++) {
      conns[s] = Math.max(0, conns[s] - Math.max(1, Math.round(conns[s] * 0.4)));
    }
    const arrivals = Math.round(rps * dt);
    for (let i = 0; i < arrivals; i++) {
      let idx: number;
      if (algorithm === "round-robin") {
        idx = rr % servers;
        rr++;
      } else if (algorithm === "random") {
        idx = Math.floor(rand() * servers);
      } else {
        idx = conns.indexOf(Math.min(...conns));
      }
      conns[idx]++;
      served[idx]++;
    }
  }

  const avg = served.reduce((a, b) => a + b, 0) / Math.max(1, servers);
  const max = Math.max(...served);
  return { served, conns, avg, max, skew: avg > 0 ? (max / avg - 1) * 100 : 0 };
}

/* ------------------------------------------------------------------ */
/* Cache (LRU)                                                         */
/* ------------------------------------------------------------------ */

export interface CacheResult {
  hits: number;
  misses: number;
  evictions: number;
  hitRatio: number;
  series: number[];
}

export function simulateCache(cacheSize: number, keySpace: number, skew: number, requests: number): CacheResult {
  return simulateCacheLab(cacheSize, keySpace, skew, requests, 0);
}

/**
 * Extended LRU kernel with an optional full-flush period (ttl > 0): every
 * ttl-th request invalidates the entire cache, producing the honest sawtooth
 * of periodic expiry — hit ratio climbs, collapses, climbs again. Same seeded
 * PRNG chain as the plain kernel, so predictions grade deterministically.
 */
export function simulateCacheLab(
  cacheSize: number,
  keySpace: number,
  skew: number,
  requests: number,
  ttl: number,
): CacheResult {
  const rand = mulberry32(11);
  const pick = () => {
    if (rand() < skew) return Math.floor(Math.pow(rand(), 2) * Math.max(1, keySpace * 0.15));
    return Math.floor(rand() * keySpace);
  };

  const cache = new Set<number>();
  const order: number[] = [];
  let hits = 0;
  let misses = 0;
  let evictions = 0;
  const series: number[] = [];
  const bucket = Math.max(1, Math.floor(requests / 24));
  let bucketHits = 0;
  let bucketCount = 0;

  for (let i = 0; i < requests; i++) {
    if (ttl > 0 && i > 0 && i % ttl === 0) {
      cache.clear();
      order.length = 0;
    }
    const k = pick();
    bucketCount++;
    if (cache.has(k)) {
      hits++;
      bucketHits++;
      const idx = order.indexOf(k);
      if (idx >= 0) order.splice(idx, 1);
      order.push(k);
    } else {
      misses++;
      if (cache.size >= cacheSize) {
        const evicted = order.shift();
        if (evicted !== undefined) cache.delete(evicted);
        evictions++;
      }
      cache.add(k);
      order.push(k);
    }
    if (bucketCount >= bucket) {
      series.push(bucketHits / bucketCount);
      bucketHits = 0;
      bucketCount = 0;
    }
  }

  return { hits, misses, evictions, hitRatio: hits / Math.max(1, hits + misses), series };
}

/* ------------------------------------------------------------------ */
/* Rate limiting (token bucket)                                        */
/* ------------------------------------------------------------------ */

export interface RateResult {
  allowed: number;
  rejected: number;
  rejectRate: number;
  series: { t: number; tokens: number }[];
}

export function simulateRateLimit(rate: number, burst: number, requestRps: number, seconds: number): RateResult {
  const ticks = Math.round(seconds * 20);
  const dt = 1 / 20;
  let tokens = burst;
  let allowed = 0;
  let rejected = 0;
  const series: { t: number; tokens: number }[] = [];
  const rand = mulberry32(5);

  for (let t = 0; t < ticks; t++) {
    tokens = Math.min(burst, tokens + rate * dt);
    const arrivals = Math.round(requestRps * dt);
    for (let i = 0; i < arrivals; i++) {
      if (rand() >= 0) {
        if (tokens >= 1) {
          tokens -= 1;
          allowed++;
        } else {
          rejected++;
        }
      }
    }
    series.push({ t: t * dt, tokens });
  }

  const total = allowed + rejected;
  return { allowed, rejected, rejectRate: total > 0 ? rejected / total : 0, series };
}

/* ------------------------------------------------------------------ */
/* Sharding                                                            */
/* ------------------------------------------------------------------ */

export interface ShardResult {
  counts: number[];
  avg: number;
  max: number;
  min: number;
  hotIndex: number;
  imbalance: number;
}

export function simulateSharding(
  shards: number,
  keys: number,
  strategy: "hash" | "range",
  skew: number,
): ShardResult {
  const rand = mulberry32(13);
  const counts = new Array(shards).fill(0);

  for (let k = 0; k < keys; k++) {
    const hot = rand() < skew;
    let idx: number;
    if (strategy === "hash") {
      idx = Math.floor(hash01(`key-${k}${hot ? "-hot" : ""}`) * shards);
    } else {
      const v = hot ? 0.85 + rand() * 0.15 : rand();
      idx = Math.min(shards - 1, Math.floor(v * shards));
    }
    counts[idx]++;
  }

  const avg = keys / Math.max(1, shards);
  const max = Math.max(...counts);
  const min = Math.min(...counts);
  return { counts, avg, max, min, hotIndex: counts.indexOf(max), imbalance: avg > 0 ? (max / avg - 1) * 100 : 0 };
}

/* ------------------------------------------------------------------ */
/* CDN / edge                                                          */
/* ------------------------------------------------------------------ */

export interface CdnResult {
  effective: number;
  offload: number;
  edge: number;
  origin: number;
}

export function simulateCdn(edges: number, hitRatio: number, originLatency: number, edgeLatency: number): CdnResult {
  const h = Math.min(1, Math.max(0, hitRatio));
  const edgeHits = h;
  return {
    effective: edgeHits * edgeLatency + (1 - edgeHits) * originLatency,
    offload: edgeHits * 100,
    edge: edgeLatency,
    origin: originLatency,
  };
}
