/**
 * Plain-language glossary the wiki reader maps to every jargon word.
 *
 * Hovering (or focusing) a dotted-underline term anywhere in prose opens a
 * hover card with a one-sentence noob-friendly definition, plus a deep link
 * to the module that teaches it. Definitions are deliberately simpler than
 * the encyclopedia — they are the elevator pitch, the article is the lecture.
 */

export interface GlossaryEntry {
  term: string;
  meaning: string;
  href?: string;
}

export const GLOSSARY: GlossaryEntry[] = [
  { term: "latency", meaning: "How long a single request takes, measured end to end — not how many requests you can handle.", href: "/wiki/observability-tracing" },
  { term: "throughput", meaning: "How many requests or events the system completes per second — capacity, not speed of one request.", href: "/wiki/load-balancing" },
  { term: "tail latency", meaning: "The p99 worst cases real users feel; averages hide them, budgets are spent by them.", href: "/wiki/observability-tracing" },
  { term: "p99 latency", meaning: "The latency below which 99% of requests finish — the number your slowest 1% of users experience or worse.", href: "/wiki/observability-tracing" },
  { term: "backpressure", meaning: "Telling an upstream producer 'slow down' so a slow consumer does not drown in unbounded queues.", href: "/wiki/message-queues" },
  { term: "retries", meaning: "Sending the same request again after a failure. Harmless when rare, an outage amplifier when everyone retries at once.", href: "/wiki/load-balancing" },
  { term: "retry storm", meaning: "A crash where every client retries at the same moment, multiplying load onto a server that is already down.", href: "/wiki/load-balancing" },
  { term: "load shedding", meaning: "Dropping low-priority work quickly with clean errors so the important work survives overload.", href: "/wiki/rate-limiting" },
  { term: "SLO", meaning: "Service Level Objective — the reliability promise you design for, like '99.9% of checks succeed in 200ms'.", href: "/wiki/observability-tracing" },
  { term: "error budget", meaning: "The amount of badness your SLO allows per period (0.1%) — spend it on change, stop when it burns fast.", href: "/wiki/observability-tracing" },
  { term: "rate limiting", meaning: "Bounding how fast each caller may send requests, returning 429 when the budget runs out.", href: "/wiki/rate-limiting" },
  { term: "token bucket", meaning: "A limiter storing refillable tokens: bursts drain the jar, refill rate caps the average. It is the industry-standard shape.", href: "/wiki/rate-limiting" },
  { term: "leaky bucket", meaning: "A limiter that smooths traffic to a fixed outflow rate, like a hose with a nozzle instead of a burst.", href: "/wiki/rate-limiting" },
  { term: "admission control", meaning: "Protecting a service by rejecting or delaying work before it enters an already full resource.", href: "/wiki/rate-limiting" },
  { term: "quorum", meaning: "The minimum number of votes that agree before a decision counts — a majority, so two sides can never both win.", href: "/wiki/raft-consensus" },
  { term: "fencing token", meaning: "A number stamped on every epoch of leadership; old leaders holding smaller numbers get refused by storage.", href: "/wiki/raft-consensus" },
  { term: "consensus", meaning: "Getting a majority of machines to agree on one value that cannot take a different answer later.", href: "/wiki/raft-consensus" },
  { term: "leader election", meaning: "Electing one node to drive all changes, chosen by a majority of votes so two leaders can never co-exist.", href: "/wiki/raft-consensus" },
  { term: "split-brain", meaning: "Two sides of a network both believe they are in charge and accept conflicting writes.", href: "/wiki/replication" },
  { term: "circuit breaker", meaning: "A switch that stops you calling a failing dependency, so failures fail fast instead of stacking up.", href: "/wiki/load-balancing" },
  { term: "consistent hashing", meaning: "Putting keys and servers on one ring so adding or removing a server only moves the keys between its neighbors.", href: "/wiki/consistent-hashing" },
  { term: "virtual nodes", meaning: "Small ring arcs a server is cloned into on the hash ring, which smooth out load when servers join or leave.", href: "/wiki/consistent-hashing" },
  { term: "cache", meaning: "A fast memory holding copies of slow answers, valid until data changes or time runs out.", href: "/wiki/caching-strategies" },
  { term: "TTL", meaning: "Time to live — how many seconds a cached copy stays trusted before it must be refetched.", href: "/wiki/caching-strategies" },
  { term: "cache hit", meaning: "The answer was already in the copy; you served without touching the slow source.", href: "/wiki/caching-strategies" },
  { term: "cache miss", meaning: "The copy did not have it, so you paid the origin cost — and maybe paid to fill the cache.", href: "/wiki/caching-strategies" },
  { term: "cache stampede", meaning: "A hot key expires and every caller misses at once, hammering the origin with identical reads.", href: "/wiki/caching-strategies" },
  { term: "single-flight", meaning: "Collapsing identical concurrent requests into one real fetch, with everyone else waiting for the same result.", href: "/wiki/caching-strategies" },
  { term: "stale-while-revalidate", meaning: "Serve the slightly old copy instantly, refresh it in the background before it dies.", href: "/wiki/caching-strategies" },
  { term: "eviction", meaning: "Choosing what to forget when cache memory is full — LRU, LFU, or admission policies make the call.", href: "/wiki/caching-strategies" },
  { term: "CDN", meaning: "A network of edge servers that cache your content physically closer to users.", href: "/wiki/caching-strategies" },
  { term: "sharding", meaning: "Splitting one logical dataset across many machines by a key rule, so no single machine owns everything.", href: "/wiki/sharding-partitioning" },
  { term: "shard key", meaning: "The field a row is hashed or ranged on to decide which shard owns it — choose it early, change it rarely.", href: "/wiki/sharding-partitioning" },
  { term: "partition key", meaning: "The value hashed to pick which queue partition orders your messages.", href: "/wiki/message-queues" },
  { term: "hot key", meaning: "One key (celebrity user, one SKU) whose traffic concentrates on a single shard or partition.", href: "/wiki/sharding-partitioning" },
  { term: "scatter-gather", meaning: "Asking every shard at once and merging answers — slow because your p99 becomes the slowest shard.", href: "/wiki/sharding-partitioning" },
  { term: "replication", meaning: "Keeping copies on multiple machines so failure of one does not lose data — and reads can spread.", href: "/wiki/replication" },
  { term: "replication lag", meaning: "How far behind a follower copy is while the leader keeps moving; stale reads live inside it.", href: "/wiki/replication" },
  { term: "failover", meaning: "Promoting a healthy follower to leader when the leader dies — the moment data can be lost if done loosely.", href: "/wiki/replication" },
  { term: "WAL", meaning: "Write-ahead log — an append-only file written before changes are applied, the thing you replay after a crash.", href: "/wiki/btree-vs-lsm" },
  { term: "fsync", meaning: "The OS call that forces bytes onto physical disk; persistence promises live or die on this.", href: "/wiki/btree-vs-lsm" },
  { term: "compaction", meaning: "Background merge of LSM files that erases deleted rows and bounds read cost — at the price of I/O.", href: "/wiki/btree-vs-lsm" },
  { term: "tombstone", meaning: "A delete marker stored because append-only engines cannot rewrite history in place.", href: "/wiki/btree-vs-lsm" },
  { term: "saga", meaning: "A multi-service business flow done as local transactions with a durable step list, undoing with compensations.", href: "/wiki/acid-vs-base" },
  { term: "compensation", meaning: "The undo action of a saga step — refund the flight, release the seat — that runs when a later step fails.", href: "/wiki/acid-vs-base" },
  { term: "outbox pattern", meaning: "Writing the event into a database table in the same transaction as your state change, then publishing reliably from it.", href: "/wiki/acid-vs-base" },
  { term: "two-phase commit", meaning: "2PC — a coordination protocol where a leader asks everyone to prepare, then commits; correct but blocking on failure.", href: "/wiki/acid-vs-base" },
  { term: "isolation level", meaning: "Which concurrency anomalies (dirty reads, phantoms, write skew) a database still allows.", href: "/wiki/acid-vs-base" },
  { term: "snapshot isolation", meaning: "Every transaction reads a frozen version of the data, so queries see no half-commit work.", href: "/wiki/acid-vs-base" },
  { term: "bloom filter", meaning: "A tiny bitmap that says 'definitely not here' or 'maybe here' — never wrong about the absence, sometimes wrong about the presence.", href: "/wiki/bloom-filters" },
  { term: "false positive rate", meaning: "How often 'maybe present' turns out to be wrong; sized by bits per key, never a permanent shame.", href: "/wiki/bloom-filters" },
  { term: "anti-entropy", meaning: "The background process replicas run to compare their data and heal any drift between copies.", href: "/wiki/merkle-trees" },
  { term: "Merkle tree", meaning: "A hash tree whose root fingerprint finds exactly which slices two datasets disagree on.", href: "/wiki/merkle-trees" },
  { term: "gossip protocol", meaning: "Spreading state by exchanging with random peers each round — O(log N) rounds reach everyone without a coordinator.", href: "/wiki/gossip-protocol" },
  { term: "SWIM", meaning: "Scalable Weakly-consistent Infection-style Membership — gossip-based failure detection with suspicion before death.", href: "/wiki/gossip-protocol" },
  { term: "at-least-once", meaning: "Delivery where messages may arrive more than once but never get lost — consumers must be idempotent.", href: "/wiki/message-queues" },
  { term: "idempotent", meaning: "Safe to do twice: the second identical call changes nothing more than the first.", href: "/wiki/message-queues" },
  { term: "exactly-once", meaning: "Each effect happens precisely one time — achieved with idempotency keys plus transactional commits, not by magic.", href: "/wiki/message-queues" },
  { term: "dead letter queue", meaning: "The bin where messages that keep failing go, so one poison record never wedges the pipeline.", href: "/wiki/message-queues" },
  { term: "consumer group", meaning: "A team of workers sharing a queue's partitions; each partition goes to one member at a time.", href: "/wiki/event-streaming" },
  { term: "rebalance", meaning: "Redistributing partition ownership when consumers join or leave — the moment offsets can double-process.", href: "/wiki/message-queues" },
  { term: "offset", meaning: "A consumer's bookmark in a log partition — commit it after side effects, not before.", href: "/wiki/message-queues" },
  { term: "exactly-once semantics", meaning: "The pipeline trait where producers, brokers, and consumers cooperate so effects are deduplicated end to end.", href: "/wiki/event-streaming" },
  { term: "poison message", meaning: "A record that always crashes its consumer — route it to a DLQ instead of failing the pipeline forever.", href: "/wiki/message-queues" },
  { term: "embedding", meaning: "A vector of numbers a model produces that encodes meaning, so similar things sit close together.", href: "/wiki/vector-search" },
  { term: "cosine similarity", meaning: "Angle between two vectors — a cheap way to score 'how close in meaning' two texts are.", href: "/wiki/vector-search" },
  { term: "ANN search", meaning: "Approximate nearest-neighbor search: an index that visits the likely-right neighborhood first instead of scanning everything.", href: "/wiki/vector-search" },
  { term: "re-ranking", meaning: "A second, smarter scorer that sorts the ANN candidates so the truly relevant items come first.", href: "/wiki/vector-search" },
  { term: "prefill", meaning: "The parallel compute burst that reads a whole prompt before the first token can stream out — it sets TTFT.", href: "/wiki/llm-systems" },
  { term: "decode", meaning: "The token-by-token generation loop after the prompt is read; it is memory-bandwidth bound, not compute bound.", href: "/wiki/llm-systems" },
  { term: "TTFT", meaning: "Time to first token — the wait before the model's answer starts streaming, dominated by prefill and queueing.", href: "/wiki/llm-systems" },
  { term: "TPOT", meaning: "Time per output token — how fast the stream flows once it starts.", href: "/wiki/llm-systems" },
  { term: "KV cache", meaning: "The per-conversation model memory that makes every old token reusable as new ones generate — VRAM's main tenant.", href: "/wiki/llm-systems" },
  { term: "quantization", meaning: "Storing model weights in fewer bits (fp16 to int8 or int4); halves memory, occasionally costs a little quality.", href: "/wiki/llm-systems" },
  { term: "batching", meaning: "Processing many requests on one GPU at the same time to amortize compute — the biggest throughput lever.", href: "/wiki/llm-systems" },
  { term: "bounded context", meaning: "A DDD wall where one domain model and its data end — services own their context, not other services' tables.", href: "/wiki/microservices-monolith" },
  { term: "bounded contexts", meaning: "DDD's domain walls — each service owns its data and language, and no one else reaches into its tables.", href: "/wiki/microservices-monolith" },
  { term: "distributed monolith", meaning: "Many services that can only deploy or change together — all of the network tax, none of the autonomy.", href: "/wiki/microservices-monolith" },
  { term: "strangler fig", meaning: "The migration pattern where new code wraps the old system and routes traffic gradually, never a big-bang rewrite.", href: "/wiki/microservices-monolith" },
  { term: "golden signals", meaning: "Latency, traffic, errors, and saturation per service — the four symptoms worth alerting on.", href: "/wiki/observability-tracing" },
  { term: "trace", meaning: "The GPS recording of one request: which service touched it, in what order, and how many milliseconds each hop cost.", href: "/wiki/observability-tracing" },
  { term: "span", meaning: "One step inside a trace — a single service or database call with a duration and status.", href: "/wiki/observability-tracing" },
  { term: "open telemetry", meaning: "The open standard (OTel) for instrumenting, collecting, and exporting traces, metrics, and logs.", href: "/wiki/observability-tracing" },
  { term: "burn rate", meaning: "How fast you consume your error budget; when it predicts exhaustion within hours, you page a human.", href: "/wiki/observability-tracing" },
  { term: "cardinality", meaning: "How many unique values a metric label can take — the number that quietly explodes time-series storage.", href: "/wiki/observability-tracing" },
  { term: "exactly-once delivery", meaning: "The goal of passing every message exactly once — real implementations hinge on idempotent consumers plus deduplicated storage.", href: "/wiki/message-queues" },
];

const escapeForRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&");

/** Longest-first alternation so 'dead letter queue' wins over 'letter'. */
export const GLOSSARY_PATTERN: RegExp | null =
  GLOSSARY.length === 0
    ? null
    : new RegExp(
        `\\b(${[...GLOSSARY]
          .sort((a, b) => b.term.length - a.term.length)
          .map((e) => escapeForRegex(e.term))
          .join("|")})\\b`,
        "gi",
      );

export const GLOSSARY_MAP: Record<string, GlossaryEntry> = Object.fromEntries(
  GLOSSARY.map((e) => [e.term.toLowerCase(), e]),
);

/** Normalize a matched snippet to its canonical glossary key. */
export function lookupGlossary(snippet: string): GlossaryEntry | undefined {
  return GLOSSARY_MAP[snippet.toLowerCase()];
}
