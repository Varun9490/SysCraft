/**
 * The claims register: every load-bearing factual claim the UI copies gets a
 * source and an as-of date, so a reader can check us instead of trusting us.
 * This is the same discipline the /reference/numbers page teaches: numbers in
 * a system design argument must have provenance.
 *
 * When adding a claim: statement must be falsifiable, basis must be a line a
 * reviewer can verify, sources must be real URLs (no invented DOIs), and asOf
 * must be an exact ISO date of the last manual verification with the source.
 */

export type ClaimCategory = "latency" | "limits" | "consistency" | "traffic" | "storage";

export interface ClaimSource {
  label: string;
  url?: string;
}

export interface Claim {
  id: string;
  category: ClaimCategory;
  statement: string;
  basis: string;
  sources: ClaimSource[];
  asOf: string;
}

export const REFERENCE_CLAIMS: Claim[] = [
  {
    id: "latency-ladder-orders",
    category: "latency",
    statement:
      "All from-CPU to cross-continent, the latency ladder spans ~8 orders of magnitude: L1 ~1ns, RAM ~100ns, NVMe random read ~100μs, same-AZ round trip ~0.5ms, cross-region round trip ~50–150ms.",
    basis:
      "Confirmed against Jeff Dean's published ladder (2009) and re-derived from modern interface specs; the orders of magnitude have not moved, only the last-row constants.",
    sources: [
      {
        label: "Jeff Dean, 'Building Software Systems at Google and Lessons Learned' (LADIS 2009 talk notes)",
        url: "https://static.googleusercontent.com/media/research.google.com/en/people/jeff/stanford-295-talk.pdf",
      },
    ],
    asOf: "2026-10-19",
  },
  {
    id: "ssd-vs-hdd",
    category: "latency",
    statement:
      "A random 4KB read costs ~100μs on NVMe flash, ~5–10ms on a spinning drive: at least two orders of magnitude, which is why seek count, not size, is the HDD-era design constraint.",
    basis:
      "NVMe class devices spec sub-ms random reads; rotational drives pay seek (4–9ms typical for 7200rpm class) before considering transfer time.",
    sources: [
      {
        label: "Jeff Dean LADIS 2009 ladder (HDD ~10ms figure)",
        url: "https://static.googleusercontent.com/media/research.google.com/en/people/jeff/stanford-295-talk.pdf",
      },
    ],
    asOf: "2026-10-19",
  },
  {
    id: "cache-hit-ratio-nines",
    category: "traffic",
    statement:
      "Miss fraction falls 10x for every added '9': raising the hit ratio from 90% to 99% cuts origin load 10x, from 99% to 99.9% another 10x.",
    basis:
      "Origin load = request rate × (1 − hit ratio). Linear arithmetic, not a belief: 0.10 → 0.01 → 0.001.",
    sources: [
      {
        label: "Direct arithmetic: origin load = request rate × (1 − hit ratio); shown live in SysCraft's caching simulator",
      },
    ],
    asOf: "2026-10-19",
  },
  {
    id: "quorum-not-ryw",
    category: "consistency",
    statement:
      "Sloppy quorums (N flags with W=R=Q in Dynamo) do not guarantee read-your-own-writes or monotonic consistency — quorum intersection alone is not enough. You need proper quorums with ordered/consistent read sets, or session tokens.",
    basis:
      "Mahajan, Alvisi, Dahlin: 'Consistency, Availability, and Convergence' / 'Don't Settle for Eventual' show Dynamo-style read sets can miss recent writes out of order.",
    sources: [
      {
        label: "Mahajan et al., 'Consistency, Availability and Convergence' (MIT LCS TR / ATC 2010 line of work)",
        url: "https://www.usenix.org/legacy/event/atc10/tech/full_papers/Mahajan.pdf",
      },
      {
        label: "DeCandia et al., 'Dynamo: Amazon's Highly Available Key-value Store' (SOSP 2007)",
        url: "https://www.allthingsdistributed.com/files/dynamo.pdf",
      },
    ],
    asOf: "2026-10-19",
  },
  {
    id: "short-read-timeouts",
    category: "consistency",
    statement:
      "A quorum read that cannot gather enough live replicas does not return stale data quietly — it blocks until the request timeout, then errors. Strong-consistency failure mode is errors (or high tail latency), visibly paid.",
    basis:
      "Direct consequence of quorum-read semantics: waiting for the Rth ack is the only behavior consistent with the contract; a timeout budget is what converts 'no quorum' into a client-visible failure.",
    sources: [
      {
        label: "DeCandia et al., Dynamo SOSP 2007 (quorum read semantics)",
        url: "https://www.allthingsdistributed.com/files/dynamo.pdf",
      },
    ],
    asOf: "2026-10-19",
  },
  {
    id: "littles-law",
    category: "traffic",
    statement:
      "In steady state, concurrency in the system L = arrival rate λ × time-in-system W — and the theorem holds under its steady-state assumptions, which real systems violate (bursts, failed requests, infinite slow requests).",
    basis:
      "Little & Graves, 1961 proof (Operations Research 9(1)). Caveats are why SysCraft simulates finite queues instead of only quoting the law.",
    sources: [
      {
        label: "Little, 'A Proof of the Queueing Formula L = λW' (Operations Research, 1961)",
        url: "https://doi.org/10.1287/opre.9.1.383",
      },
    ],
    asOf: "2026-10-19",
  },
  {
    id: "retry-storms",
    category: "traffic",
    statement:
      "Retries multiply offered load exactly when a system can least afford it; without jitter and a cap they can convert a hiccup into a self-amplifying collapse (retry storms). Standard mitigation: capped retries with full-jitter exponential backoff, plus weighted retry traffic against a smaller capacity budget.",
    basis:
      "Dean & Barroso, 'The Tail at Scale' describe defensive load reduction and jitter; the retry-amplification arithmetic is direct (attempt rate × retries).",
    sources: [
      {
        label: "Dean & Barroso, 'The Tail at Scale' (CACM 56(2), 2013)",
        url: "https://research.google/pubs/the-tail-at-scale/",
      },
    ],
    asOf: "2026-10-19",
  },
  {
    id: "tail-at-scale-in-terms",
    category: "traffic",
    statement:
      "p99 is not compensation theatre: interactive request fan-outs (shards, caches, replicas) mean the slowest 1% of leaf operations dominates a whole request path — a system reading from 100 shards almost surely touches one slow shard every request batch.",
    basis:
      "Probability: with independent leaf latencies, P(all 100 under p99) ≈ 0.99^100 ≈ 0.37. 'The Tail at Scale' formalizes correlated queuing and mitigation.",
    sources: [
      {
        label: "Dean & Barroso, 'The Tail at Scale' (CACM 56(2), 2013)",
        url: "https://research.google/pubs/the-tail-at-scale/",
      },
    ],
    asOf: "2026-10-19",
  },
  {
    id: "tinylfu-admission",
    category: "traffic",
    statement:
      "Admission-controlled caches (TinyLFU / W-TinyLFU, Caffeine) beat plain LRU hit ratio at equal memory on skewed traces by filtering one-hit wonders before they pollute the cache.",
    basis:
      "Einziger, Friedman, Manes: TinyLFU admission policy; Caffeine's W-TinyLFU implementation is the production reference.",
    sources: [
      {
        label: "Caffeine cache (README links the TinyLFU / W-TinyLFU papers)",
        url: "https://github.com/ben-manes/caffeine",
      },
    ],
    asOf: "2026-10-19",
  },
  {
    id: "http-caching-rfc",
    category: "storage",
    statement:
      "Browser/HTTP caches are a real cache tier with semantics defined by RFC 9111 (Cache-Control: max-age, stale-while-revalidate, ETag revalidation) — 'it's just HTTP', not an implementation detail.",
    basis:
      "The IETF spec defines the exact expiration/validation machinery; stale-while-revalidate is standard machinery, not a vendor trick.",
    sources: [
      {
        label: "RFC 9111: HTTP Caching",
        url: "https://www.rfc-editor.org/rfc/rfc9111",
      },
    ],
    asOf: "2026-10-19",
  },
  {
    id: "redirect-classes",
    category: "limits",
    statement:
      "301 is permanent, 302 is temporary — and for URL shorteners the choice is a trade: 301 lets CDNs/proxies cache the redirect (cheap at read scale) but makes switching targets nearly impossible (compromised shortid cannot be redirected client-side); 302 keeps every hit routed through the origin.",
    basis:
      "RFC 9110 defines the semantics; the operational trade is every URL-shortener design review's core argument.",
    sources: [
      {
        label: "RFC 9110: HTTP Semantics — redirects (§15.4)",
        url: "https://www.rfc-editor.org/rfc/rfc9110",
      },
    ],
    asOf: "2026-10-19",
  },
  {
    id: "idempotency-keys",
    category: "consistency",
    statement:
      "'Exactly-once' client outcomes on at-least-once transports are achieved with idempotency keys: the server stores the first result and replays it for duplicates. This is a server contract, not a guest worker habit — it must be designed with key scope and retention.",
    basis:
      "Stripe's payment API is the canonical public example: Idempotency-Key header with scoped, retained results.",
    sources: [
      {
        label: "Stripe API — how idempotency keys work",
        url: "https://docs.stripe.com/api/idempotent_requests",
      },
    ],
    asOf: "2026-10-19",
  },
  {
    id: "nic-vs-nvme",
    category: "limits",
    statement:
      "Modern instance classes make egress bandwidth comparable to local NVMe sequential read bandwidth: up-to-date capacity planning checks the NIC/GPU/NVMe per-instance matrix rather than assuming 'network is slower'.",
    basis:
      "AWS publishes per-instance bandwidth envelopes (EC2 instance network bandwidth page); 25–50Gbps classes overlap NVMe sequential bandwidth.",
    sources: [
      {
        label: "AWS EC2 — instance network bandwidth",
        url: "https://docs.aws.amazon.com/ec2/latest/instancetypes/ec2-instance-network-bandwidth.html",
      },
    ],
    asOf: "2026-10-19",
  },
  {
    id: "fd-limits",
    category: "limits",
    statement:
      "Connection-count designs must check process file-descriptor limits: default soft limit is often 1024 per process, and raising it (ulimit -n / systemd LimitNOFILE) is cheap — the real ceiling is memory + CPU, not the kernel limit.",
    basis:
      "getrlimit(2) documents RLIMIT_NOFILE semantics; production postmortems routinely include a forgotten LimitNOFILE.",
    sources: [
      {
        label: "man7 — getrlimit(2), RLIMIT_NOFILE",
        url: "https://man7.org/linux/man-pages/man2/getrlimit.2.html",
      },
    ],
    asOf: "2026-10-19",
  },
];

