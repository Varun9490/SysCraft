/**
 * Per-module plain definition + the canonical sources each concept leans on.
 *
 * The definition card is the noob entry point (one breathable paragraph),
 * and the sources keep the course honest — every claim chain ends at a
 * paper, official docs, or the production blogs where the idea came from.
 */

export interface ConceptSource {
  label: string;
  url: string;
  note: string;
}

export interface ConceptDefinition {
  moduleId: string;
  definition: string;
  sources: ConceptSource[];
}

export const CONCEPT_DEFINITIONS: ConceptDefinition[] = [
  {
    moduleId: "consistent-hashing",
    definition:
      "Consistent hashing spreads keys across an ever-changing pool of nodes by placing keys and nodes on one ring: each key belongs to the first node clockwise from its hash, so a node joining or leaving only re-maps the small arc between its two neighbors instead of the whole key space.",
    sources: [
      {
        label: "Consistent hashing and random trees — Karger et al., MIT (1997)",
        url: "https://en.wikipedia.org/wiki/Consistent_hashing",
        note: "The original ring paper, summarized with its proofs and diagrams.",
      },
      {
        label: "Amazon Dynamo — DeCandia & Vogels (2007)",
        url: "https://www.allthingsdistributed.com/2007/10/amazon_dynamics.html",
        note: "The production write-up from Amazon that made the ring mainstream.",
      },
    ],
  },
  {
    moduleId: "cap-theorem",
    definition:
      "CAP says that during a network partition a distributed store must choose: stay consistent (refuse to guess and serve stale or fail) or stay available (keep serving and let replicas diverge). When the network is healthy you can have both — the theorem only bites during the cut.",
    sources: [
      {
        label: "Brewer's conjecture proved by Gilbert & Lynch (2002)",
        url: "https://en.wikipedia.org/wiki/CAP_theorem",
        note: "The two-decade-old impossibility proof, in accessible summary form.",
      },
      {
        label: "Eventually Consistent — Werner Vogels (ACM Queue)",
        url: "https://www.allthingsdistributed.com/2008/12/eventually_consistent.html",
        note: "How Amazon operationalized the 'A over hard-C' answer in practice.",
      },
    ],
  },
  {
    moduleId: "raft-consensus",
    definition:
      "Raft is consensus made teachable: nodes elect one leader by majority vote, the leader replicates an append-only log to followers, and once a quorum stores an entry, it commits — with term numbers making every stale leader un-deniable.",
    sources: [
      {
        label: "In Search of an Understandable Consensus Algorithm — Ongaro & Ousterhout",
        url: "https://raft.github.io/",
        note: "The paper, visualizations, and lectures on one canonical site.",
      },
      {
        label: "Diego Ongaro's PhD thesis (Stanford, 2014)",
        url: "https://web.stanford.edu/~ouster/cgi-bin/papers/OngaroPhD.pdf",
        note: "The complete edge cases behind every raft interview question.",
      },
    ],
  },
  {
    moduleId: "btree-vs-lsm",
    definition:
      "B-Trees keep a sorted structure updated in place (read-optimized), while LSM trees append writes into memory then merge immutable sorted files in the background (write-optimized). Every storage engine is one of these shapes plus a cache, a WAL, and a compromise between the two.",
    sources: [
      {
        label: "RocksDB engineering blog + wiki",
        url: "https://rocksdb.org/blog/",
        note: "Write and read amplification numbers straight from the most-copied LSM.",
      },
      {
        label: "Apache Cassandra architecture docs",
        url: "https://cassandra.apache.org/doc/latest/",
        note: "SSTables, memtables, and compaction mechanics as actually deployed.",
      },
    ],
  },
  {
    moduleId: "caching-strategies",
    definition:
      "A cache trades memory and freshness for speed: copies of expensive answers are kept close to readers, and the whole discipline is three decisions — when to fill, when to trust, and what to forget.",
    sources: [
      {
        label: "What is a CDN — Cloudflare learning center",
        url: "https://www.cloudflare.com/learning/cdn/what-is-a-cdn/",
        note: "Edge caching explained with the internet public infrastructure as the example.",
      },
      {
        label: "NGINX caching guide",
        url: "https://nginx.org/en/docs/http/ngx_http_cache_module.html",
        note: "The proxy_cache directives most read-through caches emulate today.",
      },
    ],
  },
  {
    moduleId: "load-balancing",
    definition:
      "A load balancer chooses which backend serves each request, using scheduling rules (round-robin, least-outstanding, consistent-hash) plus health checks that eject the sick. The p95 of your users is essentially what your scheduler + health checks permit.",
    sources: [
      {
        label: "NGINX load balancing documentation",
        url: "https://nginx.org/en/docs/http/load_balancing.html",
        note: "The algorithm menu — round robin, least_conn, hash — implemented at the edge.",
      },
      {
        label: "Google SRE Book — Load Balancing in the Datacenter",
        url: "https://sre.google/sre-book/load-balancing-datacenter/",
        note: "Why least-request beats round-robin on mixed-cost backends, with datacenter measurements.",
      },
    ],
  },
  {
    moduleId: "message-queues",
    definition:
      "A message queue decouples producers from consumers with a durable, ordered buffer; the contract that matters is delivery semantics — at-least-once by default, exactly-once when consumers are idempotent and offsets are committed faithfully.",
    sources: [
      {
        label: "Apache Kafka — delivery semantics docs",
        url: "https://kafka.apache.org/documentation/#semantics",
        note: "The authoritative definition of at-least-once and exactly-once in queueing.",
      },
      {
        label: "AWS SQS developer guide",
        url: "https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/welcome.html",
        note: "Visibility timeouts, DLQ wiring, and retries in the managed setting.",
      },
    ],
  },
  {
    moduleId: "event-streaming",
    definition:
      "Event streaming is a queue rebuilt as a replayable log: records append to partitioned, retained topics, so consumers both subscribe live and re-read history — enabling stateful reconstructions, joins, and windowed aggregates as first-class products.",
    sources: [
      {
        label: "Apache Kafka — introduction & design docs",
        url: "https://kafka.apache.org/documentation/#gettingStarted",
        note: "Partitions, consumer groups, and retention are all specified here.",
      },
      {
        label: "Apache Flink stable documentation",
        url: "https://nightlies.apache.org/flink/flink-docs-stable/",
        note: "Windows, watermarks, and exactly-once stateful processing in depth.",
      },
    ],
  },
  {
    moduleId: "sharding-partitioning",
    definition:
      "Sharding splits one logical dataset across machines via a shard key (hash, range, or directory). It buys elastic scale and bounded blast radius, and costs you cross-shard query patterns plus an early, hard-to-change decision about the key.",
    sources: [
      {
        label: "MongoDB sharding documentation",
        url: "https://www.mongodb.com/docs/manual/sharding/",
        note: "Hashed vs ranged shard keys, balancers, and each choice's failure profile.",
      },
      {
        label: "How Discord Scaled Elixir to 5,000,000 Concurrent Users",
        url: "https://discord.com/blog/how-discord-scaled-elixir-to-5000000-concurrent-users",
        note: "A famous hot-shard hunt: one server with 5M users and how the heat moved.",
      },
    ],
  },
  {
    moduleId: "replication",
    definition:
      "Replication keeps extra copies of data on other machines: a leader applies writes first, followers echo the change stream (sync when you require quorum, async when you require speed), and failover promotes a follower — the whole safety story is lag, quorums, and fencing.",
    sources: [
      {
        label: "PostgreSQL streaming replication docs",
        url: "https://www.postgresql.org/docs/current/warm-standby.html",
        note: "WAL shipping, sync replication, and promotion semantics in production form.",
      },
      {
        label: "Apache Cassandra — replication docs",
        url: "https://cassandra.apache.org/doc/latest/cassandra/architecture/dynamo.html",
        note: "The leaderless flip side: quorum reads and writes with hinted handoff.",
      },
    ],
  },
  {
    moduleId: "acid-vs-base",
    definition:
      "ACID is the single-database contract (atomic, consistent, isolated, durable); BASE is what cross-service systems fall back to (basically available, soft state, eventually consistent) — sagas and outboxes are the machinery that makes the fallback safe.",
    sources: [
      {
        label: "PostgreSQL MVCC and transaction isolation docs",
        url: "https://www.postgresql.org/docs/current/mvcc.html",
        note: "The isolation anomaly table every interview is built from.",
      },
      {
        label: "BASE: An ACID Alternative — Dan Pritchett (ACM Queue)",
        url: "https://queue.acm.org/detail.cfm?id=1394125",
        note: "The eBay write-up that gave BASE its name and shape.",
      },
    ],
  },
  {
    moduleId: "bloom-filters",
    definition:
      "A Bloom filter is a small bit set plus k hash functions that answers 'definitely not present' for sure, and 'possibly present' sometimes-wrongly — the cheapest guard against wasted disk reads when keys are usually absent.",
    sources: [
      {
        label: "Bloom filter — reference summary (1970; sizing math)",
        url: "https://en.wikipedia.org/wiki/Bloom_filter",
        note: "The 1970 data structure and every variant, with formulas and references.",
      },
      {
        label: "Redis probabilistic data types docs",
        url: "https://redis.io/docs/latest/develop/data-types/probabilistic/bloom-filter/",
        note: "The production-ready filter with memory/per-error tables.",
      },
    ],
  },
  {
    moduleId: "merkle-trees",
    definition:
      "A Merkle tree hashes data at the leaves and each parent from its children, so one root value fingerprints the whole dataset — replicas compare roots first, then walk down only the divergent branches to sync kilobytes instead of gigabytes.",
    sources: [
      {
        label: "Merkle tree — the 1987 idea in reference form",
        url: "https://en.wikipedia.org/wiki/Merkle_tree",
        note: "Construction, proofs, and the security property in one page.",
      },
      {
        label: "Certificate Transparency — RFC 6962 (IETF)",
        url: "https://datatracker.ietf.org/doc/html/rfc6962",
        note: "Merkle logs protecting the entire TLS certificate ecosystem in production.",
      },
    ],
  },
  {
    moduleId: "gossip-protocol",
    definition:
      "A gossip protocol spreads cluster state by having each node periodically exchange updates with a few random peers — information travels like a rumor, reaching everyone in O(log N) rounds with zero coordinators, while suspicion windows keep churny nodes from being declared dead wrongly.",
    sources: [
      {
        label: "Gossip (epidemic) protocols — reference overview",
        url: "https://en.wikipedia.org/wiki/Gossip_protocol",
        note: "Dissemination math and the family tree of rumor-mongering designs.",
      },
      {
        label: "Apache Cassandra — gossip and failure detection docs",
        url: "https://cassandra.apache.org/doc/latest/cassandra/faq/gossip.html",
        note: "The SWIM-style production implementation with phi-accrual detection.",
      },
    ],
  },
  {
    moduleId: "rate-limiting",
    definition:
      "Rate limiting bounds how fast each caller may consume a dependency — token buckets decide burst behavior, distributed counters decide the honest global number, and admission control sheds load gracefully with 429s when the pool is empty.",
    sources: [
      {
        label: "RateLimiterExplained — Guava's notes",
        url: "https://github.com/google/guava/wiki/RateLimiterExplained",
        note: "Token bucket semantics from the library that standardized them.",
      },
      {
        label: "What is rate limiting — Cloudflare",
        url: "https://www.cloudflare.com/learning/bots/what-is-rate-limiting/",
        note: "The edge-side view: fixed windows, sliding windows, and bot-scale abuse.",
      },
    ],
  },
  {
    moduleId: "vector-search",
    definition:
      "Vector search finds the neighbors of a query embedding in high-dimensional space using approximate nearest-neighbor indexes (HNSW graphs, IVF+PQ codes) — plus chunking, filtering, hybrid lexical fusion, and re-ranking, which together decide whether RAG answers are grounded or hallucinated.",
    sources: [
      {
        label: "HNSW — Malkov & Yashunin (arXiv 2016/2018)",
        url: "https://arxiv.org/abs/1603.09320",
        note: "The paper behind almost every production ANN index at low latency.",
      },
      {
        label: "FAISS wiki (Meta AI)",
        url: "https://github.com/facebookresearch/faiss/wiki",
        note: "Index families, memory math, and the recall/latency dials in practice.",
      },
    ],
  },
  {
    moduleId: "llm-systems",
    definition:
      "LLM serving splits into prefill (parallel, compute-bound, sets TTFT) and decode (token-by-token, memory-bound, sets the stream pace), with the KV cache as the memory everyone fights over — PagedAttention and continuous batching turning GPUs into real services.",
    sources: [
      {
        label: "Efficient Memory Management for LLM Serving with PagedAttention (arXiv 2023)",
        url: "https://arxiv.org/abs/2309.06180",
        note: "The vLLM paper: KV paging and continuous batching as published.",
      },
      {
        label: "vLLM documentation",
        url: "https://docs.vllm.ai/en/latest/",
        note: "The serving stack's knobs and behaviors in operational form.",
      },
    ],
  },
  {
    moduleId: "microservices-monolith",
    definition:
      "The unit of decomposition is teams and failure domains, not code files: a modular monolith with enforced internal walls wins until deploy contention or scaling asymmetry forces a split — then you extract one bounded context at a time behind a strangler facade.",
    sources: [
      {
        label: "Microservices — Martin Fowler & James Lewis",
        url: "https://martinfowler.com/articles/microservices.html",
        note: "The canonical definition of the pattern and its decentralized trade-offs.",
      },
      {
        label: "StranglerFigApplication — Martin Fowler (2004)",
        url: "https://martinfowler.com/bliki/StranglerFigApplication.html",
        note: "The incremental re-routing pattern for every migration you will ever run.",
      },
    ],
  },
  {
    moduleId: "observability-tracing",
    definition:
      "Observability answers three different questions with three signals — metrics say how much, logs say what happened, traces say where the time went — and SRE practice wires them to SLOs so alerting fires on burned error budgets, not on harmless noise.",
    sources: [
      {
        label: "OpenTelemetry documentation",
        url: "https://opentelemetry.io/docs/",
        note: "Traces, spans, context propagation, and the collector in standard form.",
      },
      {
        label: "Google SRE Workbook — Alerting on SLOs",
        url: "https://sre.google/workbook/alerting-on-slos/",
        note: "Burn-rate alerting math — the multiwindow recipe most teams copy.",
      },
    ],
  },
];

export const CONCEPT_DEFINITION_MAP: Record<string, ConceptDefinition> = Object.fromEntries(
  CONCEPT_DEFINITIONS.map((d) => [d.moduleId, d]),
);
