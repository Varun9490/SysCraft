/**
 * Play layer content: deterministic question banks for the arcade modes.
 *
 * Every item is authored for SysCraft — scenario text, numbers, and
 * explanations are original. Estimation items are scored on a log scale:
 * within a factor of 3× counts as correct, within 10× counts as half credit,
 * exactly the "order of magnitude" discipline the interview rubric rewards.
 */

export type PlayQuestionKind = 'estimate' | 'match' | 'diagnose' | 'bottleneck';

export interface PlayOption {
  id: string;
  text: string;
  correct: boolean;
}

export interface PlayQuestion {
  id: string;
  kind: PlayQuestionKind;
  prompt: string;
  context?: string;
  options?: PlayOption[];
  /** Estimation answer + unit; tolerance factor defaults to 3×. */
  numeric?: { answer: number; unit: string };
  explanation: string;
  conceptId?: string;
}

export interface PlayMode {
  id: string;
  name: string;
  tagline: string;
  trains: string;
  minutes: number;
  kind: PlayQuestionKind | 'link';
  /** For link modes: where the learner should go to play for real. */
  href?: string;
  hrefLabel?: string;
  seedNote: string;
}

export const PLAY_MODES: PlayMode[] = [
  {
    id: 'estimate-sprint',
    name: 'Estimate Sprint',
    tagline: 'Rapid-fire back-of-the-envelope questions: QPS, storage, bandwidth, RAM.',
    trains: 'Mental math & estimation habits',
    minutes: 2,
    kind: 'estimate',
    seedNote: 'Fixed item bank · deterministic order',
  },
  {
    id: 'pattern-match',
    name: 'Pattern Match',
    tagline: 'Match a bottleneck scenario to the architectural pattern that fixes it.',
    trains: 'Pattern discrimination & interleaving',
    minutes: 3,
    kind: 'match',
    seedNote: 'Fixed item bank · deterministic order',
  },
  {
    id: 'debug-outage',
    name: 'Debug the Outage',
    tagline: 'Read the metrics timeline, pick the root cause from four hypotheses.',
    trains: 'Golden Signals & RCA',
    minutes: 5,
    kind: 'diagnose',
    seedNote: 'Fixed item bank · deterministic order',
  },
  {
    id: 'bottleneck-hunt',
    name: 'Bottleneck Hunt',
    tagline: 'Given live numbers, click the component that saturates first.',
    trains: 'Utilization math & queues',
    minutes: 3,
    kind: 'bottleneck',
    seedNote: 'Fixed item bank · deterministic order',
  },
  {
    id: 'daily-puzzle',
    name: 'Daily Puzzle',
    tagline: 'One curated puzzle per day, seeded from the UTC date — same for everyone.',
    trains: 'A calm daily engineering habit',
    minutes: 5,
    kind: 'match',
    seedNote: 'UTC date seed (YYYY-MM-DD) · zero backend',
  },
  {
    id: 'surge-defender',
    name: 'Surge Defender',
    tagline: 'Survive escalating traffic waves; spend limited points between waves.',
    trains: 'Capacity planning & backpressure',
    minutes: 10,
    kind: 'link',
    href: '/labs/url-shortener',
    hrefLabel: 'Open the URL shortener lab and push load',
    seedNote: 'Runs on the live simulator in the lab workspace',
  },
  {
    id: 'chaos-day',
    name: 'Chaos Day',
    tagline: 'Seeded faults arrive mid-run; hold availability above SLO.',
    trains: 'Failure handling & SRE instincts',
    minutes: 10,
    kind: 'link',
    href: '/labs',
    hrefLabel: 'Pick a lab, then fire the Chaos bar',
    seedNote: 'Chaos events are deterministic per scenario id',
  },
  {
    id: 'budget-architect',
    name: 'Budget Architect',
    tagline: 'Meet P99 and availability targets under a hard monthly cost ceiling.',
    trains: 'Cost vs. reliability trade-offs',
    minutes: 10,
    kind: 'link',
    href: '/canvas',
    hrefLabel: 'Build it on the canvas (cost gauges are live)',
    seedNote: 'Cost model is deterministic per resource catalog',
  },
  {
    id: 'design-duel',
    name: 'Design Duel',
    tagline: 'Two learners, one scenario, one seed: higher rubric score wins.',
    trains: 'Trade-off comparison with a peer',
    minutes: 15,
    kind: 'link',
    href: '/labs',
    hrefLabel: 'Both open the same lab, then swap share links',
    seedNote: 'Identical seeds guarantee identical simulator physics',
  },
];