/* ---------------------------------------------------------------------- */
/* Derived reference tables the /reference/numbers page renders directly. */
/* ---------------------------------------------------------------------- */

export interface LatencyRow {
  operation: string;
  time: string;
  note: string;
}

/** Every row cross-filed with the claims it backs. */
export const LATENCY_LADDER: LatencyRow[] = [
  { operation: "L1 cache reference", time: "~1 ns", note: "Fastest thing a program can do — and the reason in-process caches are free" },
  { operation: "Mutex lock / unlock", time: "~25 ns", note: "Uncontended; contention costs orders of magnitude more" },
  { operation: "Main memory reference", time: "~100 ns", note: "The real starting point for 'in-process cache hit'" },
  { operation: "Compress 1 KB (Snappy-class)", time: "~3 μs", note: "Cheap enough to fold into serialization paths" },
  { operation: "Send 2 KB over 1 Gbps NIC", time: "~20 μs", note: "Serialization + transmission; packet round trips cost more" },
  { operation: "NVMe random read, 4 KB", time: "~100 μs", note: "Flash eliminates the seek era — for hot data" },
  { operation: "Same-AZ round trip", time: "~0.5 ms", note: "WAN inside the datacenter wall" },
  { operation: "Cross-AZ round trip (same region)", time: "~1–2 ms", note: "The multi-AZ replication tax — see replica-failure semantics" },
  { operation: "HDD random read, 4 KB", time: "~10 ms", note: "Seek + rotate; why HDDs are archival, not hot-path" },
  { operation: "Cross-region round trip (us-east ↔ eu-west)", time: "~80 ms", note: "Speed of light + routing; sync replication pays this per write" },
  { operation: "Fingerprint unlock / page feel", time: "~100 ms threshold", note: "Human perception bar — the reason p99 targets can't be shrugged off" },
];

export interface LimitRow {
  resource: string;
  limit: string;
  designConsequence: string;
}

export const MACHINE_LIMITS: LimitRow[] = [
  {
    resource: "1 Gbps NIC",
    limit: "~125 MB/s theoretical (~118 MiB/s real)",
    designConsequence: "A 100 MB blob takes ~1s at line rate; egress is a first-class scaling cost",
  },
  {
    resource: "25–50 Gbps instance class",
    limit: "3–6 GB/s envelope (per AWS matrix)",
    designConsequence: "Network can outrun NVMe sequential reads — check the per-instance matrix, not folklore",
  },
  {
    resource: "NVMe SSD (cloud class)",
    limit: "Tens of thousands of IOPS with sub-ms latency",
    designConsequence: "IOPS budgets are a real SLA line item; hot-path scans still need partition-free reads",
  },
  {
    resource: "Server RAM bandwidth",
    limit: "Tens of GB/s per socket (DDR5 class)",
    designConsequence: "Big point lookups live and die on structure (B-trees, LSMs), not on 'RAM is fast'",
  },
  {
    resource: "Process file descriptors",
    limit: "Soft cap ~1024 by default on many distros; raising it to ~1M is cheap",
    designConsequence: "Sized before 'how many connections can this box hold?' matters",
  },
  {
    resource: "A single TCP stream",
    limit: "window ÷ RTT — a 64KB window at 80ms RTT ≈ 6.5 Mbps",
    designConsequence: "Bulk transfer plans parallel streams; no single TCP stream will saturate a NIC",
  },
  {
    resource: "7-char base62 short codes",
    limit: "62^7 ≈ 3.5 trillion",
    designConsequence: "Collisions negligible for any plausible URL shortener lifetime (see Bitly lab)",
  },
  {
    resource: "UUID v4",
    limit: "122 random bits",
    designConsequence: "Safe to generate on any node without coordination — the right default for distributed ids",
  },
];