export const PLAY_QUESTIONS: PlayQuestion[] = [
  // ── Estimation ────────────────────────────────────────────────────────────
  {
    id: 'est-qps-1',
    kind: 'estimate',
    prompt: 'An app has 10 million daily active users. Each opens the app 8 times and each session makes 12 API calls. What is the average QPS?',
    numeric: { answer: 11_111, unit: 'req/s' },
    explanation: '10M × 8 × 12 = 960M calls/day ÷ 86,400 s ≈ 11.1k req/s. Design for 2–3× average at peak.',
    conceptId: 'load-balancing',
  },
  {
    id: 'est-qps-2',
    kind: 'estimate',
    prompt: 'A payment ledger processes 50 million transactions per day, evenly spread. What is the average write rate per second?',
    numeric: { answer: 579, unit: 'writes/s' },
    explanation: '50M ÷ 86,400 ≈ 579 writes/s. Peak-hour traffic can be 3–5× the daily average for consumer payments.',
    conceptId: 'sharding-partitioning',
  },
  {
    id: 'est-storage-1',
    kind: 'estimate',
    prompt: 'A metrics pipeline stores 200,000 data points per second, and each point is 24 bytes after compression. How much storage per day (GB)?',
    numeric: { answer: 415, unit: 'GB/day' },
    explanation: '200k × 24 B = 4.8 MB/s → ×86,400 s ≈ 414.7 GB/day. At 90-day retention that is ~37 TB — plan tiering early.',
    conceptId: 'btree-vs-lsm',
  },
  {
    id: 'est-storage-2',
    kind: 'estimate',
    prompt: 'A photo app uploads 5 million photos per day averaging 3.5 MB each. How much new object storage per day (TB)?',
    numeric: { answer: 17.5, unit: 'TB/day' },
    explanation: '5M × 3.5 MB = 17.5 TB/day (before replicas). With 3× replication, budget ~52 TB/day of raw disk.',
    conceptId: 'merkle-trees',
  },
  {
    id: 'est-bandwidth-1',
    kind: 'estimate',
    prompt: 'A video platform streams 400,000 concurrent 1080p viewers at 6 Mbps each. What is the egress bandwidth (Gb/s)?',
    numeric: { answer: 2400, unit: 'Gb/s' },
    explanation: '400k × 6 Mbps = 2,400,000 Mbps = 2,400 Gb/s ≈ 2.4 Tb/s. This is why CDNs and per-title encoding exist.',
    conceptId: 'caching-strategies',
  },
  {
    id: 'est-ram-1',
    kind: 'estimate',
    prompt: 'A cache node must hold 40 million keys averaging a 120-byte key + 280-byte value plus 40% overhead. How much RAM (GB)?',
    numeric: { answer: 22.4, unit: 'GB' },
    explanation: '40M × 400 B = 16 GB payload × 1.4 overhead ≈ 22.4 GB. Leave headroom: pick a 32 GB instance, not 24 GB.',
    conceptId: 'caching-strategies',
  },
  {
    id: 'est-qps-3',
    kind: 'estimate',
    prompt: 'A URL shortener handles 100 million redirects per day with 70% in a 6-hour window. What is the peak-window QPS?',
    numeric: { answer: 3240, unit: 'req/s' },
    explanation: '100M × 0.7 = 70M redirects in 21,600 s ≈ 3,240 req/s. Two cache-backed replicas cover this comfortably.',
    conceptId: 'sharding-partitioning',
  },
  {
    id: 'est-bandwidth-2',
    kind: 'estimate',
    prompt: 'A mobile app syncs 500 MB per user per month for 2 million users. What is the average egress (Mbps)?',
    numeric: { answer: 309, unit: 'Mbps' },
    explanation: '2M × 500 MB = 1 PB/month ÷ 2.6M s ≈ 385 MB/s ≈ 3.1 Gbps ≈ 3,086 Mbps. CDN offload makes this affordable.',
    conceptId: 'caching-strategies',
  },

  // ── Pattern Match ─────────────────────────────────────────────────────────
  {
    id: 'pm-1',
    kind: 'match',
    prompt: 'Your product catalog is read 5,000×/s but written 20×/s, and the primary database is at 90% CPU. Which pattern fits best?',
    options: [
      { id: 'a', text: 'Cache-aside with TTL + read replicas', correct: true },
      { id: 'b', text: 'Shard the catalog by product id', correct: false },
      { id: 'c', text: 'Write-behind queue for reads', correct: false },
      { id: 'd', text: 'Multi-leader replication', correct: false },
    ],
    explanation: 'A 250:1 read/write ratio is the canonical cache-aside + replica situation. Sharding is premature; writes are tiny.',
    conceptId: 'caching-strategies',
  },
  {
    id: 'pm-2',
    kind: 'match',
    prompt: 'An IoT fleet sends 500k readings/s in bursts; the analytics pipeline keeps falling over during spikes. Which pattern fits best?',
    options: [
      { id: 'a', text: 'Log-based queue with consumer groups as a buffer', correct: true },
      { id: 'b', text: 'Synchronous REST writes to a columnar store', correct: false },
      { id: 'c', text: 'Bigger app servers (vertical scaling)', correct: false },
      { id: 'd', text: 'Client-side rate limiting only', correct: false },
    ],
    explanation: 'Spiky ingestion wants a durable log (Kafka-style) that absorbs bursts and lets consumers drain at their own pace.',
    conceptId: 'event-streaming',
  },
  {
    id: 'pm-3',
    kind: 'match',
    prompt: 'A social feed writes for 10k followers per post and must keep reads under 200 ms. Reads outnumber writes 50:1. Which pattern fits best?',
    options: [
      { id: 'a', text: 'Hybrid fan-out: push for normal users, pull for celebrities', correct: true },
      { id: 'b', text: 'Pure fan-out on write for all users', correct: false },
      { id: 'c', text: 'Query every follower timeline at read time', correct: false },
      { id: 'd', text: 'Cache the post body only', correct: false },
    ],
    explanation: 'Pure push explodes for celebrities; pure pull explodes for reads. Hybrid fan-out handles both extremes.',
    conceptId: 'sharding-partitioning',
  },
  {
    id: 'pm-4',
    kind: 'match',
    prompt: 'Two services must update a database row and publish an event, atomically. Today they dual-write and sometimes lose events. Which pattern fits best?',
    options: [
      { id: 'a', text: 'Transactional outbox + CDC relay', correct: true },
      { id: 'b', text: 'Two-phase commit across the broker', correct: false },
      { id: 'c', text: 'Retry the publish in a loop', correct: false },
      { id: 'd', text: 'Fire-and-forget publish first, then write', correct: false },
    ],
    explanation: 'The outbox pattern commits the event with the row in one transaction; a relay publishes it. No lost events, no 2PC.',
    conceptId: 'message-queues',
  },
  {
    id: 'pm-5',
    kind: 'match',
    prompt: 'A ticket site melts down when 100k users race for 500 seats; some seats are double-booked. Which pattern fits best?',
    options: [
      { id: 'a', text: 'Distributed lock (or single-writer partition) + idempotency keys per seat hold', correct: true },
      { id: 'b', text: 'Optimistic reads with no reservation', correct: false },
      { id: 'c', text: 'Cache the seat map harder', correct: false },
      { id: 'd', text: 'Auto-scale the seat service 10×', correct: false },
    ],
    explanation: 'Contention on a single resource needs serialization: per-seat locks with fencing/tokens plus idempotent holds.',
    conceptId: 'raft-consensus',
  },
  {
    id: 'pm-6',
    kind: 'match',
    prompt: 'An internal gRPC service sees one pod at 100% CPU while its siblings idle. Traffic is load-balanced by a plain L4 ClusterIP Service. Which pattern fits best?',
    options: [
      { id: 'a', text: 'Headless Service (or L7 mesh) to balance per-request', correct: true },
      { id: 'b', text: 'Add more replicas behind the same L4 service', correct: false },
      { id: 'c', text: 'Raise the CPU limit on all pods', correct: false },
      { id: 'd', text: 'Switch to UDP', correct: false },
    ],
    explanation: 'HTTP/2 multiplexes streams on one TCP connection; L4 picks a pod per connection, so one pod eats all streams. L7 balances per request.',
    conceptId: 'load-balancing',
  },
  {
    id: 'pm-7',
    kind: 'match',
    prompt: 'A cache flushes every midnight and the database immediately receives 20× its normal read load. What is the fix?',
    options: [
      { id: 'a', text: 'Request coalescing (singleflight) + staggered TTLs + warmup', correct: true },
      { id: 'b', text: 'Increase cache TTL to forever', correct: false },
      { id: 'c', text: 'Disable the cache at night', correct: false },
      { id: 'd', text: 'Move the database to a bigger instance', correct: false },
    ],
    explanation: 'The thundering herd is solved at the application layer: collapse duplicate misses, jitter TTLs, pre-warm hot keys.',
    conceptId: 'caching-strategies',
  },
  {
    id: 'pm-8',
    kind: 'match',
    prompt: 'A service retries failed calls immediately 3 times. During a downstream brownout, traffic to the dependency triples and it dies completely. Fix?',
    options: [
      { id: 'a', text: 'Exponential backoff with jitter + circuit breaker + retry budget', correct: true },
      { id: 'b', text: 'More retries to beat the odds', correct: false },
      { id: 'c', text: 'Longer client timeouts', correct: false },
      { id: 'd', text: 'Retry forever until it succeeds', correct: false },
    ],
    explanation: 'Synchronized retries amplify an outage. Backoff + jitter decorrelates them; a breaker stops them entirely when the dependency is down.',
    conceptId: 'rate-limiting',
  },

  // ── Debug the Outage ──────────────────────────────────────────────────────
  {
    id: 'diag-1',
    kind: 'diagnose',
    prompt: 'What is the root cause?',
    context:
      'T+0: p99 jumps 120 ms → 2,400 ms. Errors sit at 1%. DB CPU 40%, cache hit-rate 91%. App pod 3 shows CPU throttling (CFS) with 100% of its quota used; pods 1–2 are at 55%.',
    options: [
      { id: 'a', text: 'CPU limit on pod 3 is too tight — CFS throttling is queueing its requests', correct: true },
      { id: 'b', text: 'The database is overloaded', correct: false },
      { id: 'c', text: 'Cache stampede after a flush', correct: false },
      { id: 'd', text: 'Network partition between AZs', correct: false },
    ],
    explanation: 'One pod pinned at its CPU quota while siblings are cool is the signature of CFS throttling: raise the limit (or the request) and the p99 recovers.',
    conceptId: 'observability-tracing',
  },
  {
    id: 'diag-2',
    kind: 'diagnose',
    prompt: 'What is the root cause?',
    context:
      'Reads suddenly stale for ~4 s after writes. Write latency normal. Replication lag metric spikes to 4.2 s and shrinks. One AZ had a brief network degradation 90 seconds ago.',
    options: [
      { id: 'a', text: 'Follower replica fell behind during a network blip; reads hit lagged replicas', correct: true },
      { id: 'b', text: 'The primary is dropping writes', correct: false },
      { id: 'c', text: 'The cache TTL expired', correct: false },
      { id: 'd', text: 'Client-side clock skew', correct: false },
    ],
    explanation: 'Transient replication lag after a network blip is expected; route read-your-own-writes to the primary (or a sticky replica) to hide it.',
    conceptId: 'replication',
  },
  {
    id: 'diag-3',
    kind: 'diagnose',
    prompt: 'What is the root cause?',
    context:
      'Queue depth climbs linearly since 09:00. Consumers report healthy, consuming 0 msg/s extra. Lag grows 10k/min. No consumer restarts. One partition is at 4× the message rate of the others.',
    options: [
      { id: 'a', text: 'Hot partition: one key dominates and its single consumer cannot keep up', correct: true },
      { id: 'b', text: 'Broker disk is full', correct: false },
      { id: 'c', text: 'Consumers are being rebalanced constantly', correct: false },
      { id: 'd', text: 'Network is dropping packets', correct: false },
    ],
    explanation: 'Uniform consumer health with one hot partition means the partition key is skewed — re-key or split the hot key.',
    conceptId: 'sharding-partitioning',
  },
  {
    id: 'diag-4',
    kind: 'diagnose',
    prompt: 'What is the root cause?',
    context:
      'After a routine deploy, 1% of requests return 503 for 90 seconds, then everything recovers. No config changed. Rolling update, maxSurge=1, maxUnavailable=1, readiness probe hits /healthz which returns 200 immediately at container start.',
    options: [
      { id: 'a', text: 'Readiness probe passes before the app can serve — new pod takes traffic too early', correct: true },
      { id: 'b', text: 'The load balancer cache is stale', correct: false },
      { id: 'c', text: 'Database failover occurred', correct: false },
      { id: 'd', text: 'The deploy changed the API contract', correct: false },
    ],
    explanation: 'A readiness probe that returns 200 immediately gates nothing. Probe real dependencies (DB ping, warm routes) so traffic only lands on ready pods.',
    conceptId: 'microservices-monolith',
  },

  // ── Bottleneck Hunt ───────────────────────────────────────────────────────
  {
    id: 'bh-1',
    kind: 'bottleneck',
    prompt: 'Which component saturates first at 20,000 req/s?',
    context:
      'Load balancer: cap 200k req/s. Three API servers: 10k req/s each. Postgres: effective capacity 40k r/s with read/write weighting. Cache (Redis): cap 200k ops/s with 90% hit rate in front of Postgres.',
    options: [
      { id: 'a', text: 'The three API servers (20k of 30k combined capacity, ~67%)', correct: true },
      { id: 'b', text: 'The load balancer', correct: false },
      { id: 'c', text: 'Postgres', correct: false },
      { id: 'd', text: 'Redis', correct: false },
    ],
    explanation: '20k spread over 3 servers = 6.7k each of a 10k budget (67%) — highest utilization on the path. Remove one server and the rest hit 100%.',
    conceptId: 'load-balancing',
  },
  {
    id: 'bh-2',
    kind: 'bottleneck',
    prompt: 'Which component saturates first?',
    context:
      'Ingress: 100k req/s cap. 6 pods × 5k req/s = 30k combined. Kafka topic: 12 partitions × 10k msg/s. One consumer group with 12 members, each at 40% CPU. DB write path: 8k w/s with a 10k cap; writes arrive at 9k/s.',
    options: [
      { id: 'a', text: 'The database write path (9k of 10k = 90%)', correct: true },
      { id: 'b', text: 'Ingress', correct: false },
      { id: 'c', text: 'Kafka', correct: false },
      { id: 'd', text: 'The consumer group', correct: false },
    ],
    explanation: '90% write utilization leads everything else. Add batching/queue buffering before the store, or shard the write path.',
    conceptId: 'btree-vs-lsm',
  },
  {
    id: 'bh-3',
    kind: 'bottleneck',
    prompt: 'Which component saturates first?',
    context:
      'CDN absorbs 85% of traffic. Origin API: 4 instances × 8k req/s. Origin receives 45k req/s after CDN (85% of 300k total hits). Redis at 60% ops utilization. S3 at 25%.',
    options: [
      { id: 'a', text: 'Origin API (45k of 32k capacity = 141%)', correct: true },
      { id: 'b', text: 'CDN', correct: false },
      { id: 'c', text: 'Redis', correct: false },
      { id: 'd', text: 'S3', correct: false },
    ],
    explanation: '45k into 32k of capacity means the origin is already overloaded — the CDN hid the growth until it hit 15% miss. Scale out and raise the hit ratio.',
    conceptId: 'caching-strategies',
  },
  {
    id: 'bh-4',
    kind: 'bottleneck',
    prompt: 'Which component saturates first?',
    context:
      'WebSocket gateways: 3 nodes × 200k connections. Chat fan-out service: 12k msgs/s with a 15k cap. Pub/Sub backplane: 80k msg/s with a 100k cap. Presence store: 4k ops/s with a 6k cap. Total connections: 540k.',
    options: [
      { id: 'a', text: 'The WebSocket gateways (540k of 600k connections = 90%)', correct: true },
      { id: 'b', text: 'The fan-out service', correct: false },
      { id: 'c', text: 'The pub/sub backplane', correct: false },
      { id: 'd', text: 'The presence store', correct: false },
    ],
    explanation: 'Connection capacity binds before message throughput: 90% connection utilization with a fixed reconnect storm risk. Add gateways before pushing more load.',
    conceptId: 'load-balancing',
  },
];