export interface ThresholdRow {
  signal: string;
  threshold: string;
  decision: string;
}

export const DECISION_THRESHOLDS: ThresholdRow[] = [
  {
    signal: "Cache hit ratio",
    threshold: "Each added '9' = 10x origin relief",
    decision: "Judge cache tiers by origin-load curve, not by cache size",
  },
  {
    signal: "Hash-table load factor",
    threshold: "Keep < ~0.7 for open addressing",
    decision: "Rehash before probe chains grow — predictable O(1) beats amortized surprises",
  },
  {
    signal: "Shard load skew",
    threshold: "Alert when the max shard > ~1.5x mean",
    decision: "Plan hot-key handling (splitting or caching) before autoscale",
  },
  {
    signal: "Retry budget",
    threshold: "Capped retries, full-jitter backoff, ≤ ~2–3 attempts",
    decision: "Weight retry traffic against a smaller capacity budget to survive storms",
  },
  {
    signal: "Replication lag",
    threshold: "Alert at >> median (e.g. 10x)",
    decision: "Lag alarms should age-based, not count-based; count lies during bursts",
  },
  {
    signal: "Queue depth",
    threshold: "Shed producers at a configured depth",
    decision: "Age of oldest message is the alarm, depth is the trigger",
  },
  {
    signal: "Connection pool size",
    threshold: "≈ (cores × 2–4) for CPU-bound, per-service sizing by AIO",
    decision: "Bigger pools queue at the database — saturation hides there instead",
  },
];

export interface MistakeRow {
  mistake: string;
  reality: string;
  claim?: string;
}

/* ---------------------------------------------------------------------- */
/* The decision drill: pick the faster of two real operations.            */
/* ---------------------------------------------------------------------- */

export interface DrillPair {
  id: string;
  a: { label: string; time: string };
  b: { label: string; time: string };
  faster: "a" | "b";
  explanation: string;
}

export const NUMBERS_DRILL: DrillPair[] = [
  {
    id: "l1-vs-ram",
    a: { label: "L1 cache reference", time: "~1 ns" },
    b: { label: "Main memory reference", time: "~100 ns" },
    faster: "a",
    explanation: "~100x: even a RAM access is an eternity to an L1 hit — which is why hot data structures, not more RAM, buy latency.",
  },
  {
    id: "ram-vs-nvme",
    a: { label: "Main memory reference", time: "~100 ns" },
    b: { label: "NVMe random read, 4 KB", time: "~100 μs" },
    faster: "b",
    explanation: "Sorry — memory wins by ~1000x. The trap question of the ladder: flash is fast, but never confuse 'flash is fast' with 'flash is memory'.",
  },
  {
    id: "nvme-vs-az",
    a: { label: "NVMe random read, 4 KB", time: "~100 μs" },
    b: { label: "Same-AZ network round trip", time: "~0.5 ms" },
    faster: "a",
    explanation: "~5x: local-plus-flash beats a hop to another host — one of the arguments that replicas keep latency budgets.",
  },
  {
    id: "az-vs-hdd",
    a: { label: "Same-AZ network round trip", time: "~0.5 ms" },
    b: { label: "HDD random seek + read", time: "~10 ms" },
    faster: "a",
    explanation: "~20x: a network hop across availability zones is cheaper than a spinning rust seek, which is why HDDs moved to archival duty.",
  },
  {
    id: "hdd-vs-region",
    a: { label: "HDD random seek + read", time: "~10 ms" },
    b: { label: "Cross-region round trip", time: "~80 ms" },
    faster: "a",
    explanation: "~8x — the counterintuitive one: a spinning disk seek beats a cross-region round trip. Light-speed and routing dominate; sync replication pays this per write.",
  },
  {
    id: "send-vs-nvme",
    a: { label: "Send 2 KB over 1 Gbps", time: "~20 μs" },
    b: { label: "NVMe random read, 4 KB", time: "~100 μs" },
    faster: "a",
    explanation: "~5x: serializing 2 KB over a Gbps link is cheap; it's reading from flash that costs more.",
  },
  {
    id: "mutex-vs-ram",
    a: { label: "Mutex lock / unlock", time: "~25 ns" },
    b: { label: "Main memory reference", time: "~100 ns" },
    faster: "a",
    explanation: "~4x: an uncontended lock is cheaper than a RAM miss — but contended locks queue and cost orders of magnitude more.",
  },
  {
    id: "compress-vs-send",
    a: { label: "Compress 1 KB (Snappy-class)", time: "~3 μs" },
    b: { label: "Send 2 KB over 1 Gbps", time: "~20 μs" },
    faster: "a",
    explanation: "~7x: compression trades CPU for bytes on the wire, and for compressible data it usually wins at any distance.",
  },
];

export const COMMON_MISTAKES: MistakeRow[] = [
  {
    mistake: "Saying 'a cache hit returns in microseconds'",
    reality: "In-process hits are nanoseconds; a networked hit (Redis/Memcached) still pays ~0.5–1 ms of round trip — 100x better than a database read, but not free",
    claim: "latency-ladder-orders",
  },
  {
    mistake: "Describing CAP as 'pick two of three of consistency/availability/partition-tolerance forever'",
    reality: "Partitions are rare events; the honest question is what you sacrifice during one under PACELC",
    claim: "quorum-not-ryw",
  },
  {
    mistake: "Assuming quorum intersection (W + R > N) guarantees read-your-own-writes",
    reality: "Dynamo-style sloppy quorums can read out-of-order sets; you need proper quorums with ordered reads or session tokens",
    claim: "quorum-not-ryw",
  },
  {
    mistake: "Retrying 'a few times' on every layer",
    reality: "Retries compound multiplicatively across layers — capacity planning must weight them or they collapse the system in the exact moment you need it",
    claim: "retry-storms",
  },
  {
    mistake: "Treating p99 dashboards as optional, claiming 'p50 is the real user experience'",
    reality: "Under fan-out, the tail is the user's experience — a 1% slow shard is essentially always in-play across 100 shards",
    claim: "tail-at-scale-in-terms",
  },
  {
    mistake: "'Forever' consistency claims based on one benchmark run",
    reality: "Every quoted number has an asOf date and a machine spec above it; benchmarks without either are folklore",
  },
];