export const PLAY_BY_KIND: Record<PlayQuestionKind, PlayQuestion[]> = {
  estimate: PLAY_QUESTIONS.filter((q) => q.kind === 'estimate'),
  match: PLAY_QUESTIONS.filter((q) => q.kind === 'match'),
  diagnose: PLAY_QUESTIONS.filter((q) => q.kind === 'diagnose'),
  bottleneck: PLAY_QUESTIONS.filter((q) => q.kind === 'bottleneck'),
};

/**
 * Deterministic UTC-day index for the Daily Puzzle. Same date string in any
 * timezone-consistent order → same question for everybody, no backend.
 */
export function dailyPuzzleIndex(date: Date = new Date()): number {
  const key = `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}-${date.getUTCDate()}`;
  let hash = 2166136261;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const poolLength = PLAY_QUESTIONS.length;
  return Math.abs(hash) % poolLength;
}

export function dailyPuzzle(date: Date = new Date()): PlayQuestion {
  return PLAY_QUESTIONS[dailyPuzzleIndex(date)];
}

/** Log-scale estimation scoring: within 3× = 100, within 10× = 50, else 0. */
export function scoreEstimate(guess: number, answer: number): number {
  if (!Number.isFinite(guess) || guess <= 0 || answer <= 0) return 0;
  const ratio = Math.max(guess / answer, answer / guess);
  if (ratio <= 3) return 100;
  if (ratio <= 10) return 50;
  return 0;
}
